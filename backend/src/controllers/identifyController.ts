import { Request, Response, NextFunction } from 'express';
import { identifyService } from '../services/identifyService';
import type { IdentifyRequestBody } from '../types/dataModels';

export const identifyController = {
  async handleIdentify(req: Request, res: Response, next: NextFunction) {
    try {
      const body: IdentifyRequestBody = {
        ...req.body,
        client_ip: req.clientIp || undefined,
        location: {
          country: req.geoLocation?.country || undefined,
          region: req.geoLocation?.region || undefined,
          city: req.geoLocation?.city || undefined,
        },
      };
      const result = await identifyService.identifyVisitor(body);
      res.json({ success: true, visitor_id: result.visitor_id });
    } catch (err) {
      next(err);
    }
  },
};
