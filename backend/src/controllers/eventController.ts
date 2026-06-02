import { Request, Response, NextFunction } from 'express';
import { getEventsByUser, getEventStats } from '../database/models/Event';

export const eventController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const events = await getEventsByUser(req.user!.userId, limit, offset);
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const stats = await getEventStats(req.user!.userId);
      res.json({ stats });
    } catch (err) {
      next(err);
    }
  },
};
