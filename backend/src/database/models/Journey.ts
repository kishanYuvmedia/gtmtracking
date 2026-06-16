import { query } from '../index';

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
  offset = 0
): Promise<JourneyResponse | null> {
  const sessionResult = await query(
    `SELECT
       s.id as session_id,
       s.landing_page,
       s.exit_page,
       s.page_views,
       s.duration_seconds,
       s.referrer,
       s.utm_source,
       s.utm_medium,
       s.utm_campaign,
       s.ip_address,
       s.device_info,
       s.location_info,
       s.started_at,
       s.last_activity
     FROM sessions s
     JOIN websites w ON w.id = s.website_id
     WHERE s.visitor_id = $1 AND w.user_id = $2
     ORDER BY s.started_at DESC
     LIMIT $3 OFFSET $4`,
    [visitorId, userId, limit, offset]
  );

  if (sessionResult.rows.length === 0) {
    return null;
  }

  const sessionIds = sessionResult.rows.map(r => r.session_id);

  const eventResult = await query(
    `SELECT
       e.id, e.website_id, w.domain as website_domain,
       e.event_name, e.event_id, e.session_id, e.visitor_id,
       e.payload, e.properties, e.device_info, e.page_info,
       e.network_info, e.location_info, e.created_at
     FROM events e
     JOIN websites w ON w.id = e.website_id
     WHERE e.session_id = ANY($1::uuid[]) AND w.user_id = $2
     ORDER BY e.created_at ASC`,
    [sessionIds, userId]
  );

  const eventsBySession = new Map<string, JourneyEvent[]>();
  for (const row of eventResult.rows) {
    const sid = row.session_id;
    if (!eventsBySession.has(sid)) {
      eventsBySession.set(sid, []);
    }
    eventsBySession.get(sid)!.push(row);
  }

  const sessions: JourneySession[] = sessionResult.rows.map(row => ({
    session_id: row.session_id,
    landing_page: row.landing_page,
    exit_page: row.exit_page,
    page_views: row.page_views,
    duration_seconds: row.duration_seconds,
    referrer: row.referrer,
    utm_source: row.utm_source,
    utm_medium: row.utm_medium,
    utm_campaign: row.utm_campaign,
    ip_address: row.ip_address,
    device_info: row.device_info,
    location_info: row.location_info,
    started_at: row.started_at,
    last_activity: row.last_activity,
    events: eventsBySession.get(row.session_id) || [],
  }));

  const allEvents = eventResult.rows;
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
  offset = 0
) {
  let sql: string;
  let params: unknown[];

  if (search) {
    sql = `SELECT DISTINCT e.visitor_id,
             MAX(e.created_at) as last_event_at,
             COUNT(*)::int as total_events,
             COUNT(DISTINCT e.session_id)::int as total_sessions
           FROM events e
           JOIN websites w ON w.id = e.website_id
           WHERE w.user_id = $1 AND e.visitor_id ILIKE $2
           GROUP BY e.visitor_id
           ORDER BY last_event_at DESC
           LIMIT $3 OFFSET $4`;
    params = [userId, `%${search}%`, limit, offset];
  } else {
    sql = `SELECT DISTINCT e.visitor_id,
             MAX(e.created_at) as last_event_at,
             COUNT(*)::int as total_events,
             COUNT(DISTINCT e.session_id)::int as total_sessions
           FROM events e
           JOIN websites w ON w.id = e.website_id
           WHERE w.user_id = $1
           GROUP BY e.visitor_id
           ORDER BY last_event_at DESC
           LIMIT $2 OFFSET $3`;
    params = [userId, limit, offset];
  }

  const result = await query(sql, params);
  return result.rows;
}
