import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { Source, ensureWebsiteSource } from '../database/models/Source';
import { Website } from '../database/models/Website';
import { setUserWorkspaceId } from '../database/models/User';
import { ensureWorkspaceForUser } from '../database/models/Workspace';
import { AppError } from './errorHandler';
import { normalizeHost } from '../utils/domain';

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
      website?: {
        id: string;
        apiKey: string;
        userId: string;
        workspaceId: string;
        sourceId: string;
        sourceType: 'web' | 'server';
      };
      clientIp?: string | null;
      geoLocation?: import('../services/geoService').GeoLocation;
    }
  }
}

const DEV_ORIGIN_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

function isAllowedOrigin(origin: string, allowedDomains: string[]): boolean {
  let originHost: string;
  try {
    originHost = new URL(origin).hostname.toLowerCase();
  } catch {
    // file:// pages send "Origin: null"; only accept them while developing locally.
    return origin === 'null' && process.env.NODE_ENV !== 'production';
  }
  if (DEV_ORIGIN_HOSTS.has(originHost) && process.env.NODE_ENV !== 'production') return true;
  const host = originHost.replace(/^www\./, '');
  return allowedDomains.some(domain => {
    const allowed = normalizeHost(domain);
    return allowed && (host === allowed || host.endsWith(`.${allowed}`));
  });
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
  try {
    const authorization = req.headers.authorization;
    let source: Awaited<ReturnType<typeof Source.findOne>> = null;
    let isServerAuth = false;
    let apiKey = typeof req.headers['x-api-key'] === 'string' ? req.headers['x-api-key'] : '';

    if (authorization?.startsWith('Basic ')) {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf8');
      const separator = decoded.indexOf(':');
      if (separator < 1) throw new AppError(401, 'Invalid server credentials');
      apiKey = decoded.slice(0, separator);
      const secret = decoded.slice(separator + 1);
      source = await Source.findOne({ write_key: apiKey }).select('+secret_key_hash');
      if (!source || source.type !== 'server' || !source.secret_key_hash) {
        throw new AppError(401, 'Invalid server credentials');
      }
      const providedHash = crypto.createHash('sha256').update(secret).digest();
      const storedHash = Buffer.from(source.secret_key_hash, 'hex');
      if (providedHash.length !== storedHash.length || !crypto.timingSafeEqual(providedHash, storedHash)) {
        throw new AppError(401, 'Invalid server credentials');
      }
      isServerAuth = true;
    } else {
      if (!apiKey) throw new AppError(401, 'Missing API key');
      source = await Source.findOne({ write_key: apiKey });
    }

    let website = await Website.findOne({ api_key: apiKey });
    if (isServerAuth) {
      const batchWebsiteIds = Array.isArray(req.body?.events)
        ? req.body.events.map((event: unknown) =>
          event && typeof event === 'object' && 'website_id' in event
            ? (event as Record<string, unknown>).website_id
            : undefined
        ).filter(Boolean)
        : [];
      const requestedWebsiteId = req.body?.website_id || batchWebsiteIds[0];
      if (typeof requestedWebsiteId !== 'string' || !requestedWebsiteId) {
        throw new AppError(400, 'Server events require website_id');
      }
      if (batchWebsiteIds.some((websiteId: unknown) => websiteId !== requestedWebsiteId)) {
        throw new AppError(400, 'A server batch must target one website');
      }
      website = await Website.findOne({
        _id: requestedWebsiteId,
        workspace_id: source!.workspace_id,
      });
    }
    if (!website) throw new AppError(401, 'Invalid API key or website');
    if (website.status !== 'active') {
      throw new AppError(403, website.status === 'disconnected' ? 'Website is disconnected' : 'Website source is disabled');
    }
    if (source && !source.enabled) throw new AppError(403, 'Source is disabled');

    const workspace = await ensureWorkspaceForUser(website.user_id);
    if (website.workspace_id !== workspace.id) {
      await Website.updateOne({ _id: website._id }, { $set: { workspace_id: workspace.id } });
    }
    await setUserWorkspaceId(website.user_id, workspace.id);

    if (!source) {
      source = await ensureWebsiteSource(workspace.id, {
        id: website._id,
        name: website.name,
        domain: website.domain,
        api_key: website.api_key,
      });
    } else if (source.type !== (isServerAuth ? 'server' : 'web')) {
      throw new AppError(401, 'Source type does not match the authentication method');
    } else if (!isServerAuth
      && (source.website_id !== website._id || source.workspace_id !== workspace.id)) {
      source = await ensureWebsiteSource(workspace.id, {
        id: website._id,
        name: website.name,
        domain: website.domain,
        api_key: website.api_key,
      });
    }

    const origin = req.get('origin');
    if (origin && source.type === 'web' && !isAllowedOrigin(origin, [...source.allowed_domains, website.domain])) {
      throw new AppError(403, 'Origin is not allowed for this source');
    }

    req.website = {
      id: website._id,
      apiKey,
      userId: website.user_id,
      workspaceId: workspace.id,
      sourceId: source._id,
      sourceType: source.type,
    };
    next();
  } catch (err) {
    next(err);
  }
}
