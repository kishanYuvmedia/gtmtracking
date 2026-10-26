import { Event } from '../database/models/Event';
import { extractIdentifiers, extractTraits, type ExplicitIdentifiers } from './identity/extract';
import { resolveIdentity } from './identity/resolver';
import { getIdentitySettings } from './identity/settings';
import { applyEventToSummary, rebuildProfileSummaries } from './identity/summary';

export interface ProcessEventJob {
  eventId: string;
  identifiers: ExplicitIdentifiers;
}

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getClickIds(...sources: Record<string, unknown>[]): Record<string, string> {
  const fields = ['fbclid', 'gclid', 'gbraid', 'wbraid', 'msclkid', 'ttclid'];
  const clickIds: Record<string, string> = {};
  for (const field of fields) {
    const value = sources.map(source => source[field]).find(item => typeof item === 'string' && item);
    if (typeof value === 'string') clickIds[field] = value;
  }
  return clickIds;
}

function deriveBrowserInfo(userAgent: string): Record<string, unknown> {
  const browser = userAgent.match(/(Edg|Chrome|Firefox|Safari)\/([\d.]+)/i);
  const os = userAgent.match(/(Windows NT|Android|iPhone OS|Mac OS X|Linux)[\s/]?([\d._]*)/i);
  const deviceType = /tablet|ipad/i.test(userAgent)
    ? 'tablet'
    : /mobile|iphone|android/i.test(userAgent)
      ? 'mobile'
      : 'desktop';
  return {
    name: browser ? browser[1] : 'unknown',
    version: browser ? browser[2] : null,
    os: os ? os[1] : 'unknown',
    os_version: os ? os[2].replace(/_/g, '.') : null,
    device_type: deviceType,
  };
}

export async function processIngestedEvent(job: ProcessEventJob): Promise<void> {
  const event = await Event.findOne({ event_id: job.eventId });
  if (!event) throw new Error(`Queued event ${job.eventId} was not found`);
  if (!event.workspace_id) throw new Error(`Event ${job.eventId} has no workspace scope`);

  const payload = record(event.payload);
  const properties = record(event.properties);
  const page = record(event.page_info);
  const payloadAttribution = record(payload.attribution);
  const propertyUtm = record(properties.utm);
  const urlParams = record(event.url_params);
  const context = record(event.context);
  // Remembered by the pixel for 90 days, so a purchase days later still carries its gclid/fbclid.
  const rememberedClicks = record(context.click_ids);
  const lastTouch = record(context.last_touch);
  // Pixel v3 sends page_url; older clients and server events send url.
  const url = typeof page.url === 'string' ? page.url : typeof page.page_url === 'string' ? page.page_url : '';
  let queryParams: Record<string, unknown> = {};
  try {
    queryParams = Object.fromEntries(new URL(url).searchParams.entries());
  } catch {
    queryParams = {};
  }

  // The pixel sends every attribution key, mostly empty; drop empties per source *before*
  // merging so they cannot overwrite real values from another source.
  const filled = (params: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined));
  const hasCampaign = (params: Record<string, unknown>) =>
    Object.keys(params).some(key => /^utm_/.test(key) && typeof params[key] === 'string' && params[key]);
  // Last non-direct touch: when this page has no campaign parameters, attribute the event to
  // the visitor's most recent campaign touch.
  const utm: Record<string, unknown> = {
    ...(hasCampaign(queryParams) || hasCampaign(urlParams) || hasCampaign(propertyUtm) || hasCampaign(payloadAttribution)
      ? {}
      : Object.fromEntries(Object.entries(filled(lastTouch)).filter(([key]) => /^utm_/.test(key)))),
    ...filled(queryParams),
    ...filled(payloadAttribution),
    ...filled(propertyUtm),
    ...filled(urlParams),
  };
  for (const key of ['source', 'medium', 'campaign', 'term', 'content']) {
    const prefixed = utm[`utm_${key}`];
    if (typeof utm[key] !== 'string' && typeof prefixed === 'string') utm[key] = prefixed;
  }

  const device = record(event.device_info);
  const userAgent = typeof device.user_agent === 'string' ? device.user_agent : '';
  const browser = deriveBrowserInfo(userAgent);
  const location = record(event.location_info);
  const clickIds = getClickIds(payloadAttribution, propertyUtm, urlParams, queryParams, rememberedClicks);
  const timestamp = event.timestamp || event.created_at;
  const anonymousId = job.identifiers.anonymous_id || event.anonymous_id || event.visitor_id;
  const enrichment = {
    anonymous_id: anonymousId,
    utm,
    click_ids: clickIds,
    ip: typeof location.ip_address === 'string' ? location.ip_address : event.ip || null,
    country: typeof location.country === 'string' ? location.country : event.country || null,
    device: { ...device, ...browser },
    browser,
  };

  const settings = await getIdentitySettings(event.workspace_id);
  const source = { ...event.toObject(), ...enrichment };
  const identifiers = extractIdentifiers(source, settings, job.identifiers);
  if (!identifiers.length) {
    await Event.updateOne({ _id: event._id }, { $set: { ...enrichment, processed_at: new Date() } });
    return;
  }

  const userId = identifiers.find(identifier => identifier.type === 'user_id')?.value || event.user_id || null;
  let needsRebuild = false;
  const result = await resolveIdentity(
    { workspaceId: event.workspace_id, identifiers, traits: extractTraits(source), eventId: event.event_id, timestamp },
    async (resolved, session) => {
      const before = await Event.findById(event._id).select('profile_id processed_at').session(session)
        .lean<{ profile_id: string | null; processed_at: Date | null }>();
      await Event.updateOne(
        { _id: event._id },
        { $set: { ...enrichment, user_id: userId, profile_id: resolved.profileId, processed_at: before?.processed_at || new Date() } },
        { session }
      );
      // Incremental counters only for a first pass on an event nobody linked yet; anything
      // else (queue retry, back-filled event, merge) gets an absolute recount after commit.
      needsRebuild = !!before?.processed_at || !!before?.profile_id
        || resolved.mergedIds.length > 0 || resolved.backfilledEvents > 0;
      if (!needsRebuild) {
        await applyEventToSummary(event.workspace_id, resolved.profileId, {
          _id: event._id,
          event_name: event.event_name,
          session_id: event.session_id,
          timestamp,
          properties: event.properties,
          utm,
          country: enrichment.country,
          location_info: event.location_info,
          device: enrichment.device,
        }, session);
      }
    }
  );
  if (needsRebuild) await rebuildProfileSummaries(event.workspace_id, [result.profileId]);
}
