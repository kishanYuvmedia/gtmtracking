import { Session } from './Session';
import { Event } from './Event';
import { Website } from './Website';

export interface JourneyEvent {
  id: string;
  website_id: string;
  website_domain: string;
  event_name: string;
  event_id: string;
  session_id: string;
  visitor_id: string;
  payload: Record<string, unknown> | null;
  properties: Record<string, unknown>;
  device_info: Record<string, unknown> | null;
  page_info: Record<string, unknown> | null;
  network_info: Record<string, unknown> | null;
  location_info: Record<string, unknown> | null;
  created_at: Date;
}

export interface JourneySession {
  session_id: string;
  landing_page: string | null;
  exit_page: string | null;
  page_views: number;
  duration_seconds: number;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  ip_address: string | null;
  device_info: Record<string, unknown> | null;
  location_info: Record<string, unknown> | null;
  started_at: Date;
  last_activity: Date;
  events: JourneyEvent[];
}

export interface JourneyResponse {
  visitor_id: string;
  total_sessions: number;
  total_events: number;
  first_event_at: Date | null;
  last_event_at: Date | null;
  sessions: JourneySession[];
}

export async function getJourneyByVisitor(
  visitorId: string,
  userId: string,
  limit = 50,
  offset = 0,
  websiteId?: string
): Promise<JourneyResponse | null> {
  const websites = await Website.find({ user_id: userId }).select('_id domain');
  const websiteIds = websites.map(w => w._id as string);
  const domainMap = new Map(websites.map(w => [w._id as string, w.domain as string]));

  const sessionFilter: Record<string, unknown> = {
    visitor_id: visitorId,
    website_id: { $in: websiteIds },
  };
  if (websiteId) sessionFilter.website_id = websiteId;

  const sessionRows = await Session.find(sessionFilter as any)
    .sort({ started_at: -1 })
    .skip(offset)
    .limit(limit);

  if (sessionRows.length === 0) {
    return null;
  }

  const sessionIds = sessionRows.map(s => s._id as string);

  const eventFilter: Record<string, unknown> = {
    session_id: { $in: sessionIds },
    website_id: { $in: websiteIds },
  };
  if (websiteId) eventFilter.website_id = websiteId;

  const eventRows = await Event.find(eventFilter as any).sort({ created_at: 1 });

  const eventsBySession = new Map<string, JourneyEvent[]>();
  for (const row of eventRows) {
    const obj = row.toObject();
    const journeyEvent: JourneyEvent = {
      ...obj,
      id: obj._id as string,
      website_domain: domainMap.get(obj.website_id) || null,
    };
    const sid = obj.session_id as string;
    if (!eventsBySession.has(sid)) {
      eventsBySession.set(sid, []);
    }
    eventsBySession.get(sid)!.push(journeyEvent);
  }

  const sessions: JourneySession[] = sessionRows.map(s => ({
    session_id: s._id as string,
    landing_page: s.landing_page,
    exit_page: s.exit_page,
    page_views: s.page_views,
    duration_seconds: s.duration_seconds,
    referrer: s.referrer,
    utm_source: s.utm_source,
    utm_medium: s.utm_medium,
    utm_campaign: s.utm_campaign,
    ip_address: s.ip_address,
    device_info: s.device_info,
    location_info: s.location_info,
    started_at: s.started_at,
    last_activity: s.last_activity,
    events: eventsBySession.get(s._id as string) || [],
  }));

  const allEvents = eventRows;
  const firstEvent = allEvents.length > 0 ? allEvents[0].created_at : null;
  const lastEvent = allEvents.length > 0 ? allEvents[allEvents.length - 1].created_at : null;

  return {
    visitor_id: visitorId,
    total_sessions: sessions.length,
    total_events: allEvents.length,
    first_event_at: firstEvent,
    last_event_at: lastEvent,
    sessions,
  };
}

export async function searchVisitorsByWebsite(
  userId: string,
  search?: string,
  limit = 20,
  offset = 0,
  websiteId?: string
) {
  const websites = await Website.find({ user_id: userId }).select('_id');
  const websiteIds = websites.map(w => w._id as string);

  const match: Record<string, unknown> = { website_id: { $in: websiteIds } };
  if (websiteId) match.website_id = websiteId;
  if (search) match.visitor_id = { $regex: search, $options: 'i' };

  const result = await Event.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$visitor_id',
        last_event_at: { $max: '$created_at' },
        total_events: { $sum: 1 },
        total_sessions: { $addToSet: '$session_id' },
      },
    },
    {
      $project: {
        visitor_id: '$_id',
        last_event_at: 1,
        total_events: 1,
        total_sessions: { $size: '$total_sessions' },
      },
    },
    { $sort: { last_event_at: -1 } },
    { $skip: offset },
    { $limit: limit },
  ]);

  return result;
}
