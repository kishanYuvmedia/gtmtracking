import { v4 as uuidv4 } from 'uuid';
import { insertEvent, normalizeCollectBody } from '../database/models/Event';
import { eventQueue } from '../queues/eventQueue';
import { AppError } from '../middleware/errorHandler';
import { sessionService } from './sessionService';
import type { CollectRequestBody } from '../types/dataModels';

export interface ProcessedEvent {
  id: string;
  website_id: string;
  event_name: string;
  event_id: string;
  session_id: string;
  visitor_id: string;
  payload: Record<string, unknown> | null;
  properties: Record<string, unknown>;
  device_info: Record<string, unknown> | null;
  page_info: Record<string, unknown> | null;
  performance_info: Record<string, unknown> | null;
  network_info: Record<string, unknown> | null;
  location_info: Record<string, unknown> | null;
}

export const eventService = {
  async processEvent(data: CollectRequestBody, clientIp?: string | null, geo?: { country?: string | null; region?: string | null; city?: string | null }) {
    const body = normalizeCollectBody(data);

    const event: ProcessedEvent = {
      id: uuidv4(),
      website_id: data.website_id || '',
      event_name: data.event_name,
      event_id: data.event_id || uuidv4(),
      session_id: data.session_id || uuidv4(),
      visitor_id: data.visitor_id || uuidv4(),
      payload: body.payload,
      properties: body.properties,
      device_info: body.device_info,
      page_info: body.page_info,
      performance_info: body.performance_info,
      network_info: body.network_info,
      location_info: body.location_info,
    };

    const inserted = await insertEvent(event);
    if (!inserted) {
      throw new AppError(409, 'Duplicate event');
    }

    // Track session (don't fail on session errors)
    try {
      await sessionService.trackEvent(data, clientIp, geo);
    } catch (err) {
      console.error('Session tracking error:', err);
    }

    await eventQueue.add('process_event', event);

    return event;
  },
};
