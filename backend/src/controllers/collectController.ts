import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';
import type { CollectRequestBody } from '../types/dataModels';

export const collectController = {
  async handleCollect(req: Request, res: Response, next: NextFunction) {
    try {
      const body: CollectRequestBody = {
        ...req.body,
        website_id: req.website!.id,
        location: {
          ...(req.body.location || {}),
          ip_address: req.clientIp || null,
          country: req.geoLocation?.country || null,
          region: req.geoLocation?.region || null,
          city: req.geoLocation?.city || null,
          postal_code: req.geoLocation?.postal_code || null,
          latitude: req.geoLocation?.latitude ?? null,
          longitude: req.geoLocation?.longitude ?? null,
          timezone: req.geoLocation?.timezone || null,
        },
      };
      const event = await eventService.processEvent(body, req.clientIp, req.geoLocation);
      res.status(201).json({ success: true, event_id: event.event_id });
    } catch (err) {
      next(err);
    }
  },
};
