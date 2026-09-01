import { v4 as uuidv4 } from 'uuid';
import { insertEvent, normalizeCollectBody } from '../database/models/Event';
import { getQueue } from '../queues/eventQueue';
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

function normalizeV3Event(data: CollectRequestBody) {
  // Detect v3 format: has event.type instead of event_name
  if (data.identifiers || (data as any).event?.type) {
    const v3 = data as any;
    const evt = v3.event || {};
    const idents = v3.identifiers || {};

    return {
      event_name: evt.type || 'Unknown',
      event_id: idents.event_id || uuidv4(),
      session_id: idents.session_id || v3.session_id || uuidv4(),
      visitor_id: idents.visitor_id || v3.visitor_id || uuidv4(),
      timestamp: idents.time || new Date().toISOString(),
      properties: evt.properties || {},
      page_info: v3.page || null,
      device_info: v3.device || null,
      network_info: v3.network || null,
      performance_info: v3.performance || null,
      location_info: v3.geo || null,
      payload: {
        ...evt.properties,
        attribution: v3.attribution || {},
        engagement: v3.engagement || {},
        consent: v3.consent || {},
        session: v3.session || {},
        custom: v3.custom || {},
      },
      utm: v3.attribution || {},
      referrer: v3.page?.referrer || '',
    };
  }

  // Legacy v1/v2 format
  const body = normalizeCollectBody(data);
  return {
    event_name: body.event_name,
    event_id: body.event_id || uuidv4(),
    session_id: body.session_id || uuidv4(),
    visitor_id: body.visitor_id || uuidv4(),
    timestamp: body.timestamp || new Date().toISOString(),
    properties: {
      ...body.properties,
      ...(data.utm ? { utm: data.utm } : {}),
      ...(data.ad ? { ad: data.ad } : {}),
      ...(data.referrer ? { referrer: data.referrer } : {}),
      ...(data.attribution ? { attribution: data.attribution } : {}),
      ...(data.engagement ? { engagement: data.engagement } : {}),
      ...(data.consent ? { consent: data.consent } : {}),
      ...(data.session ? { session: data.session } : {}),
      ...(data.custom ? { custom: data.custom } : {}),
    },
    page_info: body.page_info,
    device_info: body.device_info,
    network_info: body.network_info,
    performance_info: body.performance_info,
    location_info: body.location_info,
    payload: body.payload,
    utm: data.utm || null,
    referrer: data.referrer || '',
  };
}

export const eventService = {
  async processEvent(data: CollectRequestBody, clientIp?: string | null, geo?: { country?: string | null; region?: string | null; city?: string | null }) {
    const normalized = normalizeV3Event(data);

    if (!data.website_id) {
      throw new AppError(400, 'Missing required field: website_id');
    }

    const event: ProcessedEvent = {
      id: uuidv4(),
      website_id: data.website_id,
      event_name: normalized.event_name,
      event_id: normalized.event_id,
      session_id: normalized.session_id,
      visitor_id: normalized.visitor_id,
      payload: normalized.payload,
      properties: normalized.properties,
      device_info: normalized.device_info,
      page_info: normalized.page_info,
      performance_info: normalized.performance_info,
      network_info: normalized.network_info,
      location_info: {
        ...normalized.location_info,
        ip_address: clientIp || (normalized.location_info as any)?.ip_address || null,
        country: geo?.country || (normalized.location_info as any)?.country || null,
        region: geo?.region || (normalized.location_info as any)?.region || null,
        city: geo?.city || (normalized.location_info as any)?.city || null,
      },
    };

    const inserted = await insertEvent(event);
    if (!inserted) {
      throw new AppError(409, 'Duplicate event');
    }

    try {
      await sessionService.trackEvent({
        event_name: normalized.event_name,
        website_id: data.website_id,
        session_id: normalized.session_id,
        visitor_id: normalized.visitor_id,
        properties: normalized.properties,
        page: normalized.page_info as any,
        device: normalized.device_info as any,
        location: event.location_info as any,
        utm: normalized.utm as any,
        referrer: normalized.referrer || undefined,
      }, clientIp, geo);
    } catch (err) {
      console.error('Session tracking error:', err);
    }

    const queue = await getQueue();
    if (queue) {
      await queue.add('process_event', event);
    }

    return event;
  },
};
