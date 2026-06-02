import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/index';

export const gdprService = {
  async logConsent(visitorId: string, consent: boolean, details?: Record<string, unknown>) {
    await query(
      `INSERT INTO consent_logs (id, visitor_id, consent, details)
       VALUES ($1, $2, $3, $4)`,
      [uuidv4(), visitorId, consent, JSON.stringify(details || {})]
    );
  },

  async getConsent(visitorId: string) {
    const result = await query(
      'SELECT * FROM consent_logs WHERE visitor_id = $1 ORDER BY created_at DESC LIMIT 1',
      [visitorId]
    );
    return result.rows[0] || null;
  },

  async deleteVisitorData(visitorId: string) {
    await query('DELETE FROM events WHERE visitor_id = $1', [visitorId]);
    await query('DELETE FROM consent_logs WHERE visitor_id = $1', [visitorId]);
  },
};
