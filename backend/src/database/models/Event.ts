import { query } from '../index';
import type { CollectRequestBody } from '../../types/dataModels';

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

export async function insertEvent(event: Omit<EventRow, 'created_at'>) {
  const result = await query(
    `INSERT INTO events (id, website_id, event_name, event_id, session_id, visitor_id, payload, properties, device_info, page_info, performance_info, network_info, location_info)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (event_id) DO NOTHING
     RETURNING *`,
    [
      event.id, event.website_id, event.event_name, event.event_id,
      event.session_id, event.visitor_id,
      event.payload ? JSON.stringify(event.payload) : null,
      JSON.stringify(event.properties),
      event.device_info ? JSON.stringify(event.device_info) : null,
      event.page_info ? JSON.stringify(event.page_info) : null,
      event.performance_info ? JSON.stringify(event.performance_info) : null,
      event.network_info ? JSON.stringify(event.network_info) : null,
      event.location_info ? JSON.stringify(event.location_info) : null,
    ]
  );
  return result.rows[0] || null;
}

export async function getEventsByWebsite(websiteId: string, limit = 100, offset = 0) {
  const result = await query(
    'SELECT * FROM events WHERE website_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
    [websiteId, limit, offset]
  );
  return result.rows;
}

export async function getEventById(eventId: string) {
  const result = await query('SELECT * FROM events WHERE event_id = $1', [eventId]);
  return result.rows[0] || null;
}

export async function getEventsByUser(userId: string, limit = 50, offset = 0) {
  const result = await query(
    `SELECT e.*, w.domain as website_domain
     FROM events e
     JOIN websites w ON w.id = e.website_id
     WHERE w.user_id = $1
     ORDER BY e.created_at DESC LIMIT $2 OFFSET $3`,
    [userId, limit, offset]
  );
  return result.rows;
}

export async function getEventStats(userId: string) {
  const result = await query(
    `SELECT
       COUNT(*)::int as total_events,
       COUNT(DISTINCT e.session_id)::int as total_sessions,
       COUNT(DISTINCT e.visitor_id)::int as total_visitors,
       COUNT(DISTINCT w.id)::int as total_websites
     FROM events e
     JOIN websites w ON w.id = e.website_id
     WHERE w.user_id = $1`,
    [userId]
  );
  return result.rows[0] || { total_events: 0, total_sessions: 0, total_visitors: 0, total_websites: 0 };
}

export async function getRecentEventsByUser(userId: string, hours = 24) {
  const result = await query(
    `SELECT
       e.event_name,
       COUNT(*)::int as count,
       COUNT(DISTINCT e.visitor_id)::int as unique_visitors
     FROM events e
     JOIN websites w ON w.id = e.website_id
     WHERE w.user_id = $1 AND e.created_at > NOW() - INTERVAL '1 hour' * $2
     GROUP BY e.event_name
     ORDER BY count DESC`,
    [userId, hours]
  );
  return result.rows;
}

export function normalizeCollectBody(body: CollectRequestBody) {
  const props = body.properties || {};
  return {
    event_name: body.event_name,
    event_id: body.event_id,
    session_id: body.session_id,
    visitor_id: body.visitor_id,
    timestamp: body.timestamp,
    properties: props,
    device_info: body.device || null,
    page_info: body.page || null,
    network_info: body.network || null,
    performance_info: body.performance || null,
    location_info: body.location || null,
    payload: props,
  };
}
