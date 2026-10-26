import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { Event } from '../../src/database/models/Event';
import { Identity } from '../../src/database/models/Identity';
import { Profile } from '../../src/database/models/Profile';
import { eventService } from '../../src/services/eventService';
import { resetMongo, startMongo, stopMongo } from '../helpers/mongo';

const WS = 'ws-pixel';
const source = { workspaceId: WS, sourceId: 'src-web', sourceType: 'web' as const };

// Shape produced by scripts/pixel/tracker.v3.js track().
function pixelEvent(type: string, properties: Record<string, unknown>, pageUrl: string, context: Record<string, unknown>) {
  return {
    website_id: 'site-1',
    identifiers: { event_id: `evt-${type}-${Math.random()}`, session_id: 'sess-2', visitor_id: 'anon-1', time: new Date().toISOString() },
    page: { page_url: pageUrl, page_path: new URL(pageUrl).pathname, page_title: 'Shop' },
    attribution: { utm_source: '', utm_medium: '', utm_campaign: '', gclid: '', fbclid: '' },
    url_params: {},
    event: { type, properties },
    device: { user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) Safari/604.1', device_type: 'mobile' },
    context,
  };
}

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(() => resetMongo(WS));

describe('pixel v3 ingestion', () => {
  it('stores context, attributes to the remembered campaign and click id, links _fbp', async () => {
    const context = {
      cookies: { _fbp: 'fb.1.1700000000000.1234567890', _fbc: '' },
      click_ids: { gclid: 'G-123', gclid_at: '2026-10-20T10:00:00Z' },
      last_touch: { utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'Brand', gclid: 'G-123', landing_page: 'https://shop.test/?gclid=G-123' },
      visit: { visit_count: 3, is_returning: true, last_visit_at: '2026-10-22T10:00:00Z', days_since_last_visit: 3 },
      website_type: 'ecommerce',
      consent: { ads: true, analytics: true },
    };
    await eventService.processEvent(pixelEvent('Purchase', {
      order_id: 'T1', value: 2598, currency: 'INR', content_ids: ['SKU1'], capture_source: 'datalayer',
    }, 'https://shop.test/thank-you', context) as never, '203.0.113.9', null as never, source);

    const stored = await Event.findOne({ workspace_id: WS, event_name: 'Purchase' }).lean<Record<string, any>>();
    expect(stored!.context.visit).toMatchObject({ visit_count: 3, is_returning: true });
    expect(stored!.click_ids).toMatchObject({ gclid: 'G-123' });
    expect(stored!.utm).toMatchObject({ utm_source: 'google', utm_campaign: 'Brand', source: 'google', campaign: 'Brand' });
    expect(stored!.utm.utm_medium).toBe('cpc');
    expect(Object.values(stored!.utm)).not.toContain('');

    expect(await Identity.findOne({ type: 'fbp' }).lean<{ value: string }>()).toMatchObject({ value: 'fb.1.1700000000000.1234567890' });
    expect(await Identity.findOne({ type: 'gclid' }).lean<{ value: string }>()).toMatchObject({ value: 'G-123' });
    const profile = await Profile.findOne({ workspace_id: WS }).lean<Record<string, any>>();
    expect(profile).toMatchObject({ revenue: 2598, order_count: 1, last_utm: expect.objectContaining({ campaign: 'Brand' }) });
  });

  it('page URL campaign beats the remembered touch', async () => {
    await eventService.processEvent(pixelEvent('PageView', {}, 'https://shop.test/?utm_source=facebook&utm_medium=paid_social&utm_campaign=Diwali', {
      last_touch: { utm_source: 'google', utm_campaign: 'Brand' },
    }) as never, null, null as never, source);
    const stored = await Event.findOne({ workspace_id: WS }).lean<Record<string, any>>();
    expect(stored!.utm).toMatchObject({ source: 'facebook', campaign: 'Diwali' });
  });
});
