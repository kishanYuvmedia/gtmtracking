import { query } from '../index';

export interface WebsiteRow {
  id: string;
  user_id: string;
  domain: string;
  api_key: string;
  pixel_id: string;
  meta_access_token: string | null;
  meta_ad_account_id: string | null;
  meta_test_event_code: string | null;
  name: string | null;
  description: string | null;
  status: string;
  auto_track_pageview: boolean;
  auto_track_click: boolean;
  auto_track_scroll: boolean;
  auto_track_form: boolean;
  cookie_domain: string | null;
  gdpr_enabled: boolean;
  consent_mode: string;
  data_retention_days: number;
  domain_verified: boolean;
  verification_token: string | null;
  verified_at: Date | null;
  favicon: string | null;
  primary_color: string | null;
  timezone: string;
  script_version: number;
  allowed_origins: string[];
  last_event_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export async function getWebsiteByApiKey(apiKey: string) {
  const result = await query('SELECT * FROM websites WHERE api_key = $1', [apiKey]);
  return result.rows[0] || null;
}

export async function getWebsiteById(id: string) {
  const result = await query('SELECT * FROM websites WHERE id = $1', [id]);
  return result.rows[0] || null;
}

export async function getWebsitesByUserId(userId: string) {
  const result = await query(
    `SELECT w.*,
       (SELECT COUNT(*) FROM events WHERE website_id = w.id) as event_count,
       (SELECT COUNT(*) FROM events WHERE website_id = w.id AND created_at > NOW() - INTERVAL '24 hours') as events_24h,
       (SELECT COUNT(DISTINCT visitor_id) FROM events WHERE website_id = w.id) as visitor_count
     FROM websites w
     WHERE w.user_id = $1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return result.rows;
}

export async function createWebsite(website: Omit<WebsiteRow, 'created_at' | 'updated_at'>) {
  const result = await query(
    `INSERT INTO websites (id, user_id, domain, name, api_key, pixel_id, auto_track_pageview, auto_track_click, auto_track_scroll, auto_track_form, cookie_domain, gdpr_enabled, consent_mode, data_retention_days, domain_verified, timezone, allowed_origins)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *`,
    [
      website.id, website.user_id, website.domain,
      website.name || null, website.api_key, website.pixel_id || '',
      website.auto_track_pageview ?? true,
      website.auto_track_click ?? true,
      website.auto_track_scroll ?? true,
      website.auto_track_form ?? true,
      website.cookie_domain || null,
      website.gdpr_enabled ?? false,
      website.consent_mode || 'default',
      website.data_retention_days ?? 365,
      website.domain_verified ?? false,
      website.timezone || 'UTC',
      JSON.stringify(website.allowed_origins || []),
    ]
  );
  return result.rows[0];
}

export async function updateWebsite(id: string, updates: Partial<WebsiteRow>) {
  const keys = Object.keys(updates).filter(k => k !== 'id' && k !== 'created_at');
  if (keys.length === 0) return null;
  const setClause = keys.map((k, i) => `${k} = $${i + 2}`).join(', ');
  const values = keys.map(k => {
    const val = (updates as Record<string, unknown>)[k];
    return Array.isArray(val) ? JSON.stringify(val) : val;
  });
  const result = await query(
    `UPDATE websites SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [id, ...values]
  );
  return result.rows[0] || null;
}
