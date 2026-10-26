import bcrypt from 'bcrypt';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Delivery } from '../../src/database/models/Delivery';
import { Destination } from '../../src/database/models/Destination';
import { DestinationMapping } from '../../src/database/models/DestinationMapping';
import { Event } from '../../src/database/models/Event';
import { IdentityConflict } from '../../src/database/models/IdentityConflict';
import { Profile } from '../../src/database/models/Profile';
import { ProfileMerge } from '../../src/database/models/ProfileMerge';
import { Segment } from '../../src/database/models/Segment';
import { Source, ensureWebsiteSource } from '../../src/database/models/Source';
import { User, setUserWorkspaceId } from '../../src/database/models/User';
import { Website } from '../../src/database/models/Website';
import { Workspace, ensureWorkspaceForUser } from '../../src/database/models/Workspace';
import { ensureWorkspaceMember } from '../../src/database/models/WorkspaceMember';
import { requireDevDatabase, testConnection } from '../../src/database';
import { rerunIdentityResolution } from '../../src/services/identity/batch';

// Seeds ~5,000 people / ~100,000 raw events over 60 days into the DEV database, then runs the
// real identity resolution over them and verifies the result against ground truth.
//
// The events deliberately exercise matching: anonymous visitors who identify later, people on
// two devices linked by email or phone, emails in mixed case with stray spaces, phones in
// national and international formats, office colleagues sharing one IP and browser build, and
// family members with different user_ids on one shared browser.
//
//   CDP_SEED_DRY_RUN=1                 generate + print stats only, no database
//   CDP_SEED_OWNER_EMAIL=you@x.com     seed into that user's workspace (visible after login);
//                                      otherwise a verified demo login is created and printed
//   CDP_SEED_PROFILES=5000 CDP_SEED=42 size and PRNG seed (same seed → same data)
//
// Seeded rows have ids starting with "cdp-seed-"; re-running deletes those first. Identity
// resolution then rebuilds ALL profiles of the workspace from its events.

const PREFIX = 'cdp-seed-';
const PROFILE_COUNT = Number(process.env.CDP_SEED_PROFILES || 5_000);
const DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const BATCH_SIZE = 2_000;
const DRY_RUN = process.env.CDP_SEED_DRY_RUN === '1';
const DEFAULT_WORKSPACE_ID = `${PREFIX}workspace`;
const DEFAULT_OWNER_ID = `${PREFIX}owner`;
const DEMO_LOGIN_EMAIL = 'demo@cdp-seed.test';
const WEBSITE_ID = `${PREFIX}website`;
const WEBSITE_KEY = `${PREFIX}write-key`;
const SERVER_SOURCE_ID = `${PREFIX}src-server`;
const SERVER_WRITE_KEY = `${PREFIX}server-key`;
const SERVER_SECRET = `${PREFIX}server-secret`;
const DOMAIN = 'demo-shop.example.test';
const META_DESTINATION_ID = `${PREFIX}dest-meta`;
const GOOGLE_DESTINATION_ID = `${PREFIX}dest-gads`;
const GOOGLE_CUSTOMER_ID = '1234567890';

// ---------------------------------------------------------------------------
// Deterministic randomness
// ---------------------------------------------------------------------------

let prngState = Number(process.env.CDP_SEED || 42) >>> 0;
function rand(): number {
  prngState = (prngState + 0x6d2b79f5) >>> 0;
  let t = prngState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const chance = (p: number) => rand() < p;
const int = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));
function pick<T>(items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)];
}
function weighted<T>(entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = rand() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
}
function seededUuid(): string {
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) bytes[i] = Math.floor(rand() * 256);
  return uuidv4({ random: bytes });
}
const ALNUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
function token(length: number, alphabet = ALNUM): string {
  let out = '';
  for (let i = 0; i < length; i++) out += alphabet[Math.floor(rand() * alphabet.length)];
  return out;
}
const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

// ---------------------------------------------------------------------------
// Reference data (values line up with the FilterDrawer dropdowns)
// ---------------------------------------------------------------------------

interface GeoEntry { code: string; weight: number; ip: string; dial: string; regions: Record<string, string[]> }
const GEO: GeoEntry[] = [
  { code: 'IN', weight: 50, ip: '49.36', dial: '+91', regions: {
    Rajasthan: ['Jaipur', 'Jodhpur', 'Udaipur', 'Ajmer', 'Kota'], Maharashtra: ['Mumbai', 'Pune', 'Nagpur'],
    Delhi: ['New Delhi', 'Dwarka'], Gujarat: ['Ahmedabad', 'Surat', 'Vadodara'], Karnataka: ['Bengaluru', 'Mysuru'],
    'Tamil Nadu': ['Chennai', 'Coimbatore'], 'West Bengal': ['Kolkata'], 'Uttar Pradesh': ['Lucknow', 'Noida'],
  } },
  { code: 'US', weight: 18, ip: '24.48', dial: '+1', regions: {
    California: ['Los Angeles', 'San Francisco'], 'New York': ['New York', 'Buffalo'], Texas: ['Austin', 'Houston'],
    Florida: ['Miami', 'Orlando'], Illinois: ['Chicago'],
  } },
  { code: 'GB', weight: 8, ip: '81.2', dial: '+44', regions: { England: ['London', 'Manchester'], Scotland: ['Edinburgh', 'Glasgow'], Wales: ['Cardiff'] } },
  { code: 'CA', weight: 5, ip: '99.224', dial: '+1', regions: { Ontario: ['Toronto', 'Ottawa'], 'British Columbia': ['Vancouver'] } },
  { code: 'AU', weight: 5, ip: '1.120', dial: '+61', regions: { 'New South Wales': ['Sydney'], Victoria: ['Melbourne'] } },
  { code: 'AE', weight: 5, ip: '5.30', dial: '+971', regions: { Dubai: ['Dubai'], 'Abu Dhabi': ['Abu Dhabi'] } },
  { code: 'DE', weight: 4, ip: '91.0', dial: '+49', regions: { Berlin: ['Berlin'], Bavaria: ['Munich'] } },
  { code: 'SG', weight: 5, ip: '116.86', dial: '+65', regions: { Singapore: ['Singapore'] } },
];

interface DeviceProfile {
  type: 'desktop' | 'mobile' | 'tablet';
  os: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  userAgent: string;
  screen: { width: number; height: number };
}

function makeDevice(forceType?: DeviceProfile['type']): DeviceProfile {
  const type = forceType || weighted([['mobile', 48], ['desktop', 45], ['tablet', 7]] as const);
  const chromeVersion = String(int(128, 131));
  const chrome = `AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0`;
  if (type === 'desktop') {
    const os = weighted([['Windows', 60], ['macOS', 30], ['Linux', 7], ['ChromeOS', 3]] as const);
    const screen = pick([{ width: 1920, height: 1080 }, { width: 1536, height: 864 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 }]);
    if (os === 'Windows') {
      const browser = weighted([['Chrome', 62], ['Edge', 24], ['Firefox', 10], ['Opera', 4]] as const);
      const base = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
      const firefoxVersion = String(int(130, 133));
      const userAgent = browser === 'Firefox'
        ? `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}.0) Gecko/20100101 Firefox/${firefoxVersion}.0`
        : `${base} ${chrome} Safari/537.36${browser === 'Edge' ? ` Edg/${chromeVersion}.0.0.0` : browser === 'Opera' ? ' OPR/114.0.0.0' : ''}`;
      return { type, os, osVersion: '10', browser, browserVersion: browser === 'Firefox' ? firefoxVersion : chromeVersion, userAgent, screen };
    }
    if (os === 'macOS') {
      const browser = weighted([['Chrome', 50], ['Safari', 45], ['Firefox', 5]] as const);
      const userAgent = browser === 'Safari'
        ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15'
        : browser === 'Firefox'
          ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:132.0) Gecko/20100101 Firefox/132.0'
          : `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ${chrome} Safari/537.36`;
      return { type, os, osVersion: '10.15.7', browser, browserVersion: browser === 'Safari' ? '18.1' : browser === 'Firefox' ? '132' : chromeVersion, userAgent, screen };
    }
    if (os === 'Linux') {
      const browser = weighted([['Chrome', 60], ['Firefox', 40]] as const);
      const userAgent = browser === 'Firefox'
        ? 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0'
        : `Mozilla/5.0 (X11; Linux x86_64) ${chrome} Safari/537.36`;
      return { type, os, osVersion: '', browser, browserVersion: browser === 'Firefox' ? '132' : chromeVersion, userAgent, screen };
    }
    return { type, os, osVersion: '', browser: 'Chrome', browserVersion: chromeVersion, userAgent: `Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) ${chrome} Safari/537.36`, screen };
  }

  const os = type === 'tablet'
    ? weighted([['iOS', 60], ['Android', 40]] as const)
    : weighted([['Android', 65], ['iOS', 35]] as const);
  const screen = type === 'tablet'
    ? pick([{ width: 820, height: 1180 }, { width: 800, height: 1280 }])
    : pick([{ width: 390, height: 844 }, { width: 412, height: 915 }, { width: 360, height: 800 }, { width: 393, height: 852 }]);
  if (os === 'iOS') {
    const browser = weighted([['Safari', 85], ['Chrome', 15]] as const);
    const device = type === 'tablet' ? 'iPad; CPU OS 18_1 like Mac OS X' : 'iPhone; CPU iPhone OS 18_1 like Mac OS X';
    const userAgent = browser === 'Safari'
      ? `Mozilla/5.0 (${device}) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1`
      : `Mozilla/5.0 (${device}) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/${chromeVersion}.0.0.0 Mobile/15E148 Safari/604.1`;
    return { type, os, osVersion: '18.1', browser, browserVersion: browser === 'Safari' ? '18.1' : chromeVersion, userAgent, screen };
  }
  const browser = weighted([['Chrome', 75], ['Samsung Internet', 25]] as const);
  const androidVersion = String(int(12, 15));
  const userAgent = browser === 'Samsung Internet'
    ? `Mozilla/5.0 (Linux; Android ${androidVersion}; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 ${type === 'tablet' ? '' : 'Mobile '}Safari/537.36`
    : `Mozilla/5.0 (Linux; Android ${androidVersion}; K) ${chrome} ${type === 'tablet' ? '' : 'Mobile '}Safari/537.36`;
  return { type, os, osVersion: androidVersion, browser, browserVersion: browser === 'Samsung Internet' ? '26.0' : chromeVersion, userAgent, screen };
}

type ChannelKey = 'facebook' | 'google_cpc' | 'instagram' | 'google_organic' | 'newsletter' | 'direct' | 'referral';
const CHANNEL_WEIGHTS: [ChannelKey, number][] = [
  ['facebook', 26], ['google_cpc', 22], ['instagram', 10], ['google_organic', 14],
  ['newsletter', 8], ['direct', 15], ['referral', 5],
];
const CAMPAIGNS: Record<string, string[]> = {
  facebook: ['Diwali_Sale_2026', 'Lookalike_Purchasers_1pct', 'Brand_Awareness_Q4', 'Retargeting_Cart_Abandoners'],
  google_cpc: ['Search_Brand', 'Search_Generic_Shoes', 'PMax_All_Products', 'Shopping_Best_Sellers'],
  instagram: ['Reels_Influencer_Collab', 'Stories_New_Arrivals'],
  newsletter: ['Weekly_Digest', 'Festive_Offers'],
};
const ADS: Record<string, string[]> = {
  facebook: ['Carousel_Bestsellers', 'Video_15s_Unboxing', 'Static_Discount_20'],
  google_cpc: ['RSA_Headline_A', 'RSA_Headline_B', 'Shopping_Feed'],
  instagram: ['Reel_Creator_01', 'Story_Swipe_Up'],
};
const SEARCH_TERMS = ['running shoes', 'buy sneakers online', 'demo shop', 'leather wallet men', 'yoga mat'];

interface Touch {
  utm: Record<string, string>;
  clickIds: Record<string, string>;
  referrer: string;
  landing: 'product' | 'home' | 'blog' | 'offer';
}

function makeTouch(channel: ChannelKey, device: DeviceProfile, campaignOverride?: string): Touch {
  const iosSafari = device.os === 'iOS';
  switch (channel) {
    case 'facebook':
    case 'instagram': {
      const utm = {
        source: channel, medium: 'paid_social',
        campaign: campaignOverride || pick(CAMPAIGNS[channel]), content: pick(ADS[channel]),
      };
      return {
        utm,
        clickIds: { fbclid: `IwAR${token(54)}` },
        referrer: channel === 'facebook' ? 'https://m.facebook.com/' : 'https://l.instagram.com/',
        landing: utm.campaign === 'Diwali_Sale_2026' ? 'offer' : 'product',
      };
    }
    case 'google_cpc': {
      const clickField = iosSafari ? weighted([['gclid', 50], ['wbraid', 35], ['gbraid', 15]] as const) : 'gclid';
      const clickValue = clickField === 'gclid' ? `Cj0KCQiA${token(80, ALNUM + '-_')}` : `${token(4)}${token(60, ALNUM + '-_')}`;
      return {
        utm: { source: 'google', medium: 'cpc', campaign: pick(CAMPAIGNS.google_cpc), content: pick(ADS.google_cpc), term: pick(SEARCH_TERMS) },
        clickIds: { [clickField]: clickValue },
        referrer: 'https://www.google.com/',
        landing: 'product',
      };
    }
    case 'newsletter':
      return { utm: { source: 'newsletter', medium: 'email', campaign: pick(CAMPAIGNS.newsletter) }, clickIds: {}, referrer: '', landing: 'offer' };
    case 'google_organic':
      return { utm: {}, clickIds: {}, referrer: 'https://www.google.com/', landing: chance(0.6) ? 'blog' : 'product' };
    case 'referral':
      return {
        utm: { source: pick(['partner_blog', 'deals_forum', 'youtube']), medium: 'referral', campaign: 'affiliate_program' },
        clickIds: {}, referrer: pick(['https://partnerblog.example.org/', 'https://dealsforum.example.net/', 'https://www.youtube.com/']),
        landing: 'product',
      };
    default:
      return { utm: {}, clickIds: {}, referrer: '', landing: 'home' };
  }
}

interface Product { id: string; name: string; slug: string; price: number; category: string }
const PRODUCTS: Product[] = [
  { id: 'SKU-1001', name: 'Classic Running Shoes', slug: 'classic-running-shoes', price: 3499, category: 'Footwear' },
  { id: 'SKU-1002', name: 'Trail Runner Pro', slug: 'trail-runner-pro', price: 5999, category: 'Footwear' },
  { id: 'SKU-1003', name: 'Everyday Sneakers', slug: 'everyday-sneakers', price: 2499, category: 'Footwear' },
  { id: 'SKU-2001', name: 'Leather Wallet', slug: 'leather-wallet', price: 1299, category: 'Accessories' },
  { id: 'SKU-2002', name: 'Canvas Backpack', slug: 'canvas-backpack', price: 2799, category: 'Bags' },
  { id: 'SKU-2003', name: 'Travel Duffel Bag', slug: 'travel-duffel-bag', price: 4499, category: 'Bags' },
  { id: 'SKU-3001', name: 'Cotton Crew T-Shirt', slug: 'cotton-crew-t-shirt', price: 799, category: 'Apparel' },
  { id: 'SKU-3002', name: 'Slim Fit Chinos', slug: 'slim-fit-chinos', price: 1999, category: 'Apparel' },
  { id: 'SKU-3003', name: 'Hooded Sweatshirt', slug: 'hooded-sweatshirt', price: 2299, category: 'Apparel' },
  { id: 'SKU-4001', name: 'Yoga Mat', slug: 'yoga-mat', price: 1499, category: 'Fitness' },
  { id: 'SKU-4002', name: 'Smart Fitness Band', slug: 'smart-fitness-band', price: 3999, category: 'Fitness' },
  { id: 'SKU-5001', name: 'Insulated Water Bottle', slug: 'insulated-water-bottle', price: 899, category: 'Accessories' },
];
const BLOG_POSTS = ['how-to-choose-running-shoes', 'festive-gift-guide-2026', 'care-guide-leather', 'home-workout-essentials'];
const FIRST_NAMES = ['Aarav', 'Vivaan', 'Aditya', 'Ananya', 'Diya', 'Isha', 'Kabir', 'Meera', 'Rohan', 'Saanvi', 'Arjun', 'Priya',
  'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Lucas', 'Mia', 'Ethan', 'Sophia', 'Omar', 'Layla', 'Hannah', 'Felix', 'Chloe'];
const LAST_NAMES = ['Sharma', 'Patel', 'Gupta', 'Singh', 'Mehta', 'Iyer', 'Reddy', 'Jain', 'Kapoor', 'Nair',
  'Smith', 'Johnson', 'Brown', 'Taylor', 'Wilson', 'Martin', 'Khan', 'Müller', 'Tan', 'Lee'];
// Hour-of-day weights in the workspace timezone: lunchtime and evening peaks.
const HOUR_WEIGHTS: [number, number][] = [
  [0, 2], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 2], [7, 3], [8, 4], [9, 5], [10, 6], [11, 7],
  [12, 8], [13, 7], [14, 6], [15, 5], [16, 5], [17, 6], [18, 7], [19, 9], [20, 10], [21, 10], [22, 7], [23, 4],
];

function tzOffsetMs(timeZone: string): number {
  try {
    const label = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
      .formatToParts(new Date()).find(part => part.type === 'timeZoneName')?.value || 'GMT';
    const match = label.match(/GMT([+-])(\d{2}):?(\d{2})?/);
    if (!match) return 0;
    return (match[1] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3] || 0)) * 60_000;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// People, devices and the events they send
// ---------------------------------------------------------------------------
//
// The seed writes RAW EVENTS ONLY, shaped like the pixel / identify() would send them.
// Profiles, identities and merges are then built by the real identity resolution
// (rerunIdentityResolution), and verifyResolution() checks the result against the
// ground truth kept in each event's `seed_person` field.

type Doc = Record<string, unknown>;

interface SeedContext {
  workspaceId: string;
  webSourceId: string;
  currency: string;
  tzOffset: number;
  now: number;
  sink: (collection: 'events' | 'deliveries', doc: Doc) => Promise<void>;
}

interface Device {
  anonymousId: string;
  profile: DeviceProfile;
  fbp: string;
  visitCount: number;
  firstVisitAt: number | null;
  currentVisitAt: number | null;
  clickIds: Record<string, string>;
  firstTouch: Record<string, string> | null;
  lastTouch: Record<string, string> | null;
  // A browser shared by two account holders: every session there starts with a login.
  shared: boolean;
  fixedIp: string | null;
}

interface Person {
  key: string;
  n: number;
  firstName: string;
  lastName: string;
  geo: GeoEntry;
  region: string;
  city: string;
  homeIp: string;
  email: string;
  phoneNational: string | null;
  userId: string | null;
  consentAds: boolean;
  intent: number;
  identified: boolean;
  devices: Device[];
}

interface Stats {
  events: number;
  byName: Record<string, number>;
  bySource: Record<string, number>;
  people: number;
  identifiedPeople: number;
  multiDevicePeople: number;
  officePeople: number;
  sharedBrowsers: number;
  revenue: number;
  orders: number;
  deliveries: Record<string, number>;
  eventsByWeek: number[];
}
const stats: Stats = {
  events: 0, byName: {}, bySource: {}, people: 0, identifiedPeople: 0, multiDevicePeople: 0, officePeople: 0,
  sharedBrowsers: 0, revenue: 0, orders: 0, deliveries: {}, eventsByWeek: [],
};

const META_MAPPINGS: Record<string, string> = {
  Purchase: 'Purchase', AddToCart: 'AddToCart', InitiateCheckout: 'InitiateCheckout', Lead: 'Lead', ViewContent: 'ViewContent',
};
const GOOGLE_MAPPINGS: Record<string, string> = {
  Purchase: `customers/${GOOGLE_CUSTOMER_ID}/conversionActions/111111111`,
  Lead: `customers/${GOOGLE_CUSTOMER_ID}/conversionActions/222222222`,
};
const META_ERRORS = [
  '(#100) Invalid parameter: event_time is too far in the past',
  'Error validating access token: Session has expired',
  'Request to graph.facebook.com timed out after 10000ms',
];
const GOOGLE_ERRORS = [
  'partial_failure: The click associated with the given identifier could not be found (UNPARSEABLE_GCLID)',
  'partial_failure: The conversion action specified is not enabled (CONVERSION_ACTION_NOT_ENABLED)',
  'Request had invalid authentication credentials (UNAUTHENTICATED)',
];
const STORE_PLATFORM = 'woocommerce';

let eventCounter = 0;
let deliveryCounter = 0;
let orderCounter = 100_000;

function makeDeviceRecord(profile: DeviceProfile, now: number, fixedIp: string | null = null): Device {
  return {
    anonymousId: seededUuid(), profile, fbp: `fb.1.${now - int(1, DAYS) * DAY_MS}.${int(1_000_000_000, 2_147_483_647)}`,
    visitCount: 0, firstVisitAt: null, currentVisitAt: null, clickIds: {}, firstTouch: null, lastTouch: null,
    shared: false, fixedIp,
  };
}

/** The same address the way people actually type it into forms. */
function emailVariant(email: string): string {
  const [local, domain] = email.split('@');
  return weighted([
    [email, 55],
    [`${local[0].toUpperCase()}${local.slice(1)}@${domain[0].toUpperCase()}${domain.slice(1)}`, 20],
    [` ${email} `, 10],
    [email.toUpperCase(), 10],
    [`${email} `, 5],
  ] as const);
}

function phoneVariant(person: Person): string | null {
  const n = person.phoneNational;
  if (!n) return null;
  if (person.geo.code === 'IN') {
    return weighted([
      [n, 30], [`+91 ${n.slice(0, 5)} ${n.slice(5)}`, 25], [`+91${n}`, 15], [`0${n.slice(0, 5)} ${n.slice(5)}`, 15], [`91-${n.slice(0, 5)}-${n.slice(5)}`, 15],
    ] as const);
  }
  // Workspace default country is IN, so foreign numbers only resolve when written internationally.
  return weighted([[`${person.geo.dial}${n}`, 50], [`${person.geo.dial} ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`, 30], [`00${person.geo.dial.slice(1)}${n}`, 20]] as const);
}

function makePerson(n: number, key = `person-${n}`, overrides: Partial<Person> = {}): Person {
  const geo = overrides.geo || weighted(GEO.map(entry => [entry, entry.weight] as const));
  const region = pick(Object.keys(geo.regions));
  const firstName = pick(FIRST_NAMES);
  const lastName = pick(LAST_NAMES);
  // Unique per person (last 9 digits = n) so two people never share a number by accident.
  const phone = chance(0.7) ? `${int(6, 8)}${String(n).padStart(9, '0')}` : null;
  return {
    key, n, firstName, lastName, geo, region, city: pick(geo.regions[region]),
    homeIp: `${geo.ip}.${int(0, 249)}.${int(1, 254)}`,
    email: `${firstName}.${lastName}.${n}@example.test`.toLowerCase().normalize('NFKD').replace(/[^\x00-\x7f]/g, ''),
    phoneNational: phone, userId: null, consentAds: chance(0.9), intent: rand(), identified: false, devices: [],
    ...overrides,
  };
}

async function emitDeliveries(ctx: SeedContext, event: Doc, person: Person) {
  if (!person.consentAds || event.event_type === 'identify') return;
  const email = person.identified ? person.email : null;
  const name = String(event.event_name);
  const timestamp = (event.timestamp as Date).getTime();
  const clickIds = event.click_ids as Record<string, string>;
  const targets: { destinationId: string; type: 'meta_capi' | 'google_ads'; target: string }[] = [];
  if (META_MAPPINGS[name]) targets.push({ destinationId: META_DESTINATION_ID, type: 'meta_capi', target: META_MAPPINGS[name] });
  if (GOOGLE_MAPPINGS[name]) targets.push({ destinationId: GOOGLE_DESTINATION_ID, type: 'google_ads', target: GOOGLE_MAPPINGS[name] });

  for (const target of targets) {
    let status: 'success' | 'failed' | 'skipped';
    let error: string | null = null;
    let attempts = 1;
    let response: Doc | null = null;
    const hasClick = !!(clickIds.gclid || clickIds.gbraid || clickIds.wbraid);
    const request: Doc = target.type === 'meta_capi'
      ? {
        event_name: target.target, event_time: Math.floor(timestamp / 1000), event_id: event.event_id, action_source: 'website',
        user_data: { ...(email ? { em: [sha256(email)] } : {}), fbp: (event.context as Doc as { cookies: Doc }).cookies._fbp },
      }
      : {
        conversion_action: target.target, order_id: (event.properties as Doc).order_id || null,
        ...(clickIds.gclid ? { gclid: clickIds.gclid } : clickIds.gbraid ? { gbraid: clickIds.gbraid } : clickIds.wbraid ? { wbraid: clickIds.wbraid } : {}),
        user_identifiers: email ? [{ hashed_email: sha256(email) }] : [],
      };

    if (target.type === 'google_ads' && !hasClick && !email) {
      status = 'skipped';
      attempts = 0;
      error = 'No gclid/gbraid/wbraid within 90 days and no user identifiers';
    } else {
      const roll = rand();
      if (roll < 0.035) {
        status = 'failed';
        attempts = 5;
        error = pick(target.type === 'meta_capi' ? META_ERRORS : GOOGLE_ERRORS);
        response = { error: { message: error } };
      } else {
        status = 'success';
        attempts = roll < 0.06 ? int(2, 3) : 1;
        response = target.type === 'meta_capi'
          ? { events_received: 1, fbtrace_id: `A${token(22)}`, messages: [] }
          : { results: [{ conversion_action: target.target }], partial_failure_error: null };
      }
    }

    const createdAt = new Date(timestamp + int(500, 3000));
    const sentAt = status === 'skipped' ? null : new Date(createdAt.getTime() + (attempts - 1) * 30_000 + int(200, 4000));
    stats.deliveries[`${target.type}:${status}`] = (stats.deliveries[`${target.type}:${status}`] || 0) + 1;
    await ctx.sink('deliveries', {
      _id: `${PREFIX}dlv-${deliveryCounter++}`,
      workspace_id: ctx.workspaceId,
      event_id: event.event_id,
      destination_id: target.destinationId,
      destination_type: target.type,
      mapping_id: `${PREFIX}map-${target.type}-${name}`,
      event_name: name,
      target_event: target.target,
      status, request, response, attempts, error,
      next_attempt_at: null,
      dead_letter: status === 'failed',
      sent_at: sentAt,
      created_at: createdAt,
      updated_at: sentAt || createdAt,
    });
  }
}

interface EmitOptions {
  properties?: Doc;
  page?: { path: string; title: string };
  server?: boolean;
  // Explicit user_id for this event (login / signup). Otherwise the session's.
  userId?: string | null;
  captureSource?: string;
}

/** One browsing session on one device: owns the clock and pixel-shaped event building. */
class Session {
  t: number;
  readonly id = seededUuid();
  userId: string | null = null;
  private isLanding = true;
  private previousUrl: string;
  private readonly touch: Touch;
  private readonly ip: string;

  constructor(private ctx: SeedContext, readonly person: Person, readonly device: Device, touch: Touch, start: number) {
    this.t = start;
    this.touch = touch;
    this.previousUrl = touch.referrer;
    this.ip = device.fixedIp || person.homeIp;
    device.visitCount++;
    if (!device.firstVisitAt) device.firstVisitAt = start;
    const previousVisit = device.currentVisitAt;
    device.currentVisitAt = start;
    this.visit = {
      visit_count: device.visitCount,
      is_returning: device.visitCount > 1,
      first_visit_at: new Date(device.firstVisitAt).toISOString(),
      current_visit_at: new Date(start).toISOString(),
      last_visit_at: previousVisit ? new Date(previousVisit).toISOString() : null,
      days_since_last_visit: previousVisit ? Math.floor((start - previousVisit) / DAY_MS) : null,
    };
    // Same rules as the pixel: remember click ids 90 days, last touch only for campaign traffic.
    if (Object.keys(touch.clickIds).length) {
      for (const [key, value] of Object.entries(touch.clickIds)) device.clickIds[key] = value;
    }
    const prefixed: Record<string, string> = {};
    for (const [key, value] of Object.entries(touch.utm)) prefixed[`utm_${key}`] = value;
    if (Object.keys(prefixed).length || Object.keys(touch.clickIds).length) {
      const record = { ...prefixed, ...touch.clickIds, referrer: touch.referrer, at: new Date(start).toISOString() };
      device.firstTouch = device.firstTouch || record;
      device.lastTouch = record;
    }
  }

  private readonly visit: Doc;

  async emit(name: string, options: EmitOptions = {}): Promise<Doc | null> {
    this.t += int(4, 75) * 1000;
    if (this.t > this.ctx.now) return null;
    const { person, device, touch } = this;
    const page = options.page;
    const server = !!options.server;
    if (options.userId !== undefined) this.userId = options.userId;

    const url = page ? `https://${DOMAIN}${page.path}` : null;
    const landingParams: Record<string, string> = {};
    if (this.isLanding && page) {
      for (const [key, value] of Object.entries(touch.utm)) landingParams[`utm_${key}`] = value;
      Object.assign(landingParams, touch.clickIds);
    }
    const fullUrl = url && Object.keys(landingParams).length ? `${url}?${new URLSearchParams(landingParams)}` : url;
    // Last non-direct touch, exactly as the processor attributes live pixel events.
    const touchUtm: Record<string, string> = Object.keys(touch.utm).length
      ? touch.utm
      : Object.fromEntries(Object.entries(device.lastTouch || {}).filter(([key]) => key.startsWith('utm_')).map(([key, value]) => [key.slice(4), value]));
    const utm: Record<string, string> = { ...touchUtm };
    for (const [key, value] of Object.entries(touchUtm)) utm[`utm_${key}`] = value;

    const timestamp = new Date(this.t);
    const receivedAt = new Date(this.t + int(40, 900));
    const p = device.profile;
    const properties = { ...(options.properties || {}) };
    if (options.captureSource) Object.assign(properties, { capture_source: options.captureSource, store_platform: STORE_PLATFORM });
    const event: Doc = {
      _id: `${PREFIX}evt-${eventCounter++}`,
      workspace_id: this.ctx.workspaceId,
      source_id: server ? SERVER_SOURCE_ID : this.ctx.webSourceId,
      profile_id: null,
      anonymous_id: device.anonymousId,
      user_id: this.userId,
      processed_at: new Date(receivedAt.getTime() + int(20, 400)),
      website_id: WEBSITE_ID,
      event_name: name,
      event_type: name === 'PageView' ? 'page' : name === 'identify' ? 'identify' : 'track',
      event_id: seededUuid(),
      session_id: this.id,
      visitor_id: device.anonymousId,
      payload: { attribution: Object.fromEntries(Object.entries(utm).filter(([key]) => key.startsWith('utm_'))) },
      properties,
      device_info: server ? null : {
        user_agent: p.userAgent, device_type: p.type, os_name: p.os, os_version: p.osVersion,
        language: person.geo.code === 'IN' ? 'en-IN' : person.geo.code === 'DE' ? 'de-DE' : 'en-US',
        browser: { name: p.browser, version: p.browserVersion },
        display: { screen_width: p.screen.width, screen_height: p.screen.height },
      },
      page_info: page && !server ? { url: fullUrl, page_url: fullUrl, path: page.path, page_path: page.path, title: page.title, page_title: page.title, referrer: this.previousUrl } : null,
      performance_info: null,
      network_info: null,
      location_info: server ? null : { ip_address: this.ip, country: person.geo.code, region: person.region, city: person.city },
      url_params: Object.keys(landingParams).length ? landingParams : null,
      utm,
      click_ids: { ...device.clickIds },
      ip: server ? null : this.ip,
      country: person.geo.code,
      device: server ? null : { type: p.type, device_type: p.type, os: p.os, browser: p.browser, user_agent: p.userAgent },
      browser: server ? null : { name: p.browser, version: p.browserVersion, os: p.os, os_version: p.osVersion, device_type: p.type },
      context: server
        ? { library: { name: 'server-api', version: '1.0.0' }, consent: { ads: person.consentAds, analytics: true } }
        : {
          library: { name: 'cdp.js', version: '3.0.0' },
          cookies: { _fbp: device.fbp, _fbc: device.clickIds.fbclid ? `fb.1.${this.t}.${device.clickIds.fbclid}` : '' },
          click_ids: { ...device.clickIds },
          first_touch: device.firstTouch,
          last_touch: device.lastTouch,
          visit: this.visit,
          website_type: 'ecommerce',
          store_platform: STORE_PLATFORM,
          consent: { ads: person.consentAds, analytics: true },
        },
      timestamp,
      received_at: receivedAt,
      created_at: receivedAt,
      // Ground truth for verifyResolution(); never used by identity resolution.
      seed_person: person.key,
    };
    if (page) {
      this.previousUrl = fullUrl || this.previousUrl;
      this.isLanding = false;
    }

    stats.events++;
    stats.byName[name] = (stats.byName[name] || 0) + 1;
    stats.bySource[server ? 'server' : 'web'] = (stats.bySource[server ? 'server' : 'web'] || 0) + 1;
    const week = Math.floor((this.ctx.now - this.t) / (7 * DAY_MS));
    stats.eventsByWeek[week] = (stats.eventsByWeek[week] || 0) + 1;
    await this.ctx.sink('events', event);
    await emitDeliveries(this.ctx, event, person);
    return event;
  }

  /** identify() with traits as typed by the visitor (email/phone spelling varies). */
  async identify(method: string, extraTraits: Doc = {}) {
    const person = this.person;
    const traits: Doc = { email: emailVariant(person.email), first_name: person.firstName, last_name: person.lastName, ...extraTraits };
    const phone = chance(0.6) ? phoneVariant(person) : null;
    if (phone) traits.phone = phone;
    if (!person.identified) stats.identifiedPeople++;
    person.identified = true;
    await this.emit('identify', { properties: { method, traits } });
  }

  async login() {
    const person = this.person;
    this.userId = person.userId;
    if (!person.identified) stats.identifiedPeople++;
    person.identified = true;
    await this.emit('Login', { userId: person.userId, properties: { method: 'email', traits: { email: emailVariant(person.email) } } });
  }
}

function sessionStart(ctx: SeedContext, approx: number): number {
  const localMidnight = Math.floor((approx + ctx.tzOffset) / DAY_MS) * DAY_MS - ctx.tzOffset;
  return localMidnight + weighted(HOUR_WEIGHTS) * HOUR_MS + Math.floor(rand() * HOUR_MS);
}

function landingFor(touch: Touch, product: Product) {
  return touch.landing === 'product'
    ? { path: `/products/${product.slug}`, title: `${product.name} | Demo Shop` }
    : touch.landing === 'blog'
      ? { path: `/blog/${pick(BLOG_POSTS)}`, title: 'Demo Shop Journal' }
      : touch.landing === 'offer'
        ? { path: '/offers/festive-sale', title: 'Festive Sale – Up to 40% off | Demo Shop' }
        : { path: '/', title: 'Demo Shop – Shoes, Bags & More' };
}

function ecomProps(currency: string, lines: { product: Product; quantity: number }[], extra: Doc = {}): Doc {
  const value = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
  return {
    value, currency, content_type: 'product',
    content_ids: lines.map(line => line.product.id),
    contents: lines.map(line => ({ id: line.product.id, name: line.product.name, price: line.product.price, quantity: line.quantity, category: line.product.category })),
    num_items: lines.reduce((sum, line) => sum + line.quantity, 0),
    product_id: lines[0]?.product.id, product_name: lines[0]?.product.name,
    ...extra,
  };
}

const captureSource = () => weighted([['datalayer', 70], ['woocommerce', 20], ['dom', 10]] as const);

/** A realistic shopping session: browse → cart → checkout → purchase, leads and sign-ups. */
async function shoppingSession(ctx: SeedContext, session: Session, sessionIndex: number) {
  const { person } = session;
  const product = pick(PRODUCTS);
  const touch = (session as unknown as { touch: Touch }).touch;
  if (session.device.shared) await session.login();
  await session.emit('PageView', { page: landingFor(touch, product) });
  if (!session.device.shared && person.userId && sessionIndex > 0 && chance(0.35)) await session.login();

  const viewed: Product[] = [];
  const browseDepth = int(1, 4) + (person.intent > 0.7 ? 2 : 0);
  for (let step = 0; step < browseDepth; step++) {
    const item = step === 0 && touch.landing === 'product' ? product : pick(PRODUCTS);
    if (step > 0 || touch.landing !== 'product') {
      await session.emit('PageView', { page: { path: `/products/${item.slug}`, title: `${item.name} | Demo Shop` } });
    }
    if (chance(0.85)) {
      viewed.push(item);
      await session.emit('ViewContent', { properties: ecomProps(ctx.currency, [{ product: item, quantity: 1 }], { price: item.price }), captureSource: captureSource() });
    }
    if (chance(0.25)) await session.emit('Click', { properties: { element: pick(['size_guide', 'add_to_wishlist', 'reviews_tab', 'whatsapp_chat']), product_id: item.id } });
  }

  const cart: { product: Product; quantity: number }[] = [];
  for (const item of viewed) {
    if (chance(0.12 + person.intent * 0.3)) {
      const line = { product: item, quantity: chance(0.85) ? 1 : 2 };
      cart.push(line);
      await session.emit('AddToCart', { properties: ecomProps(ctx.currency, [line]), captureSource: captureSource() });
    }
  }

  if (cart.length && chance(0.45 + person.intent * 0.25)) {
    await session.emit('PageView', { page: { path: '/checkout', title: 'Checkout | Demo Shop' } });
    await session.emit('InitiateCheckout', { properties: ecomProps(ctx.currency, cart), captureSource: captureSource() });
    if (chance(0.5 + person.intent * 0.3)) {
      // Checkout asks for contact details → identify (unless already logged in).
      if (!session.userId) await session.identify('checkout');
      const orderId = `ORD-${orderCounter++}`;
      const coupon = chance(0.2) ? pick(['DIWALI20', 'WELCOME10', 'FREESHIP']) : null;
      const subtotal = cart.reduce((sum, line) => sum + line.product.price * line.quantity, 0);
      const total = coupon === 'DIWALI20' ? Math.round(subtotal * 0.8) : coupon === 'WELCOME10' ? Math.round(subtotal * 0.9) : subtotal;
      const purchase = await session.emit('Purchase', {
        properties: ecomProps(ctx.currency, cart, {
          order_id: orderId, value: total, ...(coupon ? { coupon } : {}),
          // Order forms often carry the billing email too, spelled however the buyer typed it.
          ...(chance(0.4) ? { billing_email: emailVariant(person.email) } : {}),
        }),
        captureSource: captureSource(),
      });
      if (purchase) {
        stats.revenue += total;
        stats.orders++;
        await session.emit('PageView', { page: { path: `/checkout/order-received/${orderCounter}/`, title: 'Order confirmed | Demo Shop' } });
        if (chance(0.8)) {
          await session.emit('Payment', {
            server: true,
            properties: {
              order_id: orderId, value: total, currency: ctx.currency, customer_email: person.email,
              payment_method: weighted([['UPI', 45], ['Card', 35], ['NetBanking', 10], ['COD', 10]] as const), status: 'captured',
            },
          });
        }
      }
    }
  }

  if (chance(0.04 + (touch.landing === 'blog' ? 0.06 : 0))) {
    // Lead form: contact details only in form fields (no identify call), often phone-only.
    await session.emit('PageView', { page: { path: '/contact', title: 'Contact us | Demo Shop' } });
    const phoneOnly = person.geo.code === 'IN' && !!person.phoneNational && chance(0.5);
    const form: Doc = { name: `${person.firstName} ${person.lastName}` };
    if (!phoneOnly) form.email = emailVariant(person.email);
    const phone = phoneVariant(person);
    if (phone) form.phone = phone;
    if (!person.identified && (form.email || form.phone)) stats.identifiedPeople++;
    person.identified = person.identified || !!(form.email || form.phone);
    await session.emit('Lead', { properties: { form_name: pick(['Contact Sales', 'Bulk Order Enquiry', 'Store Visit Request']), value: 500, currency: ctx.currency, form } });
  } else if (!person.userId && chance(0.06)) {
    await session.emit('PageView', { page: { path: '/signup', title: 'Create account | Demo Shop' } });
    person.userId = `usr_${100_000 + person.n}`;
    session.userId = person.userId;
    await session.identify('signup');
    await session.emit('SignUp', { userId: person.userId, properties: { method: pick(['email', 'google']) } });
  }
}

/** Random shopper: 60 days of sessions across one or two devices (or an office PC). */
async function generatePerson(ctx: SeedContext, person: Person, firstDaysAgo: number) {
  const channel: ChannelKey = firstDaysAgo >= 18 && firstDaysAgo <= 24 && chance(0.4) ? 'facebook' : weighted(CHANNEL_WEIGHTS);
  let start = ctx.now - firstDaysAgo * DAY_MS;
  for (let sessionIndex = 0; start < ctx.now; sessionIndex++) {
    const s = sessionStart(ctx, start);
    if (s > ctx.now - 60_000) break;
    // Second devices join later; the first visit there is often a login / contact form.
    const deviceIndex = person.devices.length > 1 && sessionIndex > 0 && chance(0.4) ? 1 : 0;
    const device = person.devices[deviceIndex];
    const firstOnDevice = device.visitCount === 0;
    const touch = sessionIndex === 0
      ? makeTouch(channel, device.profile, channel === 'facebook' && firstDaysAgo >= 18 && firstDaysAgo <= 24 ? 'Diwali_Sale_2026' : undefined)
      : makeTouch(weighted([['direct', 40], [channel, 25], ['facebook', 20], ['newsletter', person.identified ? 15 : 0]] as const), device.profile,
        chance(0.5) ? 'Retargeting_Cart_Abandoners' : undefined);
    const session = new Session(ctx, person, device, touch, s);
    if (deviceIndex === 1 && firstOnDevice && person.identified && chance(0.8)) {
      // Cross-device link: this is what lets resolution merge the two browsers.
      if (person.userId) await session.login();
      else await session.identify('newsletter_signup');
    }
    await shoppingSession(ctx, session, sessionIndex);

    const returnChance = 0.45 + person.intent * 0.2 + (person.identified ? 0.1 : 0);
    if (!chance(Math.min(returnChance, 0.8))) break;
    start = session.t + (0.3 + -Math.log(1 - rand()) * (2 + rand() * 4)) * DAY_MS;
  }
}

// ---------------------------------------------------------------------------
// Scripted matching scenarios (verified after resolution)
// ---------------------------------------------------------------------------

const SCENARIOS = {
  ravi: 'scenario-ravi',
  priya: 'scenario-priya',
  meera: 'scenario-meera',
  office: ['scenario-office-anita', 'scenario-office-vikram', 'scenario-office-sara', 'scenario-office-anon-1', 'scenario-office-anon-2'],
  familyA: 'scenario-family-rahul',
  familyB: 'scenario-family-neha',
};
const INDIA = GEO.find(entry => entry.code === 'IN')!;
const daysAgo = (ctx: SeedContext, days: number, hour = 20) => {
  const midnight = Math.floor((ctx.now - days * DAY_MS + ctx.tzOffset) / DAY_MS) * DAY_MS - ctx.tzOffset;
  return midnight + hour * HOUR_MS;
};

async function generateScenarios(ctx: SeedContext) {
  const now = ctx.now;
  const products = (...ids: string[]) => ids.map(id => ({ product: PRODUCTS.find(item => item.id === id)!, quantity: 1 }));

  // 1. Ravi: anonymous on mobile (from a Facebook ad), identifies at checkout as "Ravi@Gmail.com ",
  //    browses anonymously on desktop, then logs in there as "ravi@gmail.com" → one person.
  const ravi = makePerson(900_001, SCENARIOS.ravi, { geo: INDIA, firstName: 'Ravi', lastName: 'Kumar', email: 'ravi@gmail.com', phoneNational: null, consentAds: true });
  const raviMobile = makeDeviceRecord(makeDevice('mobile'), now);
  const raviDesktop = makeDeviceRecord(makeDevice('desktop'), now);
  ravi.devices = [raviMobile, raviDesktop];
  let s = new Session(ctx, ravi, raviMobile, makeTouch('facebook', raviMobile.profile, 'Diwali_Sale_2026'), daysAgo(ctx, 20));
  await s.emit('PageView', { page: { path: '/products/classic-running-shoes', title: 'Classic Running Shoes | Demo Shop' } });
  await s.emit('ViewContent', { properties: ecomProps(ctx.currency, products('SKU-1001')), captureSource: 'datalayer' });
  s = new Session(ctx, ravi, raviMobile, makeTouch('direct', raviMobile.profile), daysAgo(ctx, 19));
  await s.emit('PageView', { page: { path: '/products/classic-running-shoes', title: 'Classic Running Shoes | Demo Shop' } });
  await s.emit('AddToCart', { properties: ecomProps(ctx.currency, products('SKU-1001')), captureSource: 'datalayer' });
  await s.emit('InitiateCheckout', { properties: ecomProps(ctx.currency, products('SKU-1001')), captureSource: 'datalayer' });
  await s.emit('identify', { properties: { method: 'checkout', traits: { email: 'Ravi@Gmail.com ', first_name: 'Ravi', last_name: 'Kumar' } } });
  await s.emit('Purchase', { properties: ecomProps(ctx.currency, products('SKU-1001'), { order_id: 'ORD-RAVI-1' }), captureSource: 'datalayer' });
  s = new Session(ctx, ravi, raviDesktop, makeTouch('google_organic', raviDesktop.profile), daysAgo(ctx, 14, 11));
  await s.emit('PageView', { page: { path: '/blog/how-to-choose-running-shoes', title: 'Demo Shop Journal' } });
  await s.emit('ViewContent', { properties: ecomProps(ctx.currency, products('SKU-1002')), captureSource: 'dom' });
  s = new Session(ctx, ravi, raviDesktop, makeTouch('newsletter', raviDesktop.profile), daysAgo(ctx, 10, 12));
  s.userId = 'usr_ravi';
  await s.emit('Login', { userId: 'usr_ravi', properties: { method: 'email', traits: { email: 'ravi@gmail.com' } } });
  await s.emit('AddToCart', { properties: ecomProps(ctx.currency, products('SKU-2002')), captureSource: 'woocommerce' });
  await s.emit('Purchase', { properties: ecomProps(ctx.currency, products('SKU-2002'), { order_id: 'ORD-RAVI-2' }), captureSource: 'woocommerce' });
  ravi.identified = true;

  // 2. Priya: lead form with phone "9876543210" on mobile; weeks later on a laptop she browses
  //    anonymously, then sends a WhatsApp form as "+91 98765 43210" → one person.
  const priya = makePerson(900_002, SCENARIOS.priya, { geo: INDIA, firstName: 'Priya', lastName: 'Shah', email: 'priya.shah@example.test', phoneNational: '9876543210', consentAds: true });
  const priyaMobile = makeDeviceRecord(makeDevice('mobile'), now);
  const priyaLaptop = makeDeviceRecord(makeDevice('desktop'), now);
  priya.devices = [priyaMobile, priyaLaptop];
  s = new Session(ctx, priya, priyaMobile, makeTouch('google_cpc', priyaMobile.profile), daysAgo(ctx, 30));
  await s.emit('PageView', { page: { path: '/contact', title: 'Contact us | Demo Shop' } });
  await s.emit('Lead', { properties: { form_name: 'Bulk Order Enquiry', value: 500, currency: ctx.currency, form: { name: 'Priya Shah', phone: '9876543210' } } });
  s = new Session(ctx, priya, priyaLaptop, makeTouch('direct', priyaLaptop.profile), daysAgo(ctx, 6, 15));
  await s.emit('PageView', { page: { path: '/', title: 'Demo Shop – Shoes, Bags & More' } });
  await s.emit('ViewContent', { properties: ecomProps(ctx.currency, products('SKU-4001')), captureSource: 'datalayer' });
  s = new Session(ctx, priya, priyaLaptop, makeTouch('direct', priyaLaptop.profile), daysAgo(ctx, 5, 16));
  await s.emit('PageView', { page: { path: '/contact', title: 'Contact us | Demo Shop' } });
  await s.emit('Lead', { properties: { form_name: 'WhatsApp me', value: 500, currency: ctx.currency, fields: [{ name: 'Mobile', value: '+91 98765 43210' }] } });
  priya.identified = true;

  // 3. Meera: the same email typed four ways on three devices → one person.
  const meera = makePerson(900_003, SCENARIOS.meera, { geo: INDIA, firstName: 'Meera', lastName: 'Iyer', email: 'meera.iyer@gmail.com', phoneNational: null, consentAds: true });
  meera.devices = [makeDeviceRecord(makeDevice('mobile'), now), makeDeviceRecord(makeDevice('desktop'), now), makeDeviceRecord(makeDevice('tablet'), now)];
  const spellings = ['Meera.Iyer@Gmail.com', ' meera.iyer@gmail.com', 'MEERA.IYER@GMAIL.COM ', 'meera.iyer@gmail.com'];
  for (let i = 0; i < spellings.length; i++) {
    s = new Session(ctx, meera, meera.devices[i % 3], makeTouch('newsletter', meera.devices[i % 3].profile), daysAgo(ctx, 25 - i * 5));
    await s.emit('PageView', { page: { path: '/offers/festive-sale', title: 'Festive Sale | Demo Shop' } });
    await s.emit('identify', { properties: { method: 'newsletter', traits: { email: spellings[i], first_name: 'Meera' } } });
  }
  meera.identified = true;

  // 4. Office: five colleagues, same public IP, identical managed desktop build, different
  //    browsers (anonymous ids). Three give different emails, two stay anonymous → five people.
  const officeIp = '203.0.113.50';
  const officeBuild = makeDevice('desktop');
  const colleagues = [['Anita', 'anita@acme-corp.test'], ['Vikram', 'vikram@acme-corp.test'], ['Sara', 'sara@acme-corp.test'], ['Guest', null], ['Guest', null]] as const;
  for (let i = 0; i < colleagues.length; i++) {
    const [first, email] = colleagues[i];
    const colleague = makePerson(900_010 + i, SCENARIOS.office[i], { geo: INDIA, firstName: first, lastName: 'Acme', email: email || `office-anon-${i}@nowhere.test`, phoneNational: null });
    colleague.devices = [makeDeviceRecord(officeBuild, now, officeIp)];
    for (const day of [12, 8, 3]) {
      s = new Session(ctx, colleague, colleague.devices[0], makeTouch('direct', officeBuild), daysAgo(ctx, day, 10 + i));
      await s.emit('PageView', { page: { path: '/products/canvas-backpack', title: 'Canvas Backpack | Demo Shop' } });
      await s.emit('ViewContent', { properties: ecomProps(ctx.currency, products('SKU-2002')), captureSource: 'datalayer' });
      if (email && day === 8) await s.emit('identify', { properties: { method: 'newsletter', traits: { email, first_name: first } } });
    }
    colleague.identified = !!email;
  }
  stats.officePeople += colleagues.length;

  // 5. Family PC: Rahul and Neha both log in (different user_ids) on one shared browser.
  //    Must stay two people; an identity conflict is logged instead of a merge.
  const sharedBrowser = makeDeviceRecord(makeDevice('desktop'), now);
  sharedBrowser.shared = true;
  const rahul = makePerson(900_020, SCENARIOS.familyA, { geo: INDIA, firstName: 'Rahul', lastName: 'Verma', email: 'rahul.verma@example.test', userId: 'usr_rahul', phoneNational: null });
  const neha = makePerson(900_021, SCENARIOS.familyB, { geo: INDIA, firstName: 'Neha', lastName: 'Verma', email: 'neha.verma@example.test', userId: 'usr_neha', phoneNational: null });
  rahul.devices = [sharedBrowser];
  neha.devices = [sharedBrowser];
  for (const [person, day] of [[rahul, 15], [neha, 13], [rahul, 9], [neha, 4]] as const) {
    s = new Session(ctx, person, sharedBrowser, makeTouch('direct', sharedBrowser.profile), daysAgo(ctx, day));
    await s.login();
    await s.emit('PageView', { page: { path: '/products/yoga-mat', title: 'Yoga Mat | Demo Shop' } });
    await s.emit('AddToCart', { properties: ecomProps(ctx.currency, products('SKU-4001')), captureSource: 'datalayer' });
  }
  stats.sharedBrowsers++;
  stats.people += 3 + colleagues.length + 2;
}

// ---------------------------------------------------------------------------
// Database setup
// ---------------------------------------------------------------------------

function requireSafeSeedTarget() {
  // Connects only to DATABASE_URL_DEV (see src/database/index.ts); refuses production.
  requireDevDatabase();
  // A dev database on the production cluster shares its storage quota: ~100k events (~60 MB)
  // once pushed the free 512 MB tier over its limit and blocked production writes.
  const host = (uri: string | undefined) => {
    try { return uri ? new URL(uri).host : ''; } catch { return ''; }
  };
  if (host(process.env.DATABASE_URL_DEV) === host(process.env.MONGODB_URI) && process.env.CDP_SEED_ALLOW_SHARED_CLUSTER !== '1') {
    throw new Error(
      'DATABASE_URL_DEV is on the same cluster as production (MONGODB_URI). Seeding uses ~60 MB and can exhaust the '
      + "cluster's storage quota, which blocks production writes. Point DATABASE_URL_DEV at a separate cluster or a local "
      + 'MongoDB, run `npm run seed:verify` (in-memory), or set CDP_SEED_ALLOW_SHARED_CLUSTER=1 if you are sure there is room.'
    );
  }
  if (process.env.CDP_SEED_CONFIRM !== 'YES_SEED_FAKE_CDP_DATA') {
    throw new Error('Set CDP_SEED_CONFIRM=YES_SEED_FAKE_CDP_DATA to authorize this seed');
  }
}

async function resolveWorkspace(): Promise<{ workspaceId: string; ownerId: string; currency: string; timezone: string; login: string | null }> {
  const ownerEmail = process.env.CDP_SEED_OWNER_EMAIL?.trim().toLowerCase();
  if (ownerEmail) {
    const user = await User.findOne({ email: ownerEmail }).select('_id name').lean<{ _id: string; name: string }>();
    if (!user) throw new Error(`No user with email ${ownerEmail} in the dev database; register in the app first`);
    const workspace = await ensureWorkspaceForUser(String(user._id), user.name);
    await setUserWorkspaceId(String(user._id), workspace._id);
    await ensureWorkspaceMember(workspace._id, String(user._id), 'admin');
    return { workspaceId: workspace._id, ownerId: String(user._id), currency: workspace.currency || 'INR', timezone: workspace.timezone || 'UTC', login: null };
  }

  // No owner given: a verified demo login owns a fixed demo workspace.
  const password = process.env.CDP_SEED_DEMO_PASSWORD || `Demo-${crypto.randomBytes(6).toString('base64url')}`;
  await User.updateOne(
    { _id: DEFAULT_OWNER_ID },
    {
      $set: {
        name: 'Demo Admin', email: DEMO_LOGIN_EMAIL, password: await bcrypt.hash(password, 12), role: 'customer',
        workspace_id: DEFAULT_WORKSPACE_ID, email_verified: true, email_verified_at: new Date(), timezone: 'Asia/Kolkata', status: 'active',
      },
    },
    { upsert: true }
  );
  await Workspace.updateOne(
    { _id: DEFAULT_WORKSPACE_ID },
    { $set: { name: 'Demo Shop (seed)', timezone: 'Asia/Kolkata', currency: 'INR' }, $setOnInsert: { owner_user_id: DEFAULT_OWNER_ID } },
    { upsert: true }
  );
  await ensureWorkspaceMember(DEFAULT_WORKSPACE_ID, DEFAULT_OWNER_ID, 'admin');
  return { workspaceId: DEFAULT_WORKSPACE_ID, ownerId: DEFAULT_OWNER_ID, currency: 'INR', timezone: 'Asia/Kolkata', login: `${DEMO_LOGIN_EMAIL} / ${password}` };
}

async function clearPreviousSeed(workspaceId: string) {
  const seeded = { workspace_id: workspaceId, _id: { $regex: `^${PREFIX}` } };
  for (const model of [Event, Delivery, DestinationMapping, Destination, Segment] as mongoose.Model<any>[]) {
    await model.deleteMany(seeded);
  }
  // Rows written by the first version of this seed.
  await Event.deleteMany({ workspace_id: workspaceId, event_id: { $regex: `^${PREFIX}event-` } });
}

async function setupSourcesAndDestinations(workspaceId: string, ownerId: string) {
  await Website.findOneAndUpdate(
    { _id: WEBSITE_ID },
    {
      $set: {
        user_id: ownerId, workspace_id: workspaceId, domain: DOMAIN, name: 'Demo Shop',
        website_type: 'ecommerce', api_key: WEBSITE_KEY, status: 'active', timezone: 'Asia/Kolkata',
      },
      $setOnInsert: { _id: WEBSITE_ID },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  const webSource = await ensureWebsiteSource(workspaceId, { id: WEBSITE_ID, name: 'Demo Shop', domain: DOMAIN, api_key: WEBSITE_KEY });
  await Website.updateOne({ _id: WEBSITE_ID }, { $set: { source_id: webSource._id } });
  await Source.updateOne(
    { _id: SERVER_SOURCE_ID },
    {
      $set: {
        workspace_id: workspaceId, website_id: null, name: 'Demo Shop backend', type: 'server',
        write_key: SERVER_WRITE_KEY, secret_key_hash: sha256(SERVER_SECRET), allowed_domains: [], enabled: true,
      },
    },
    { upsert: true }
  );

  // Destinations are seeded disabled with no credentials so nothing is ever sent from seed data.
  const now = new Date();
  await Destination.collection.insertMany([
    { _id: META_DESTINATION_ID as any, workspace_id: workspaceId, type: 'meta_capi', name: 'Meta Pixel – Demo Shop', config: { pixel_id: '000000000000000', test_event_code: 'TEST12345' }, credentials_encrypted: null, enabled: false, test_mode: true, created_at: now, updated_at: now },
    { _id: GOOGLE_DESTINATION_ID as any, workspace_id: workspaceId, type: 'google_ads', name: 'Google Ads – Demo Shop', config: { customer_id: GOOGLE_CUSTOMER_ID, login_customer_id: null }, credentials_encrypted: null, enabled: false, test_mode: true, created_at: now, updated_at: now },
  ]);
  const mappings = [
    ...Object.entries(META_MAPPINGS).map(([source, target]) => ({ type: 'meta_capi', destination: META_DESTINATION_ID, source, target })),
    ...Object.entries(GOOGLE_MAPPINGS).map(([source, target]) => ({ type: 'google_ads', destination: GOOGLE_DESTINATION_ID, source, target })),
  ];
  await DestinationMapping.collection.insertMany(mappings.map(mapping => ({
    _id: `${PREFIX}map-${mapping.type}-${mapping.source}` as any,
    workspace_id: workspaceId, destination_id: mapping.destination, source_event: mapping.source, target_event: mapping.target,
    filter: {}, value_field: ['Purchase', 'AddToCart', 'InitiateCheckout', 'Lead'].includes(mapping.source) ? 'properties.value' : null,
    currency_field: 'properties.currency', custom_param_map: {}, enabled: true, created_at: now, updated_at: now,
  })));

  const segments = [
    { key: 'high-value', name: 'High-value purchasers (demo)', filter: {
      date_range: { preset: 'last_60_days' }, match: 'all',
      conditions: [{ field: 'user.did_event', op: 'eq', value: { name: 'Purchase', count_gte: 1, within_days: 60 } }, { field: 'user.revenue', op: 'gte', value: 5000 }],
    } },
    { key: 'cart-abandoners', name: 'Cart abandoners – 30 days (demo)', filter: {
      date_range: { preset: 'last_30_days' }, match: 'all',
      conditions: [
        { field: 'user.did_event', op: 'eq', value: { name: 'AddToCart', count_gte: 1, within_days: 30 } },
        { field: 'user.did_event', op: 'eq', value: { name: 'Purchase', count_gte: 0, count_lte: 0, within_days: 30 } },
      ],
    } },
    { key: 'facebook-india', name: 'Facebook-acquired, India (demo)', filter: {
      date_range: { preset: 'last_60_days' }, match: 'all',
      conditions: [{ field: 'user.first_utm.source', op: 'eq', value: 'facebook' }, { field: 'user.country', op: 'eq', value: 'IN' }],
    } },
  ];
  await Segment.collection.insertMany(segments.map(segment => ({
    _id: `${PREFIX}seg-${segment.key}` as any, workspace_id: workspaceId, name: segment.name, filter: segment.filter,
    created_by: ownerId, created_at: now, updated_at: now,
  })));

  return webSource._id as string;
}

// ---------------------------------------------------------------------------
// Verification against ground truth
// ---------------------------------------------------------------------------

async function verifyResolution(workspaceId: string): Promise<boolean> {
  const groups = await Event.aggregate<{ _id: string | null; people: string[]; events: number }>([
    { $match: { workspace_id: workspaceId, seed_person: { $exists: true } } },
    { $group: { _id: '$profile_id', people: { $addToSet: '$seed_person' }, events: { $sum: 1 } } },
  ]).allowDiskUse(true);
  const profilesOf = new Map<string, Set<string>>();
  for (const group of groups) {
    for (const person of group.people) {
      if (!profilesOf.has(person)) profilesOf.set(person, new Set());
      profilesOf.get(person)!.add(String(group._id));
    }
  }
  const profileFor = async (person: string) => {
    const ids = [...(profilesOf.get(person) || [])];
    return ids.length === 1 ? Profile.findById(ids[0]).lean<Record<string, any>>() : null;
  };

  const checks: { name: string; pass: boolean; detail: string }[] = [];
  const check = (name: string, pass: boolean, detail = '') => checks.push({ name, pass, detail });

  const unresolved = groups.find(group => group._id === null);
  check('Every seeded event resolved to a profile', !unresolved, unresolved ? `${unresolved.events} events without profile` : '');
  const falseMerges = groups.filter(group => group._id && group.people.length > 1);
  check('No two different people merged into one profile', falseMerges.length === 0,
    falseMerges.slice(0, 3).map(group => `${group._id}: ${group.people.join(' + ')}`).join('; '));

  const ravi = await profileFor(SCENARIOS.ravi);
  check('Ravi: anonymous mobile + desktop + "Ravi@Gmail.com " / "ravi@gmail.com" → 1 profile',
    profilesOf.get(SCENARIOS.ravi)?.size === 1 && ravi?.email === 'ravi@gmail.com' && ravi?.device_count === 2 && ravi?.user_id === 'usr_ravi',
    ravi ? `email=${ravi.email} devices=${ravi.device_count} user_id=${ravi.user_id} events=${ravi.event_count} orders=${ravi.order_count}` : `${profilesOf.get(SCENARIOS.ravi)?.size} profiles`);
  const raviMerges = ravi ? await ProfileMerge.find({ workspace_id: workspaceId, survivor_id: ravi._id }).lean<{ reason: string }[]>() : [];
  check('Ravi: pre-identify anonymous profiles were merged (with history)', raviMerges.length >= 1, raviMerges.map(merge => merge.reason).join(', '));

  const priya = await profileFor(SCENARIOS.priya);
  check('Priya: "9876543210" + "+91 98765 43210" on two devices → 1 profile',
    profilesOf.get(SCENARIOS.priya)?.size === 1 && priya?.phone === '+919876543210' && priya?.device_count === 2,
    priya ? `phone=${priya.phone} devices=${priya.device_count}` : `${profilesOf.get(SCENARIOS.priya)?.size} profiles`);

  const meera = await profileFor(SCENARIOS.meera);
  check('Meera: 4 spellings of one email on 3 devices → 1 profile',
    profilesOf.get(SCENARIOS.meera)?.size === 1 && meera?.email === 'meera.iyer@gmail.com' && meera?.device_count === 3,
    meera ? `email=${meera.email} devices=${meera.device_count}` : `${profilesOf.get(SCENARIOS.meera)?.size} profiles`);

  const officeProfiles = new Set(SCENARIOS.office.flatMap(person => [...(profilesOf.get(person) || [])]));
  check('Office: 5 colleagues on one IP + identical browser build stay 5 profiles',
    officeProfiles.size === 5 && SCENARIOS.office.every(person => profilesOf.get(person)?.size === 1), `${officeProfiles.size} profiles`);

  const rahul = await profileFor(SCENARIOS.familyA);
  const neha = await profileFor(SCENARIOS.familyB);
  const conflict = await IdentityConflict.findOne({ workspace_id: workspaceId, conflicting_values: { $all: ['usr_neha', 'usr_rahul'] } }).lean<{ occurrences: number }>();
  check('Family PC: different user_ids on one browser → 2 profiles + conflict logged',
    !!rahul && !!neha && rahul._id !== neha._id && rahul.user_id === 'usr_rahul' && neha.user_id === 'usr_neha' && !!conflict,
    `conflict occurrences=${conflict?.occurrences ?? 0}`);

  // Population-level: how many identified multi-device people were fully stitched.
  const randomPeople = [...profilesOf.entries()].filter(([person]) => person.startsWith('person-'));
  const split = randomPeople.filter(([, ids]) => ids.size > 1).length;
  console.log('\nResolution checks');
  for (const item of checks) console.log(`  ${item.pass ? 'PASS' : 'FAIL'}  ${item.name}${item.detail ? `  (${item.detail})` : ''}`);
  const [profiles, known, merges, conflicts] = await Promise.all([
    Profile.countDocuments({ workspace_id: workspaceId }),
    Profile.countDocuments({ workspace_id: workspaceId, is_known: true }),
    ProfileMerge.countDocuments({ workspace_id: workspaceId }),
    IdentityConflict.countDocuments({ workspace_id: workspaceId }),
  ]);
  console.log(`\n  ${randomPeople.length.toLocaleString()} random people → ${profiles.toLocaleString()} profiles (${known.toLocaleString()} known), ${merges} merges, ${conflicts} conflicts`);
  console.log(`  ${split} people span >1 profile: second devices where they never logged in or gave an email (expected, cannot be linked)`);
  return checks.every(item => item.pass);
}

// ---------------------------------------------------------------------------

function printStats(started: number) {
  const byName = Object.entries(stats.byName).sort((a, b) => b[1] - a[1]);
  console.log(`\nPeople:   ${stats.people.toLocaleString()} (identified ${stats.identifiedPeople.toLocaleString()}, multi-device ${stats.multiDevicePeople}, office ${stats.officePeople}, shared browsers ${stats.sharedBrowsers})`);
  console.log(`Events:   ${stats.events.toLocaleString()} (web ${stats.bySource.web || 0}, server ${stats.bySource.server || 0})`);
  console.log(`Orders:   ${stats.orders.toLocaleString()}  revenue ${stats.revenue.toLocaleString()}`);
  console.log('By event:', Object.fromEntries(byName));
  const funnel = ['ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase'].map(name => `${name} ${stats.byName[name] || 0}`);
  console.log('Funnel:  ', funnel.join(' → '));
  console.log('Deliveries:', stats.deliveries);
  console.log('Events per week (newest first):', stats.eventsByWeek.map(count => count || 0).join(', '));
  console.log(`Generated in ${((Date.now() - started) / 1000).toFixed(1)}s`);
}

async function main() {
  const started = Date.now();
  const buffers: Record<'events' | 'deliveries', Doc[]> = { events: [], deliveries: [] };
  const collections = { events: Event, deliveries: Delivery } as Record<'events' | 'deliveries', mongoose.Model<any>>;
  const flush = async (name: 'events' | 'deliveries') => {
    const docs = buffers[name];
    buffers[name] = [];
    if (!DRY_RUN && docs.length) await collections[name].collection.insertMany(docs as any[], { ordered: false });
  };

  let workspaceId = DEFAULT_WORKSPACE_ID;
  let currency = 'INR';
  let timezone = 'Asia/Kolkata';
  let webSourceId = `${PREFIX}src-web`;
  let login: string | null = null;
  if (!DRY_RUN) {
    requireSafeSeedTarget();
    if (!await testConnection(1, 0)) throw new Error('Could not connect to MongoDB');
    let ownerId: string;
    ({ workspaceId, ownerId, currency, timezone, login } = await resolveWorkspace());
    await clearPreviousSeed(workspaceId);
    webSourceId = await setupSourcesAndDestinations(workspaceId, ownerId);
  }

  const ctx: SeedContext = {
    workspaceId, webSourceId, currency, tzOffset: tzOffsetMs(timezone), now: Date.now(),
    sink: async (name, doc) => {
      buffers[name].push(doc);
      if (buffers[name].length >= BATCH_SIZE) await flush(name);
    },
  };

  await generateScenarios(ctx);

  // Offices: managed desktops share one public IP and one browser build.
  const offices = Array.from({ length: 40 }, (_, i) => ({ ip: `${i % 2 ? '24.48' : '49.36'}.250.${i + 1}`, build: makeDevice('desktop') }));
  const newPerson = (n: number) => {
    const person = makePerson(n);
    stats.people++;
    if (chance(0.08)) {
      const office = pick(offices);
      person.devices.push(makeDeviceRecord(office.build, ctx.now, office.ip));
      stats.officePeople++;
    } else {
      person.devices.push(makeDeviceRecord(makeDevice(), ctx.now));
    }
    if (chance(0.12)) {
      person.devices.push(makeDeviceRecord(makeDevice(person.devices[0].profile.type === 'desktop' ? 'mobile' : 'desktop'), ctx.now));
      stats.multiDevicePeople++;
    }
    if (chance(0.25)) person.userId = `usr_${100_000 + n}`;
    return person;
  };
  for (let n = 0; n < PROFILE_COUNT; n++) {
    const person = newPerson(n);
    // ~0.5% of account holders share their home browser with a family member who has their
    // own account. Decided up front so every session there starts with a login.
    if (person.userId && person.devices[0].fixedIp === null && n + 1 < PROFILE_COUNT && chance(0.02)) {
      const partner = newPerson(++n);
      partner.userId = `usr_${100_000 + n}`;
      person.devices[0].shared = true;
      partner.devices[0] = person.devices[0];
      stats.sharedBrowsers++;
      await generatePerson(ctx, person, DAYS * (1 - Math.pow(rand(), 0.75)));
      await generatePerson(ctx, partner, DAYS * (1 - Math.pow(rand(), 0.75)));
    } else {
      await generatePerson(ctx, person, DAYS * (1 - Math.pow(rand(), 0.75)));
    }
    if (n > 0 && n % 1000 === 0) console.log(`Generated ${n.toLocaleString()} people, ${stats.events.toLocaleString()} events`);
  }
  await flush('events');
  await flush('deliveries');
  printStats(started);
  if (DRY_RUN) return;

  console.log('\nRunning identity resolution over the seeded events…');
  const resolveStarted = Date.now();
  const result = await rerunIdentityResolution(workspaceId, message => console.log(message));
  console.log(`  done in ${((Date.now() - resolveStarted) / 1000).toFixed(1)}s`, JSON.stringify(result));
  const ok = await verifyResolution(workspaceId);

  console.log(`\nWorkspace ${workspaceId}`);
  if (login) console.log(`Demo login: ${login}`);
  console.log(`Web write_key: ${WEBSITE_KEY}`);
  console.log(`Server source write_key: ${SERVER_WRITE_KEY}  secret: ${SERVER_SECRET} (fake, seed only)`);
  if (!ok) {
    console.error('\nSome resolution checks FAILED (see above).');
    process.exitCode = 1;
  }
}

main()
  .catch((error: unknown) => {
    console.error('CDP seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  });
