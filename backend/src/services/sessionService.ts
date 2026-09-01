import { v4 as uuidv4 } from 'uuid';
import { Session } from '../database/models/Session';

interface TrackEventInput {
  event_name?: string;
  website_id?: string;
  session_id?: string;
  visitor_id?: string;
  properties?: Record<string, unknown>;
  page?: Record<string, unknown> | null;
  device?: Record<string, unknown> | null;
  location?: Record<string, unknown> | null;
  utm?: Record<string, unknown> | null;
  referrer?: string;
}

export const sessionService = {
  async trackEvent(body: TrackEventInput, clientIp?: string | null, geo?: { country?: string | null; region?: string | null; city?: string | null }) {
    const sessionId = body.session_id || uuidv4();
    const since30m = new Date(Date.now() - 30 * 60 * 1000);
    const existing = await Session.findOne({
      visitor_id: body.visitor_id,
      website_id: body.website_id,
      last_activity: { $gte: since30m },
    }).sort({ last_activity: -1 });

    if (existing) {
      const url = body.page?.url || body.page?.page_url || null;
      await Session.updateOne(
        { _id: existing._id },
        {
          $set: {
            last_activity: new Date(),
            exit_page: url,
            user_agent: body.device?.user_agent || existing.user_agent,
            ip_address: clientIp || existing.ip_address,
            browser_timezone: body.location?.timezone || existing.browser_timezone,
            duration_seconds: Math.round((Date.now() - new Date(existing.started_at).getTime()) / 1000),
          },
          $inc: { page_views: 1 },
        }
      );
      return { sessionId: existing._id as string, new: false };
    }

    const utm = body.utm || {};
    const location = clientIp || geo
      ? {
          ip_address: clientIp || null,
          country: geo?.country || null,
          region: geo?.region || null,
          city: geo?.city || null,
        }
      : null;

    await Session.create({
      _id: sessionId,
      visitor_id: body.visitor_id,
      website_id: body.website_id,
      referrer: body.referrer || body.page?.referrer || null,
      landing_page: body.page?.url || body.page?.page_url || null,
      user_agent: body.device?.user_agent || null,
      ip_address: clientIp || null,
      browser_timezone: body.location?.timezone || null,
      utm_source: utm.source || utm.utm_source || null,
      utm_medium: utm.medium || utm.utm_medium || null,
      utm_campaign: utm.campaign || utm.utm_campaign || null,
      utm_term: utm.term || utm.utm_term || null,
      utm_content: utm.content || utm.utm_content || null,
      device_info: body.device || null,
      location_info: location,
      page_views: 1,
      started_at: new Date(),
      last_activity: new Date(),
    });

    return { sessionId, new: true };
  },
};
