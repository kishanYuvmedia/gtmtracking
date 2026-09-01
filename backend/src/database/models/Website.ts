import mongoose, { Schema } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Event } from './Event';

export interface WebsiteRow {
  id: string;
  user_id: string;
  domain: string;
  api_key: string;
  name: string | null;
  description: string | null;
  status: string;
  timezone: string;
  last_event_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface WebsiteDocument extends Omit<WebsiteRow, 'id'> {
  _id: string;
}

const WebsiteSchema = new Schema<WebsiteDocument>(
  {
    _id: { type: String, default: () => uuidv4() },
    user_id: { type: String, required: true, index: true },
    domain: { type: String, required: true, trim: true },
    name: { type: String, default: null },
    api_key: { type: String, required: true, unique: true },
    description: { type: String, default: null },
    status: { type: String, default: 'active' },
    timezone: { type: String, default: 'UTC' },
    last_event_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }, versionKey: false }
);

export const Website = mongoose.models.Website || mongoose.model<WebsiteDocument>('Website', WebsiteSchema);

function mapWebsite(doc: any) {
  const obj = doc.toObject ? doc.toObject() : doc;
  return { ...obj, id: obj._id as string };
}

export async function getWebsiteByApiKey(apiKey: string) {
  const website = await Website.findOne({ api_key: apiKey });
  return website ? mapWebsite(website) : null;
}

export async function getWebsitesByUserId(userId: string) {
  const websites = await Website.find({ user_id: userId }).sort({ created_at: -1 });
  const websiteIds = websites.map(w => w._id);

  const [eventCounts, events24h, visitorCounts] = await Promise.all([
    Event.aggregate([
      { $match: { website_id: { $in: websiteIds } } },
      { $group: { _id: '$website_id', count: { $sum: 1 } } },
    ]),
    Event.aggregate([
      {
        $match: {
          website_id: { $in: websiteIds },
          created_at: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      },
      { $group: { _id: '$website_id', count: { $sum: 1 } } },
    ]),
    Event.aggregate([
      { $match: { website_id: { $in: websiteIds } } },
      { $group: { _id: '$website_id', visitors: { $addToSet: '$visitor_id' } } },
    ]),
  ]);

  const countMap = new Map(eventCounts.map(r => [r._id, r.count]));
  const count24hMap = new Map(events24h.map(r => [r._id, r.count]));
  const visitorMap = new Map(visitorCounts.map(r => [r._id, r.visitors.length]));

  return websites.map(w => {
    const obj = mapWebsite(w);
    return {
      ...obj,
      event_count: countMap.get(w._id) || 0,
      events_24h: count24hMap.get(w._id) || 0,
      visitor_count: visitorMap.get(w._id) || 0,
    };
  });
}

export async function getWebsiteByIdWithStats(id: string, userId: string) {
  const website = await Website.findOne({ _id: id, user_id: userId });
  if (!website) return null;

  const websiteId = website._id as string;
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [eventCount, events24h, visitorCount, sessionCount] = await Promise.all([
    Event.countDocuments({ website_id: websiteId }),
    Event.countDocuments({ website_id: websiteId, created_at: { $gte: since24h } }),
    Event.distinct('visitor_id', { website_id: websiteId }).then(arr => arr.length),
    Event.distinct('session_id', { website_id: websiteId }).then(arr => arr.length),
  ]);

  return { ...mapWebsite(website), event_count: eventCount, events_24h: events24h, visitor_count: visitorCount, session_count: sessionCount };
}

export async function getWebsiteEvents(websiteId: string, userId: string, limit = 50, offset = 0) {
  const website = await Website.findOne({ _id: websiteId, user_id: userId });
  if (!website) return [];
  const events = await Event.find({ website_id: websiteId })
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit);
  return events.map(e => {
    const obj = e.toObject();
    return { ...obj, id: obj._id as string };
  });
}

export async function getWebsiteAdSummary(websiteId: string, userId: string) {
  const website = await Website.findOne({ _id: websiteId, user_id: userId });
  if (!website) return null;

  const attributionFields = ['utm_source', 'gclid', 'fbclid', 'msclkid', 'ttclid'];

  const [total_events, page_views, unique_visitors, sessions, ...fieldHits] = await Promise.all([
    Event.countDocuments({ website_id: websiteId }),
    Event.countDocuments({ website_id: websiteId, event_name: 'PageView' }),
    Event.distinct('visitor_id', { website_id: websiteId }).then(a => a.length),
    Event.distinct('session_id', { website_id: websiteId }).then(a => a.length),
    ...attributionFields.map(field =>
      Event.countDocuments({ website_id: websiteId, [`payload.attribution.${field}`]: { $ne: null } })
    ),
  ]);

  return {
    total_events,
    page_views,
    unique_visitors,
    sessions,
    utm_tracked: fieldHits[0],
    gclid_hits: fieldHits[1],
    fbclid_hits: fieldHits[2],
    msclkid_hits: fieldHits[3],
    ttclid_hits: fieldHits[4],
  };
}

export async function getWebsiteEventNames(websiteId: string, userId: string) {
  const website = await Website.findOne({ _id: websiteId, user_id: userId });
  if (!website) return [];

  const result = await Event.aggregate([
    { $match: { website_id: websiteId } },
    { $group: { _id: '$event_name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  return result.map(r => ({ event_name: r._id, count: r.count }));
}

export async function createWebsite(website: {
  id?: string;
  user_id: string;
  domain: string;
  name?: string | null;
  api_key: string;
  status?: string;
  timezone?: string;
  description?: string | null;
  last_event_at?: Date | null;
}) {
  const doc = await Website.create({
    _id: website.id || uuidv4(),
    user_id: website.user_id,
    domain: website.domain,
    name: website.name || website.domain,
    api_key: website.api_key,
    status: website.status || 'active',
    timezone: website.timezone || 'UTC',
    description: website.description || null,
    last_event_at: website.last_event_at || null,
  });
  return mapWebsite(doc);
}

export async function getWebsiteEventReport(websiteId: string, userId: string, filters: {
  dateFrom?: string;
  dateTo?: string;
  period?: string;
  eventName?: string;
  visitorId?: string;
  limit?: number;
  offset?: number;
}) {
  const website = await Website.findOne({ _id: websiteId, user_id: userId });
  if (!website) return null;

  const match: Record<string, unknown> = { website_id: websiteId };

  // Date filtering
  const now = new Date();
  if (filters.period) {
    switch (filters.period) {
      case 'today':
        match.created_at = { $gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) };
        break;
      case 'yesterday':
        const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        match.created_at = { $gte: yesterday, $lt: todayStart };
        break;
      case '7d':
        match.created_at = { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
        break;
      case '30d':
        match.created_at = { $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
        break;
      case 'this_week':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);
        match.created_at = { $gte: weekStart };
        break;
      case 'this_month':
        match.created_at = { $gte: new Date(now.getFullYear(), now.getMonth(), 1) };
        break;
    }
  } else if (filters.dateFrom || filters.dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (filters.dateFrom) dateFilter.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      dateFilter.$lte = to;
    }
    match.created_at = dateFilter;
  }

  // Event name filter
  if (filters.eventName) {
    match.event_name = filters.eventName;
  }

  // Visitor filter
  if (filters.visitorId) {
    match.visitor_id = filters.visitorId;
  }

  const limit = Math.min(filters.limit || 50, 200);
  const offset = filters.offset || 0;

  // Aggregate event counts by type
  const eventTypeAgg = Event.aggregate([
    { $match: match },
    { $group: { _id: '$event_name', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  // Aggregate events by day
  const eventsByDayAgg = Event.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$created_at' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Get unique visitors
  const uniqueVisitorsAgg = Event.distinct('visitor_id', match);

  // Get unique sessions
  const uniqueSessionsAgg = Event.distinct('session_id', match);

  // Get total events
  const totalEventsAgg = Event.countDocuments(match);

  // Get events list with pagination
  const eventsAgg = Event.find(match)
    .sort({ created_at: -1 })
    .skip(offset)
    .limit(limit);

  // Browser/OS aggregation from device_info
  const browserAgg = Event.aggregate([
    { $match: match },
    { $group: { _id: '$device_info.browser', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const osAgg = Event.aggregate([
    { $match: match },
    { $group: { _id: '$device_info.os', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 10 },
  ]);

  const deviceTypeAgg = Event.aggregate([
    { $match: match },
    { $group: { _id: '$device_info.deviceType', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);

  const [eventTypes, eventsByDay, uniqueVisitors, uniqueSessions, totalEvents, events, browsers, osList, deviceTypes] = await Promise.all([
    eventTypeAgg,
    eventsByDayAgg,
    uniqueVisitorsAgg,
    uniqueSessionsAgg,
    totalEventsAgg,
    eventsAgg,
    browserAgg,
    osAgg,
    deviceTypeAgg,
  ]);

  return {
    summary: {
      total_events: totalEvents,
      total_visitors: uniqueVisitors.length,
      total_sessions: uniqueSessions.length,
      event_types: eventTypes.map((e: any) => ({ name: e._id, count: e.count })),
    },
    timeline: eventsByDay.map((e: any) => ({ date: e._id, count: e.count })),
    visitors: {
      browsers: browsers.map((b: any) => ({ name: b._id || 'Unknown', count: b.count })),
      os: osList.map((o: any) => ({ name: o._id || 'Unknown', count: o.count })),
      device_types: deviceTypes.map((d: any) => ({ name: d._id || 'Unknown', count: d.count })),
    },
    events: events.map((e: any) => {
      const obj = e.toObject();
      return { ...obj, id: obj._id as string };
    }),
  };
}
