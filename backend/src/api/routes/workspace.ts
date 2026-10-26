import { Router, Request, Response, NextFunction } from 'express';
import { getUserById } from '../../database/models/User';
import { DEFAULT_IDENTITY_SETTINGS, Workspace, ensureWorkspaceForUser } from '../../database/models/Workspace';
import { WorkspaceMember } from '../../database/models/WorkspaceMember';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';
import { SUPPORTED_PHONE_COUNTRIES } from '../../services/identity/normalize';
import { getIdentitySettings, invalidateIdentitySettings } from '../../services/identity/settings';

export const workspaceRoutes = Router();
workspaceRoutes.use(authenticate);

const KEY_PATTERN = /^[A-Za-z0-9_\-]{1,64}$/;

async function currentWorkspace(req: Request) {
  const user = await getUserById(req.user!.userId) as { workspace_id?: string | null; name?: string } | null;
  const workspaceId = user?.workspace_id || (await ensureWorkspaceForUser(req.user!.userId, user?.name)).id;
  const member = await WorkspaceMember.findOne({ workspace_id: workspaceId, user_id: req.user!.userId }).select('role').lean<{ role: string }>();
  const workspace = await Workspace.findById(workspaceId).select('owner_user_id').lean<{ owner_user_id: string }>();
  const role = member?.role || (workspace?.owner_user_id === req.user!.userId ? 'admin' : null);
  if (!role) throw new AppError(403, 'You are not a member of this workspace');
  return { workspaceId, role };
}

function keyList(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 30) {
    throw new AppError(400, `${field} must list between 1 and 30 property names`);
  }
  const keys = [...new Set(value.map(item => (typeof item === 'string' ? item.trim() : '')))];
  const invalid = keys.find(key => !KEY_PATTERN.test(key));
  if (invalid !== undefined) throw new AppError(400, `${field}: "${invalid}" must be 1-64 letters, digits, _ or -`);
  return keys;
}

workspaceRoutes.get('/identity-settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, role } = await currentWorkspace(req);
    res.json({
      settings: await getIdentitySettings(workspaceId),
      defaults: DEFAULT_IDENTITY_SETTINGS,
      supported_countries: SUPPORTED_PHONE_COUNTRIES,
      can_edit: role === 'admin',
    });
  } catch (error) {
    next(error);
  }
});

workspaceRoutes.put('/identity-settings', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { workspaceId, role } = await currentWorkspace(req);
    if (role !== 'admin') throw new AppError(403, 'Only workspace admins can change identity fields');
    const body = req.body || {};
    const country = typeof body.default_country === 'string' ? body.default_country.trim().toUpperCase() : '';
    if (!SUPPORTED_PHONE_COUNTRIES.includes(country)) {
      throw new AppError(400, `default_country must be one of ${SUPPORTED_PHONE_COUNTRIES.join(', ')}`);
    }
    const settings = {
      email_keys: keyList(body.email_keys, 'email_keys'),
      phone_keys: keyList(body.phone_keys, 'phone_keys'),
      user_id_keys: keyList(body.user_id_keys, 'user_id_keys'),
      default_country: country,
    };
    await Workspace.updateOne({ _id: workspaceId }, { $set: { identity_settings: settings } });
    invalidateIdentitySettings(workspaceId);
    res.json({ settings });
  } catch (error) {
    next(error);
  }
});
