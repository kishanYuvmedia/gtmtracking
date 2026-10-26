import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Website } from './Website';

export interface EventRow {
  id: string;
  workspace_id?: string | null;
  source_id?: string | null;
  profile_id?: string | null;
  anonymous_id?: string | null;
  user_id?: string | null;
  processed_at?: Date | null;
  website_id: string;
  event_name: string;
  event_type?: string;
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
  url_params: Record<string, string> | null;
  utm?: Record<string, unknown> | null;
  click_ids?: Record<string, string> | null;
  ip?: string | null;
  country?: string | null;
  device?: Record<string, unknown> | null;
  browser?: Record<string, unknown> | null;
  // SDK/server context: cookies (_fbp/_fbc), consent, library, screen, locale.
  context?: Record<string, unknown> | null;
  timestamp?: Date;
  received_at?: Date;
  created_at: Date;
}

export interface EventDocument extends Omit<EventRow, 'id'> {
  _id: string;
}

const EventSchema = new Schema<EventDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    workspace_id: { type: String, default: null },
    source_id: { type: String, default: null },
    profile_id: { type: String, default: null },
    anonymous_id: { type: String, default: null },
    user_id: { type: String, default: null },
    processed_at: { type: Date, default: null },
    website_id: { type: String, required: true, index: true },
    event_name: { type: String, required: true, index: true },
    event_type: { type: String, default: 'track' },
    event_id: { type: String, required: true, unique: true },
    session_id: { type: String, required: true, index: true },
    visitor_id: { type: String, required: true, index: true },
    payload: { type: Schema.Types.Mixed, default: null },
    properties: { type: Schema.Types.Mixed, default: {} },
    device_info: { type: Schema.Types.Mixed, default: null },
    page_info: { type: Schema.Types.Mixed, default: null },
    performance_info: { type: Schema.Types.Mixed, default: null },
    network_info: { type: Schema.Types.Mixed, default: null },
    location_info: { type: Schema.Types.Mixed, default: null },
    url_params: { type: Schema.Types.Mixed, default: null },
    utm: { type: Schema.Types.Mixed, default: null },
    click_ids: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    country: { type: String, default: null },
    device: { type: Schema.Types.Mixed, default: null },
    browser: { type: Schema.Types.Mixed, default: null },
    context: { type: Schema.Types.Mixed, default: null },
    timestamp: { type: Date, default: () => new Date() },
    received_at: { type: Date, default: () => new Date() },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

EventSchema.index({ workspace_id: 1, timestamp: -1 });
EventSchema.index({ workspace_id: 1, event_name: 1, timestamp: -1 });
EventSchema.index({ workspace_id: 1, profile_id: 1, timestamp: -1 });
EventSchema.index({ workspace_id: 1, profile_id: 1, session_id: 1 });
EventSchema.index({ workspace_id: 1, anonymous_id: 1 });
EventSchema.index({ workspace_id: 1, source_id: 1, timestamp: -1 });
// Mongo's equivalent of a GIN index on properties: serves filters on arbitrary property keys.
EventSchema.index({ 'properties.$**': 1 });

export const Event = mongoose.models.Event || mongoose.model<EventDocument>('Event', EventSchema);

function mapEvent(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id as string };
}

export async function insertEvent(event: Omit<EventRow, 'created_at' | 'id'> & { id?: string }) {
  try {
    const doc = await Event.create({
      _id: event.id || uuidv4(),
      workspace_id: event.workspace_id || null,
      source_id: event.source_id || null,
      profile_id: event.profile_id || null,
      anonymous_id: event.anonymous_id || event.visitor_id,
      user_id: event.user_id || null,
      website_id: event.website_id,
      event_name: event.event_name,
      event_type: event.event_type || 'track',
      event_id: event.event_id,
      session_id: event.session_id,
      visitor_id: event.visitor_id,
      payload: event.payload || null,
      properties: event.properties || {},
      device_info: event.device_info || null,
      page_info: event.page_info || null,
      performance_info: event.performance_info || null,
      network_info: event.network_info || null,
      location_info: event.location_info || null,
      url_params: event.url_params || null,
      utm: event.utm || null,
      click_ids: event.click_ids || null,
      ip: event.ip || null,
      country: event.country || null,
      device: event.device || event.device_info || null,
      browser: event.browser || null,
      context: event.context || null,
      timestamp: event.timestamp || new Date(),
      received_at: event.received_at || new Date(),
    });
    return mapEvent(doc);
  } catch (err: any) {
    if (err?.code === 11000) {
      return null;
    }
    throw err;
  }
}

export async function getEventsByUser(userId: string, limit = 50, offset = 0, websiteId?: string) {
  const websites = await Website.find({ user_id: userId }).select('_id domain name');
  const websiteIds = websites.map(w => w._id as string);

  if (websiteId && !websiteIds.includes(websiteId)) return [];
  const filter: Record<string, unknown> = {
    website_id: websiteId ? websiteId : { $in: websiteIds },
  };

  const events = await Event.find(filter as any).sort({ created_at: -1 }).skip(offset).limit(limit);
  const websiteMap = new Map(websites.map(w => [w._id as string, { domain: w.domain, name: w.name }]));

  return events.map(e => {
    const obj = e.toObject();
    const website = websiteMap.get(obj.website_id);
    return {
      ...obj,
      id: obj._id as string,
      website_domain: website?.domain || null,
      website_name: website?.name || null,
    };
  });
}

export async function getEventStats(userId: string, websiteId?: string) {
  const websites = await Website.find({ user_id: userId }).select('_id');
  const websiteIds = websites.map(w => w._id as string);

  if (websiteId && !websiteIds.includes(websiteId)) {
    return { total_events: 0, total_sessions: 0, total_visitors: 0, total_websites: 0 };
  }
  const filter: Record<string, unknown> = {
    website_id: websiteId ? websiteId : { $in: websiteIds },
  };

  const [total_events, sessions, visitors] = await Promise.all([
    Event.countDocuments(filter as any),
    Event.distinct('session_id', filter as any).then(a => a.length),
    Event.distinct('visitor_id', filter as any).then(a => a.length),
  ]);

  return {
    total_events,
    total_sessions: sessions,
    total_visitors: visitors,
    total_websites: websiteId ? 1 : websites.length,
  };
}

export function normalizeCollectBody(body: { properties?: Record<string, unknown> }) {
  const props = body.properties || {};
  return {
    event_name: (body as any).event_name,
    event_id: (body as any).event_id,
    session_id: (body as any).session_id,
    visitor_id: (body as any).visitor_id,
    timestamp: (body as any).timestamp,
    properties: props,
    device_info: (body as any).device || null,
    page_info: (body as any).page || null,
    network_info: (body as any).network || null,
    performance_info: (body as any).performance || null,
    location_info: (body as any).location || null,
    payload: props,
  };
}
