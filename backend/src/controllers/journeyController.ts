import { Request, Response, NextFunction } from 'express';
import { getJourneyByVisitor, searchVisitorsByWebsite } from '../database/models/Journey';
import { AppError } from '../middleware/errorHandler';

export const journeyController = {
  async getJourney(req: Request, res: Response, next: NextFunction) {
    try {
      const { visitorId } = req.params;
      if (!visitorId) {
        throw new AppError(400, 'visitorId is required');
      }

      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const journey = await getJourneyByVisitor(visitorId, req.user!.userId, limit, offset);
      if (!journey) {
        res.json({
          visitor_id: visitorId,
          total_sessions: 0,
          total_events: 0,
          first_event_at: null,
          last_event_at: null,
          sessions: [],
        });
        return;
      }

      res.json({ journey });
    } catch (err) {
      next(err);
    }
  },

  async searchVisitors(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.q as string | undefined;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const offset = parseInt(req.query.offset as string) || 0;

      const visitors = await searchVisitorsByWebsite(req.user!.userId, search, limit, offset);
      res.json({ visitors });
    } catch (err) {
      next(err);
    }
  },
};
