import { v4 as uuidv4 } from 'uuid';
import { insertEvent, normalizeCollectBody } from '../database/models/Event';
import { getQueue } from '../queues/eventQueue';
import { AppError } from '../middleware/errorHandler';
import { sessionService } from './sessionService';
import { processIngestedEvent } from './eventProcessor';
import type { CollectRequestBody } from '../types/dataModels';

function extractUrlParamsFromSearch(search: string): Record<string, string> | null {
  if (!search || search.length < 2) return null;
  const raw = search.startsWith('?') ? search.slice(1) : search;
  if (!raw) return null;
  const params = new URLSearchParams(raw);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    if (key) result[key] = value;
  });
  return Object.keys(result).length > 0 ? result : null;
}

export interface ProcessedEvent {
  id: string;
  workspace_id?: string | null;
  source_id?: string | null;
  website_id: string;
  event_name: string;
  event_type?: string;
  event_id: string;
  session_id: string;
  visitor_id: string;
  user_id?: string | null;
  timestamp?: Date;
  received_at?: Date;
  utm?: Record<string, unknown> | null;
  click_ids?: Record<string, string> | null;
  ip?: string | null;
  country?: string | null;
  device?: Record<string, unknown> | null;
  browser?: Record<string, unknown> | null;
  payload: Record<string, unknown> | null;
  properties: Record<string, unknown>;
  device_info: Record<string, unknown> | null;
  page_info: Record<string, unknown> | null;
  performance_info: Record<string, unknown> | null;
  network_info: Record<string, unknown> | null;
  location_info: Record<string, unknown> | null;
  url_params: Record<string, string> | null;
  context?: Record<string, unknown> | null;
}

function normalizeV3Event(data: CollectRequestBody) {
  // Detect v3 format: has event.type instead of event_name
  if ((data as any).event?.type || (data.identifiers && !data.event_name)) {
    const v3 = data as any;
    const evt = v3.event || {};
    const idents = v3.identifiers || {};

    const incomingUrlParams = v3.url_params;
    const hasUrlParams = incomingUrlParams && typeof incomingUrlParams === 'object' && Object.keys(incomingUrlParams).length > 0;

    return {
      event_name: evt.type || 'Unknown',
      event_id: idents.event_id || uuidv4(),
      session_id: idents.session_id || v3.session_id || uuidv4(),
      visitor_id: idents.anonymous_id || idents.visitor_id || v3.visitor_id || uuidv4(),
      user_id: idents.user_id || v3.user_id || null,
      email: idents.email || null,
      phone: idents.phone || null,
      timestamp: idents.time || new Date().toISOString(),
      properties: evt.properties || {},
      page_info: v3.page || null,
      device_info: v3.device || null,
      network_info: v3.network || null,
      performance_info: v3.performance || null,
      location_info: v3.geo || null,
      url_params: hasUrlParams
        ? incomingUrlParams
        : extractUrlParamsFromSearch(v3.page?.search) || extractUrlParamsFromSearch(v3.page?.url),
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
      // cookies (_fbp/_fbc), remembered click ids, first/last touch, visit counters, consent.
      context: v3.context && typeof v3.context === 'object' && !Array.isArray(v3.context) ? v3.context : null,
    };
  }

  // Legacy v1/v2 format
  const body = normalizeCollectBody(data);
  return {
    event_name: body.event_name,
    event_id: body.event_id || uuidv4(),
    session_id: body.session_id || uuidv4(),
    visitor_id: body.visitor_id || uuidv4(),
    user_id: data.user_id || null,
    email: data.email || null,
    phone: data.phone || null,
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
    url_params: (data.url_params && Object.keys(data.url_params).length > 0)
      ? data.url_params
      : extractUrlParamsFromSearch(body.page_info?.search) || extractUrlParamsFromSearch(body.page_info?.url),
    payload: body.payload,
    utm: data.utm || null,
    referrer: data.referrer || '',
    context: null,
  };
}

export const eventService = {
  async processEvent(
    data: CollectRequestBody,
    clientIp?: string | null,
    geo?: { country?: string | null; region?: string | null; city?: string | null },
    source?: { workspaceId: string; sourceId: string; sourceType: 'web' | 'server' }
  ) {
    const normalized = normalizeV3Event(data);

    if (!data.website_id) {
      throw new AppError(400, 'Missing required field: website_id');
    }

    const event: ProcessedEvent = {
      id: uuidv4(),
      workspace_id: source?.workspaceId || null,
      source_id: source?.sourceId || null,
      website_id: data.website_id,
      event_name: normalized.event_name,
      event_type: normalized.event_name.toLowerCase() === 'pageview' || normalized.event_name.toLowerCase() === 'page_view'
        ? 'page'
        : 'track',
      event_id: normalized.event_id,
      session_id: normalized.session_id,
      visitor_id: normalized.visitor_id,
      user_id: normalized.user_id,
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
      url_params: normalized.url_params || null,
      context: normalized.context,
      utm: normalized.utm || null,
      click_ids: null,
      ip: clientIp || null,
      country: geo?.country || null,
      device: normalized.device_info,
      timestamp: new Date(normalized.timestamp),
      received_at: new Date(),
    };

    const inserted = await insertEvent(event);
    if (!inserted) return null;

    const processJob = {
      eventId: event.event_id,
      identifiers: {
        anonymous_id: event.visitor_id,
        user_id: normalized.user_id || undefined,
        email: normalized.email || undefined,
        phone: normalized.phone || undefined,
      },
    };

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

    try {
      const queue = await getQueue();
      if (queue) {
        await queue.add('process_event', processJob, { jobId: event.id });
      } else {
        await processIngestedEvent(processJob);
      }
    } catch (error) {
      console.error(`Async processing unavailable for event ${event.event_id}; processing inline`, error);
      await processIngestedEvent(processJob);
    }

    return event;
  },
};
