import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { createWebsite, getWebsitesByUserId } from '../database/models/Website';
import { AppError } from '../middleware/errorHandler';

const COLLECTOR_URL = process.env.COLLECTOR_URL || 'http://localhost:4000';

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
        pixel_id: '',
        status: 'active',
        auto_track_pageview: true,
        auto_track_click: true,
        auto_track_scroll: true,
        auto_track_form: true,
        cookie_domain: null,
        gdpr_enabled: false,
        consent_mode: 'default',
        data_retention_days: 365,
        domain_verified: false,
        verification_token: null,
        verified_at: null,
        favicon: null,
        primary_color: null,
        timezone: 'UTC',
        script_version: 1,
        allowed_origins: [],
        last_event_at: null,
        meta_access_token: null,
        meta_ad_account_id: null,
        meta_test_event_code: null,
        description: null,
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

  async script(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const websites = await getWebsitesByUserId(req.user!.userId);
      const website = websites.find((w: { id: string }) => w.id === id);
      if (!website) throw new AppError(404, 'Website not found');

      const script = `<!-- GTM Tracking Pixel -->
<script>
(function(w,d,s,u,k,wid){
  w._gtmConfig = { apiKey: k, websiteId: wid, endpoint: '${COLLECTOR_URL}', debug: false };
  var js=d.createElement(s);
  js.async=true;
  js.src=u+'/tracker.js';
  d.head.appendChild(js);
})(window,document,'script','${COLLECTOR_URL}','${website.api_key}','${website.id}');
</script>`;

      res.json({ script, website });
    } catch (err) {
      next(err);
    }
  },
};
