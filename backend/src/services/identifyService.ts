import { VisitorProfile } from '../database/models/VisitorProfile';
import type { IdentifyRequestBody } from '../types/dataModels';
import { extractIdentifiers } from './identity/extract';
import { resolveIdentity } from './identity/resolver';
import { getIdentitySettings } from './identity/settings';
import { rebuildProfileSummaries } from './identity/summary';

export const identifyService = {
  async identifyVisitor(data: IdentifyRequestBody, workspaceId: string) {
    const existing = await VisitorProfile.findOne({
      _id: data.visitor_id,
      workspace_id: workspaceId,
    });
    const unscopedLegacyProfile = existing
      ? null
      : await VisitorProfile.findOne({
        _id: data.visitor_id,
        workspace_id: null,
      }).select('_id');

    if (existing) {
      const mergedCustom = {
        ...(existing.custom_data || {}),
        ...(data.custom || {}),
        ...(data.name ? { name: data.name } : {}),
      };
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
    } else if (!unscopedLegacyProfile) {
      await VisitorProfile.create({
        _id: data.visitor_id,
        workspace_id: workspaceId,
        email: data.email || null,
        phone: data.phone || null,
        first_name: data.first_name || null,
        last_name: data.last_name || null,
        city: data.city || null,
        country: data.country || null,
        zip: data.zip || null,
        birth_date: data.birth_date || null,
        gender: data.gender || null,
        custom_data: { ...(data.custom || {}), ...(data.name ? { name: data.name } : {}) },
        first_seen_at: new Date(),
        last_seen_at: new Date(),
        total_sessions: 1,
      });
    }

    if (data.client_ip && existing) {
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

    const traits: Record<string, unknown> = {
      ...(data.custom || {}),
      ...(data.name ? { name: data.name } : {}),
      ...(data.first_name ? { first_name: data.first_name } : {}),
      ...(data.last_name ? { last_name: data.last_name } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.phone ? { phone: data.phone } : {}),
      ...(data.city ? { city: data.city } : {}),
      ...(data.country ? { country: data.country } : {}),
      ...(data.zip ? { zip: data.zip } : {}),
      ...(data.birth_date ? { birth_date: data.birth_date } : {}),
      ...(data.gender ? { gender: data.gender } : {}),
    };
    const settings = await getIdentitySettings(workspaceId);
    const identifiers = extractIdentifiers(
      { anonymous_id: data.visitor_id, user_id: data.user_id, event_type: 'identify', properties: { traits } },
      settings,
      { anonymous_id: data.visitor_id, user_id: data.user_id, email: data.email || existing?.email, phone: data.phone || existing?.phone }
    );
    if (identifiers.length) {
      const result = await resolveIdentity({ workspaceId, identifiers, traits, eventId: null, timestamp: new Date() });
      if (result.created || result.mergedIds.length || result.backfilledEvents) {
        await rebuildProfileSummaries(workspaceId, [result.profileId]);
      }
    }

    return { visitor_id: data.visitor_id };
  },
};
