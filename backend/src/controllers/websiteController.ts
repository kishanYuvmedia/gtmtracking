import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createWebsite, getWebsitesByUserId, getWebsiteByIdWithStats, getWebsiteEvents, getWebsiteAdSummary, getWebsiteEventNames, getWebsiteEventReport } from '../database/models/Website';
import { AppError } from '../middleware/errorHandler';

const COLLECTOR_URL = () => process.env.COLLECTOR_URL!;

export const websiteController = {
  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { domain } = req.body;
      if (!domain) throw new AppError(400, 'Domain is required');

      const website = await createWebsite({
        id: uuidv4(),
        user_id: req.user!.userId,
        domain,
        name: domain,
        api_key: crypto.randomBytes(32).toString('hex'),
        status: 'active',
        description: null,
        timezone: 'UTC',
        last_event_at: null,
      });

      res.status(201).json({ website });
    } catch (err) {
      next(err);
    }
  },

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const websites = await getWebsitesByUserId(req.user!.userId);
      res.json({ websites });
    } catch (err) {
      next(err);
    }
  },

  async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const website = await getWebsiteByIdWithStats(id, req.user!.userId);
      if (!website) throw new AppError(404, 'Website not found');

      const adSummary = await getWebsiteAdSummary(id, req.user!.userId);
      const eventNames = await getWebsiteEventNames(id, req.user!.userId);

      res.json({ website, adSummary, eventNames });
    } catch (err) {
      next(err);
    }
  },

  async listEvents(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 200);
      const offset = parseInt(req.query.offset as string) || 0;

      const website = await getWebsiteByIdWithStats(id, req.user!.userId);
      if (!website) throw new AppError(404, 'Website not found');

      const events = await getWebsiteEvents(id, req.user!.userId, limit, offset);
      res.json({ events });
    } catch (err) {
      next(err);
    }
  },

  async script(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const websites = await getWebsitesByUserId(req.user!.userId);
      const website = websites.find((w: { id: string }) => w.id === id);
      if (!website) throw new AppError(404, 'Website not found');

      const collectorUrl = COLLECTOR_URL();
      const script = `<!-- GTM Tracking Pixel v3 -->
<script>
(function(w,d,s,u,k,wid){
  w._gtmConfig = { apiKey: k, websiteId: wid, endpoint: '${collectorUrl}', debug: false };
  var js=d.createElement(s);
  js.async=true;
  js.src=u+'/tracker.v3.js';
  d.head.appendChild(js);
})(window,document,'script','${collectorUrl}','${website.api_key}','${website.id}');
</script>`;

      res.json({ script, website });
    } catch (err) {
      next(err);
    }
  },

  async eventReport(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const report = await getWebsiteEventReport(id, req.user!.userId, {
        dateFrom: req.query.date_from as string,
        dateTo: req.query.date_to as string,
        period: req.query.period as string,
        eventName: req.query.event_name as string,
        visitorId: req.query.visitor_id as string,
        limit: parseInt(req.query.limit as string) || 50,
        offset: parseInt(req.query.offset as string) || 0,
      });
      if (!report) throw new AppError(404, 'Website not found');
      res.json(report);
    } catch (err) {
      next(err);
    }
  },
};
