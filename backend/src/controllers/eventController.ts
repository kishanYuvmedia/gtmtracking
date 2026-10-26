import { Request, Response, NextFunction } from 'express';
import { getEventsByUser, getEventStats } from '../database/models/Event';
import { AppError } from '../middleware/errorHandler';
import { getEventOverview, type OverviewInterval } from '../services/overviewService';

function parseDate(value: unknown, field: string): Date | undefined {
  if (value === undefined || value === '') return undefined;
  const date = typeof value === 'string' ? new Date(value) : new Date(NaN);
  if (Number.isNaN(date.getTime())) throw new AppError(400, `"${field}" must be an ISO date`);
  return date;
}

export const eventController = {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;
      const websiteId = req.query.website_id as string || undefined;
      const events = await getEventsByUser(req.user!.userId, limit, offset, websiteId);
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },

  async stats(req: Request, res: Response, next: NextFunction) {
    try {
      const websiteId = req.query.website_id as string || undefined;
      const stats = await getEventStats(req.user!.userId, websiteId);
      res.json({ stats });
    } catch (err) {
      next(err);
    }
  },

  async overview(req: Request, res: Response, next: NextFunction) {
    try {
      const interval = req.query.interval === undefined ? 'day' : req.query.interval;
      if (interval !== 'day' && interval !== 'week' && interval !== 'month') {
        throw new AppError(400, '"interval" must be day, week or month');
      }
      const overview = await getEventOverview(req.user!.userId, {
        websiteId: typeof req.query.website_id === 'string' && req.query.website_id ? req.query.website_id : undefined,
        eventName: typeof req.query.event_name === 'string' && req.query.event_name ? req.query.event_name : undefined,
        from: parseDate(req.query.from, 'from'),
        to: parseDate(req.query.to, 'to'),
        interval: interval as OverviewInterval,
      });
      res.json(overview);
    } catch (err) {
      next(err);
    }
  },
};
