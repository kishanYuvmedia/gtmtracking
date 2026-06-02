import { query } from '../index';

export interface EventLogRow {
  id: string;
  event_id: string;
  status: string;
  response: Record<string, unknown>;
  created_at: Date;
}

export async function insertEventLog(log: Omit<EventLogRow, 'created_at'>) {
  const result = await query(
    `INSERT INTO event_logs (id, event_id, status, response)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [log.id, log.event_id, log.status, JSON.stringify(log.response)]
  );
  return result.rows[0];
}

export async function getEventLogsByEventId(eventId: string) {
  const result = await query(
    'SELECT * FROM event_logs WHERE event_id = $1 ORDER BY created_at DESC',
    [eventId]
  );
  return result.rows;
}
