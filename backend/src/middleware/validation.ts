import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

export function validateCollect(req: Request, _res: Response, next: NextFunction) {
  const { event_name } = req.body;
  const eventType = (req.body as any).event?.type;
  if (!event_name && !eventType) {
    throw new AppError(400, 'Missing required field: event_name or event.type');
  }
  next();
}

export function validateIdentify(req: Request, _res: Response, next: NextFunction) {
  const { visitor_id } = req.body;
  if (!visitor_id) {
    throw new AppError(400, 'Missing required field: visitor_id');
  }
  next();
}

export function validateBatch(req: Request, _res: Response, next: NextFunction) {
  const { events } = req.body;
  if (!Array.isArray(events) || events.length === 0) {
    throw new AppError(400, 'events must be a non-empty array');
  }
  if (events.length > 100) {
    throw new AppError(400, 'Batch size cannot exceed 100 events');
  }
  next();
}
