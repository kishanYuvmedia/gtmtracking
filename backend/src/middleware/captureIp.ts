import { Request, Response, NextFunction } from 'express';
import { extractClientIp, anonymizeIp } from '../utils/ip';
import { lookupGeo } from '../services/geoService';

export function captureIp(req: Request, _res: Response, next: NextFunction) {
  const raw = extractClientIp(req);
  req.clientIp = raw ? anonymizeIp(raw) : null;
  if (req.clientIp) {
    req.geoLocation = lookupGeo(req.clientIp);
  }
  next();
}
