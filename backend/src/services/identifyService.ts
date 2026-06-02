import { query } from '../database/index';
import type { IdentifyRequestBody } from '../types/dataModels';

export const identifyService = {
  async identifyVisitor(data: IdentifyRequestBody) {
    const existing = await query(
      'SELECT * FROM visitor_profiles WHERE visitor_id = $1',
      [data.visitor_id]
    );

    if (existing.rows.length > 0) {
      const profile = existing.rows[0];
      const merged = {
        ...profile,
        email: data.email || profile.email,
        phone: data.phone || profile.phone,
        first_name: data.first_name || profile.first_name,
        last_name: data.last_name || profile.last_name,
        city: data.city || profile.city,
        country: data.country || profile.country,
        zip: data.zip || profile.zip,
        birth_date: data.birth_date || profile.birth_date,
        gender: data.gender || profile.gender,
        custom_data: { ...(profile.custom_data || {}), ...(data.custom || {}) },
        last_seen_at: new Date().toISOString(),
        total_sessions: profile.total_sessions + 1,
      };

      await query(
        `UPDATE visitor_profiles SET
           email = $2, phone = $3, first_name = $4, last_name = $5,
           city = $6, country = $7, zip = $8, birth_date = $9, gender = $10,
           custom_data = $11, last_seen_at = $12, total_sessions = $13
         WHERE visitor_id = $1`,
        [
          merged.visitor_id, merged.email, merged.phone,
          merged.first_name, merged.last_name, merged.city,
          merged.country, merged.zip, merged.birth_date, merged.gender,
          JSON.stringify(merged.custom_data), merged.last_seen_at,
          merged.total_sessions,
        ]
      );
    } else {
      await query(
        `INSERT INTO visitor_profiles
           (visitor_id, email, phone, first_name, last_name, city, country, zip,
            birth_date, gender, custom_data, first_seen_at, last_seen_at, total_sessions)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), 1)
         ON CONFLICT (visitor_id) DO NOTHING`,
        [
          data.visitor_id, data.email || null, data.phone || null,
          data.first_name || null, data.last_name || null,
          data.city || null, data.country || null, data.zip || null,
          data.birth_date || null, data.gender || null,
          JSON.stringify(data.custom || {}),
        ]
      );
    }

    if (data.client_ip) {
      const geo = await import('./geoService').then(m => m.lookupGeo(data.client_ip!));
      await query(
        `UPDATE visitor_profiles SET
           device_info = COALESCE(device_info, '{}'::jsonb),
           location_info = COALESCE(location_info, '{}'::jsonb) || $2::jsonb
         WHERE visitor_id = $1`,
        [
          data.visitor_id,
          JSON.stringify({
            ip_address: data.client_ip,
            country: geo.country,
            region: geo.region,
            city: geo.city,
          }),
        ]
      );
    }

    return { visitor_id: data.visitor_id };
  },
};
