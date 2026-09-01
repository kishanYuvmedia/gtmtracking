import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Website } from './Website';

export interface EventRow {
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
  created_at: Date;
}

export interface EventDocument extends Omit<EventRow, 'id'> {
  _id: string;
}

const EventSchema = new Schema<EventDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    website_id: { type: String, required: true, index: true },
    event_name: { type: String, required: true, index: true },
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
  },
  { timestamps: { createdAt: 'created_at', updatedAt: false }, versionKey: false }
);

export const Event = mongoose.models.Event || mongoose.model<EventDocument>('Event', EventSchema);

function mapEvent(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id as string };
}

export async function insertEvent(event: Omit<EventRow, 'created_at' | 'id'> & { id?: string }) {
  try {
    const doc = await Event.create({
      _id: event.id || uuidv4(),
      website_id: event.website_id,
      event_name: event.event_name,
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
  const websites = await Website.find({ user_id: userId }).select('_id domain');
  const websiteIds = websites.map(w => w._id as string);

  const filter: Record<string, unknown> = { website_id: { $in: websiteIds } };
  if (websiteId) filter.website_id = websiteId;

  const events = await Event.find(filter as any).sort({ created_at: -1 }).skip(offset).limit(limit);
  const domainMap = new Map(websites.map(w => [w._id as string, w.domain]));

  return events.map(e => {
    const obj = e.toObject();
    return { ...obj, id: obj._id as string, website_domain: domainMap.get(obj.website_id) || null };
  });
}

export async function getEventStats(userId: string, websiteId?: string) {
  const websites = await Website.find({ user_id: userId }).select('_id');
  const websiteIds = websites.map(w => w._id as string);

  const filter: Record<string, unknown> = { website_id: { $in: websiteIds } };
  if (websiteId) filter.website_id = websiteId;

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
