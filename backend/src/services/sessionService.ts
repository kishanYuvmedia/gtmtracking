import { v4 as uuidv4 } from 'uuid';
import { query } from '../database/index';
import type { CollectRequestBody, SessionData } from '../types/dataModels';

export const sessionService = {
  async trackEvent(body: CollectRequestBody, clientIp?: string | null, geo?: { country?: string | null; region?: string | null; city?: string | null }) {
    const sessionId = body.session_id || uuidv4();
    const existing = await query(
      'SELECT * FROM sessions WHERE visitor_id = $1 AND website_id = $2 AND last_activity > NOW() - INTERVAL \'30 minutes\' ORDER BY last_activity DESC LIMIT 1',
      [body.visitor_id, body.website_id]
    );

    if (existing.rows.length > 0) {
      const session = existing.rows[0];
      await query(
        `UPDATE sessions SET
           last_activity = NOW(),
           page_views = page_views + 1,
           duration_seconds = EXTRACT(EPOCH FROM NOW() - started_at)::int,
           exit_page = $3,
           user_agent = COALESCE($4, user_agent),
           ip_address = COALESCE($5, ip_address),
           browser_timezone = COALESCE($6, browser_timezone)
         WHERE id = $1`,
        [
          session.id,
          body.page?.url || null,
          body.device?.user_agent || null,
          clientIp || null,
          body.location?.timezone || null,
        ]
      );
      return { sessionId: session.id, new: false };
    }

    const result = await query(
      `INSERT INTO sessions
         (id, visitor_id, website_id, referrer, landing_page, user_agent, ip_address,
          browser_timezone, page_views, utm_source, utm_medium, utm_campaign, utm_term, utm_content,
          device_info, location_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [
        uuidv4(),
        body.visitor_id,
        body.website_id,
        body.page?.referrer || null,
        body.page?.url || null,
        body.device?.user_agent || null,
        clientIp || null,
        body.location?.timezone || null,
        null, null, null, null, null,
        body.device ? JSON.stringify(body.device) : null,
        clientIp || geo ? JSON.stringify({
          ip_address: clientIp || null,
          country: geo?.country || null,
          region: geo?.region || null,
          city: geo?.city || null,
        }) : null,
      ]
    );

    return { sessionId: result.rows[0].id, new: true };
  },
};
