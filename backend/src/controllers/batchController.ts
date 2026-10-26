import { Request, Response, NextFunction } from 'express';
import { eventService } from '../services/eventService';
import type { CollectRequestBody } from '../types/dataModels';
import { AppError } from '../middleware/errorHandler';

const locationEnrichment = (req: Request) => ({
  ip_address: req.clientIp || null,
  country: req.geoLocation?.country || null,
  region: req.geoLocation?.region || null,
  city: req.geoLocation?.city || null,
  postal_code: req.geoLocation?.postal_code || null,
  latitude: req.geoLocation?.latitude ?? null,
  longitude: req.geoLocation?.longitude ?? null,
  timezone: req.geoLocation?.timezone || null,
});

export const batchController = {
  async handleBatch(req: Request, res: Response, next: NextFunction) {
    try {
      const enrichment = locationEnrichment(req);
      const results = await Promise.allSettled(
        req.body.events.map((event: Record<string, unknown>) =>
          eventService.processEvent(
            {
              ...(event as unknown as CollectRequestBody),
              website_id: req.website!.id,
              location: {
                ...((event as Record<string, unknown>).location as Record<string, unknown> || {}),
                ...enrichment,
              },
            },
            req.clientIp,
            req.geoLocation,
            {
              workspaceId: req.website!.workspaceId,
              sourceId: req.website!.sourceId,
              sourceType: req.website!.sourceType,
            }
          )
        )
      );
      const outcomes = results.map((result: PromiseSettledResult<unknown>, index: number) => {
        if (result.status === 'fulfilled') {
          return { index, success: true };
        }
        return {
          index,
          success: false,
          error: result.reason instanceof AppError ? result.reason.message : 'Event processing failed',
        };
      });
      const succeeded = outcomes.filter(outcome => outcome.success).length;
      const failed = outcomes.length - succeeded;
      res.status(207).json({ success: failed === 0, succeeded, failed, results: outcomes });
    } catch (err) {
      next(err);
    }
  },
};
