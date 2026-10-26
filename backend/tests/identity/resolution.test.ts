import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { v4 as uuidv4 } from 'uuid';
import { Event } from '../../src/database/models/Event';
import { Identity } from '../../src/database/models/Identity';
import { IdentityConflict } from '../../src/database/models/IdentityConflict';
import { Profile } from '../../src/database/models/Profile';
import { ProfileMerge, resolveProfileRedirect } from '../../src/database/models/ProfileMerge';
import { ProfileTraitChange } from '../../src/database/models/ProfileTraitChange';
import { processIngestedEvent } from '../../src/services/eventProcessor';
import { rerunIdentityResolution } from '../../src/services/identity/batch';
import { resetMongo, startMongo, stopMongo } from '../helpers/mongo';

const WS = 'ws-test';
let clock = Date.UTC(2026, 9, 1, 9);

interface TestEvent {
  anon: string;
  name?: string;
  traits?: Record<string, unknown>;
  properties?: Record<string, unknown>;
  userId?: string;
  ip?: string;
  session?: string;
  at?: Date;
  process?: boolean;
  receivedAt?: Date;
}

async function insert(input: TestEvent) {
  const at = input.at || new Date((clock += 60_000));
  const doc = await Event.create({
    _id: uuidv4(),
    workspace_id: WS,
    website_id: 'site-1',
    event_name: input.name || (input.traits ? 'identify' : 'PageView'),
    event_type: input.traits ? 'identify' : 'track',
    event_id: uuidv4(),
    session_id: input.session || `s-${input.anon}`,
    visitor_id: input.anon,
    anonymous_id: input.anon,
    user_id: input.userId || null,
    properties: { ...(input.properties || {}), ...(input.traits ? { traits: input.traits } : {}) },
    device_info: { user_agent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0.0.0' },
    location_info: { ip_address: input.ip || '203.0.113.10', country: 'IN', city: 'Jaipur' },
    timestamp: at,
    // Live events arrive "now" even when their client timestamp is in the past.
    received_at: input.receivedAt || new Date(),
  });
  return doc;
}

async function track(input: TestEvent) {
  const doc = await insert(input);
  await processIngestedEvent({ eventId: doc.event_id, identifiers: {} });
  return (await Event.findById(doc._id).lean<{ profile_id: string }>())!;
}

const profiles = () => Profile.find({ workspace_id: WS }).lean<{ _id: string; event_count: number; email: string | null; is_known: boolean; device_count: number; session_count: number; revenue: number; traits: Record<string, unknown> }[]>();

beforeAll(startMongo);
afterAll(stopMongo);
beforeEach(() => resetMongo(WS));

describe('identity resolution', () => {
  it('anonymous visitor who identifies later keeps all earlier events (back-fill)', async () => {
    await track({ anon: 'A' });
    await track({ anon: 'A', name: 'ViewContent' });
    // Stored long ago but never resolved (e.g. worker was down) — must be back-filled.
    const orphan = await insert({ anon: 'A', name: 'AddToCart', receivedAt: new Date(Date.now() - 60 * 60 * 1000) });
    const identified = await track({ anon: 'A', traits: { email: 'Ravi@Gmail.com ', first_name: 'Ravi' } });

    const [person] = await profiles();
    expect(await Profile.countDocuments()).toBe(1);
    expect(person).toMatchObject({ email: 'ravi@gmail.com', is_known: true, event_count: 4 });
    expect(identified.profile_id).toBe(person._id);
    expect((await Event.findById(orphan._id).lean<{ profile_id: string }>())!.profile_id).toBe(person._id);
    expect(await Event.countDocuments({ profile_id: person._id })).toBe(4);
  });

  it('merges two profiles when the same email appears, oldest survives, redirect kept', async () => {
    const desktop = await track({ anon: 'desktop' });
    await track({ anon: 'desktop', traits: { email: 'ravi@gmail.com' } });
    const mobile = await track({ anon: 'mobile', session: 's-mobile', properties: { value: 999 }, name: 'Purchase' });
    expect(await Profile.countDocuments()).toBe(2);

    await track({ anon: 'mobile', session: 's-mobile', traits: { email: ' RAVI@gmail.com' } });

    const all = await profiles();
    expect(all).toHaveLength(1);
    expect(all[0]._id).toBe(desktop.profile_id);
    expect(all[0]).toMatchObject({ event_count: 4, device_count: 2, session_count: 2, revenue: 999 });
    const merge = await ProfileMerge.findOne({ merged_id: mobile.profile_id }).lean<{ survivor_id: string; reason: string; identifier: { type: string } }>();
    expect(merge).toMatchObject({ survivor_id: desktop.profile_id, reason: 'email matched', identifier: { type: 'email' } });
    expect(await resolveProfileRedirect(WS, mobile.profile_id)).toBe(desktop.profile_id);
    expect(await Identity.countDocuments({ profile_id: desktop.profile_id, type: 'anonymous_id' })).toBe(2);
  });

  it('matches the same phone written in different formats', async () => {
    await track({ anon: 'p1', traits: { phone: '9876543210' } });
    await track({ anon: 'p2', traits: { phone: '+91 98765 43210' } });
    const all = await profiles();
    expect(all).toHaveLength(1);
    expect(await Identity.find({ type: 'phone' }).distinct('value')).toEqual(['+919876543210']);
  });

  it('keeps different people on the same office IP and browser build as separate users', async () => {
    await track({ anon: 'office-1', ip: '198.51.100.20', traits: { email: 'anita@corp.io' } });
    await track({ anon: 'office-2', ip: '198.51.100.20', traits: { email: 'vikram@corp.io' } });
    await track({ anon: 'office-3', ip: '198.51.100.20' });
    expect(await Profile.countDocuments()).toBe(3);
    expect(await ProfileMerge.countDocuments()).toBe(0);
  });

  it('never merges profiles with different user_ids and logs the conflict', async () => {
    const ravi = await track({ anon: 'family-pc', userId: 'u-ravi' });
    const anita = await track({ anon: 'family-pc', userId: 'u-anita' });
    await track({ anon: 'family-pc', userId: 'u-anita' });

    expect(anita.profile_id).not.toBe(ravi.profile_id);
    expect(await Profile.countDocuments()).toBe(2);
    expect(await ProfileMerge.countDocuments()).toBe(0);
    const conflicts = await IdentityConflict.find().lean<{ conflicting_values: string[]; occurrences: number }[]>();
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].conflicting_values.sort()).toEqual(['u-anita', 'u-ravi']);
    expect(conflicts[0].occurrences).toBe(2);
    // The shared browser id stays with the first user; Anita's profile is keyed by her user_id.
    expect((await Identity.findOne({ type: 'anonymous_id', value: 'family-pc' }).lean<{ profile_id: string }>())!.profile_id).toBe(ravi.profile_id);
  });

  it('records trait history and lets the newest non-empty value win', async () => {
    await track({ anon: 'A', traits: { first_name: 'Ravi', city: 'Jaipur' } });
    await track({ anon: 'A', traits: { city: 'Pune', first_name: '' } });
    const [person] = await profiles();
    expect(person.traits).toMatchObject({ first_name: 'Ravi', city: 'Pune' });
    const history = await ProfileTraitChange.find({ key: 'city' }).sort({ changed_at: 1 }).lean<{ old_value: unknown; new_value: unknown }[]>();
    expect(history.map(change => [change.old_value, change.new_value])).toEqual([[null, 'Jaipur'], ['Jaipur', 'Pune']]);
  });

  it('serialises concurrent workers: parallel events for one new visitor create one profile', async () => {
    const docs = await Promise.all(Array.from({ length: 12 }, () => insert({ anon: 'burst' })));
    await Promise.all(docs.map(doc => processIngestedEvent({ eventId: doc.event_id, identifiers: {} })));
    const all = await profiles();
    expect(all).toHaveLength(1);
    expect(all[0].event_count).toBe(12);
    expect(await Identity.countDocuments({ type: 'anonymous_id', value: 'burst' })).toBe(1);
  });

  it('bulk re-run rebuilds the same identity graph as live processing', async () => {
    await track({ anon: 'desktop' });
    await track({ anon: 'desktop', traits: { email: 'ravi@gmail.com' } });
    await track({ anon: 'mobile' });
    await track({ anon: 'mobile', traits: { email: 'ravi@gmail.com' } });
    await track({ anon: 'family-pc', userId: 'u-1' });
    await track({ anon: 'family-pc', userId: 'u-2' });
    await track({ anon: 'stranger' });

    const partition = async () => {
      const events = await Event.find({ workspace_id: WS }).sort({ timestamp: 1 }).lean<{ profile_id: string }[]>();
      const label = new Map<string, number>();
      return events.map(event => {
        if (!label.has(event.profile_id)) label.set(event.profile_id, label.size);
        return label.get(event.profile_id);
      });
    };
    const live = await partition();
    const liveCounts = (await profiles()).map(p => p.event_count).sort();

    const stats = await rerunIdentityResolution(WS);
    expect(await partition()).toEqual(live);
    expect((await profiles()).map(p => p.event_count).sort()).toEqual(liveCounts);
    expect(stats).toMatchObject({ events: 7, profiles: 4, merges: 1, conflicts: 1 });
  });
});
