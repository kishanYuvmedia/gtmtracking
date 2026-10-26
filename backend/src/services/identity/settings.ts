import { DEFAULT_IDENTITY_SETTINGS, Workspace, type IdentitySettings } from '../../database/models/Workspace';

const CACHE_TTL_MS = 60_000;
const cache = new Map<string, { settings: IdentitySettings; expires: number }>();

export async function getIdentitySettings(workspaceId: string): Promise<IdentitySettings> {
  const hit = cache.get(workspaceId);
  if (hit && hit.expires > Date.now()) return hit.settings;
  const workspace = await Workspace.findById(workspaceId).select('identity_settings')
    .lean<{ identity_settings?: Partial<IdentitySettings> }>();
  const stored = workspace?.identity_settings || {};
  const settings: IdentitySettings = {
    email_keys: stored.email_keys?.length ? stored.email_keys : DEFAULT_IDENTITY_SETTINGS.email_keys,
    phone_keys: stored.phone_keys?.length ? stored.phone_keys : DEFAULT_IDENTITY_SETTINGS.phone_keys,
    user_id_keys: stored.user_id_keys?.length ? stored.user_id_keys : DEFAULT_IDENTITY_SETTINGS.user_id_keys,
    default_country: stored.default_country || DEFAULT_IDENTITY_SETTINGS.default_country,
  };
  cache.set(workspaceId, { settings, expires: Date.now() + CACHE_TTL_MS });
  return settings;
}

export function invalidateIdentitySettings(workspaceId: string): void {
  cache.delete(workspaceId);
}
