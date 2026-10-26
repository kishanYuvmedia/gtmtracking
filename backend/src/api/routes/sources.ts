import { Router, Request, Response, NextFunction } from 'express';
import { createServerSource } from '../../database/models/Source';
import { ensureWorkspaceForUser } from '../../database/models/Workspace';
import { authenticate } from '../../middleware/auth';
import { AppError } from '../../middleware/errorHandler';

export const sourceRoutes = Router();

sourceRoutes.post('/server', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 120) {
      throw new AppError(400, 'Source name must be between 1 and 120 characters');
    }
    const workspace = await ensureWorkspaceForUser(req.user!.userId);
    const result = await createServerSource(workspace._id, name);
    res.status(201).json({
      source: result.source,
      secret_key: result.secret_key,
      message: 'Store this secret now; it cannot be retrieved later.',
    });
  } catch (error) {
    next(error);
  }
});
