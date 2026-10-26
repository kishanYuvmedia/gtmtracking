import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

declare global {
  namespace Express {
    interface Request {
      rawBody?: string;
    }
  }
}

const MAX_EVENT_BYTES = 32 * 1024;

export function validateCollect(req: Request, _res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  const { event_name } = req.body;
  const eventType = (req.body as any).event?.type;
  if (!event_name && !eventType) {
    throw new AppError(400, 'Missing required field: event_name or event.type');
  }
  if (typeof (event_name || eventType) !== 'string' || !(event_name || eventType).trim()
    || (event_name || eventType).length > 200) {
    throw new AppError(400, 'Event name must be a string of 200 characters or fewer');
  }
  if (req.body.properties !== undefined
    && (req.body.properties === null || typeof req.body.properties !== 'object' || Array.isArray(req.body.properties))) {
    throw new AppError(400, 'properties must be a JSON object');
  }
  if (req.body.event?.properties !== undefined
    && (req.body.event.properties === null || typeof req.body.event.properties !== 'object'
      || Array.isArray(req.body.event.properties))) {
    throw new AppError(400, 'event.properties must be a JSON object');
  }
  if (req.body.timestamp !== undefined
    && (typeof req.body.timestamp !== 'string' || Number.isNaN(Date.parse(req.body.timestamp)))) {
    throw new AppError(400, 'timestamp must be a valid date string');
  }
  if (req.body.identifiers?.time !== undefined
    && (typeof req.body.identifiers.time !== 'string' || Number.isNaN(Date.parse(req.body.identifiers.time)))) {
    throw new AppError(400, 'identifiers.time must be a valid date string');
  }
  if (req.rawBody && Buffer.byteLength(req.rawBody) > MAX_EVENT_BYTES) {
    throw new AppError(413, 'Ingestion event exceeds 32 KB');
  }
  next();
}

export function validateIdentify(req: Request, _res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  const { visitor_id, user_id, email, phone, name, custom } = req.body;
  if (typeof visitor_id !== 'string' || !visitor_id.trim() || visitor_id.length > 256) {
    throw new AppError(400, 'Missing required field: visitor_id');
  }
  for (const [field, value] of Object.entries({ user_id, email, phone, name })) {
    if (value !== undefined && (typeof value !== 'string' || value.length > 320)) {
      throw new AppError(400, `${field} must be a string of 320 characters or fewer`);
    }
  }
  if (custom !== undefined && (custom === null || typeof custom !== 'object' || Array.isArray(custom))) {
    throw new AppError(400, 'custom must be a JSON object');
  }
  if (req.rawBody && Buffer.byteLength(req.rawBody) > MAX_EVENT_BYTES) {
    throw new AppError(413, 'Identify payload exceeds 32 KB');
  }
  next();
}

export function validateBatch(req: Request, _res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    throw new AppError(400, 'events must be a non-empty array');
  }
  if (events.length > 100) {
    throw new AppError(400, 'Batch size cannot exceed 100 events');
  }
  for (let index = 0; index < events.length; index++) {
    const event = events[index];
    const name = event && typeof event === 'object'
      ? event.event_name || (event.event as Record<string, unknown> | undefined)?.type
      : null;
    if (typeof name !== 'string' || !name.trim() || name.length > 200) {
      throw new AppError(400, `events[${index}] must include a valid event_name or event.type`);
    }
    const eventTimestamp = event.timestamp
      || (event.identifiers as Record<string, unknown> | undefined)?.time;
    if (eventTimestamp !== undefined
      && (typeof eventTimestamp !== 'string' || Number.isNaN(Date.parse(eventTimestamp)))) {
      throw new AppError(400, `events[${index}] timestamp must be a valid date string`);
    }
    if (event.properties !== undefined
      && (event.properties === null || typeof event.properties !== 'object' || Array.isArray(event.properties))) {
      throw new AppError(400, `events[${index}].properties must be a JSON object`);
    }
    if (Buffer.byteLength(JSON.stringify(event)) > MAX_EVENT_BYTES) {
      throw new AppError(413, `events[${index}] exceeds 32 KB`);
    }
  }
  next();
}

export function forcePageEvent(req: Request, _res: Response, next: NextFunction) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    throw new AppError(400, 'Request body must be a JSON object');
  }
  if (req.body.event && typeof req.body.event === 'object') {
    req.body.event = { ...req.body.event, type: 'PageView' };
  } else {
    req.body.event_name = 'PageView';
  }
  next();
}
