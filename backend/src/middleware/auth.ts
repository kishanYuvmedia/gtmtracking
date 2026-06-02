import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getWebsiteByApiKey } from '../database/models/Website';
import { AppError } from './errorHandler';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

export interface AuthPayload {
  userId: string;
  websiteId?: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthPayload;
      website?: { id: string; apiKey: string };
      clientIp?: string | null;
      geoLocation?: import('../services/geoService').GeoLocation;
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    throw new AppError(401, 'Missing or invalid authorization header');
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.user = payload;
    next();
  } catch {
    throw new AppError(401, 'Invalid or expired token');
  }
}

export async function validateApiKey(req: Request, _res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;
  if (!apiKey) {
    throw new AppError(401, 'Missing API key');
  }
  const website = await getWebsiteByApiKey(apiKey);
  if (!website) {
    throw new AppError(401, 'Invalid API key');
  }
  req.website = { id: website.id, apiKey: website.api_key };
  next();
}
