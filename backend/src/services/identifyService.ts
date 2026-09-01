import { VisitorProfile } from '../database/models/VisitorProfile';
import type { IdentifyRequestBody } from '../types/dataModels';

export const identifyService = {
  async identifyVisitor(data: IdentifyRequestBody) {
    const existing = await VisitorProfile.findById(data.visitor_id);

    if (existing) {
      const mergedCustom = { ...(existing.custom_data || {}), ...(data.custom || {}) };
      await VisitorProfile.updateOne(
        { _id: data.visitor_id },
        {
          $set: {
            email: data.email || existing.email,
            phone: data.phone || existing.phone,
            first_name: data.first_name || existing.first_name,
            last_name: data.last_name || existing.last_name,
            city: data.city || existing.city,
            country: data.country || existing.country,
            zip: data.zip || existing.zip,
            birth_date: data.birth_date || existing.birth_date,
            gender: data.gender || existing.gender,
            custom_data: mergedCustom,
            last_seen_at: new Date(),
          },
          $inc: { total_sessions: 1 },
        }
      );
    } else {
      await VisitorProfile.create({
        _id: data.visitor_id,
        email: data.email || null,
        phone: data.phone || null,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        city: data.city || null,
        country: data.country || null,
        zip: data.zip || null,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        custom_data: data.custom || {},
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        total_sessions: 1,
      });
    }

    if (data.client_ip) {
      const geo = await import('./geoService').then(m => m.lookupGeo(data.client_ip!));
      await VisitorProfile.updateOne(
        { _id: data.visitor_id },
        {
          $set: {
            location_info: {
              ip_address: data.client_ip,
              country: geo.country,
              region: geo.region,
              city: geo.city,
            },
          },
        }
      );
    }

    return { visitor_id: data.visitor_id };
  },
};
