// Simulates realistic user journeys against a fresh (MongoDB) collector.
//
// First create a user + website and grab credentials:
//   node backend/scripts/seed/create-test-data.mjs
//
// Then run with those credentials:
//   export GTM_ENDPOINT=http://localhost:4000
//   export GTM_API_KEY=<api key from create-test-data.mjs>
//   export GTM_WEBSITE_ID=<website id from create-test-data.mjs>
//   export GTM_TOKEN=<jwt token from create-test-data.mjs>   # optional, for the stats summary
//   node backend/scripts/seed/simulate-events.mjs

const ENDPOINT = process.env.GTM_ENDPOINT || 'http://localhost:4000';
const API_KEY = process.env.GTM_API_KEY || 'YOUR_API_KEY';
const WEBSITE_ID = process.env.GTM_WEBSITE_ID || 'YOUR_WEBSITE_ID';
const TOKEN = process.env.GTM_TOKEN || '';
const STORE_DOMAIN = process.env.GTM_STORE_DOMAIN || 'demo-store.com';

function uuid() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

function randomChoice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randomFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }

const VISITORS = Array.from({ length: 10 }, (_, i) => ({
  visitor_id: uuid(),
  email: `visitor${i + 1}@example.com`,
  name: `Visitor ${i + 1}`,
}));

const PAGES = [
  { url: `https://${STORE_DOMAIN}`, title: `${STORE_DOMAIN} — Home`, path: '/' },
  { url: `https://${STORE_DOMAIN}/collections/new-arrivals`, title: 'New Arrivals', path: '/collections/new-arrivals' },
  { url: `https://${STORE_DOMAIN}/collections/sale`, title: 'Sale — Up to 50% Off', path: '/collections/sale' },
  { url: `https://${STORE_DOMAIN}/products/classic-leather-jacket`, title: 'Classic Leather Jacket', path: '/products/classic-leather-jacket' },
  { url: `https://${STORE_DOMAIN}/products/wool-cashmere-blend`, title: 'Wool Cashmere Blend', path: '/products/wool-cashmere-blend' },
  { url: `https://${STORE_DOMAIN}/products/silk-evening-gown`, title: 'Silk Evening Gown', path: '/products/silk-evening-gown' },
  { url: `https://${STORE_DOMAIN}/products/handcrafted-leather-bag`, title: 'Handcrafted Leather Bag', path: '/products/handcrafted-leather-bag' },
  { url: `https://${STORE_DOMAIN}/cart`, title: 'Shopping Cart', path: '/cart' },
  { url: `https://${STORE_DOMAIN}/checkout`, title: 'Checkout', path: '/checkout' },
  { url: `https://${STORE_DOMAIN}/account`, title: 'My Account', path: '/account' },
  { url: `https://${STORE_DOMAIN}/blog`, title: 'Style Blog', path: '/blog' },
];

const PRODUCTS = [
  { id: 'prod-001', name: 'Classic Leather Jacket', price: 299.99, category: 'Outerwear' },
  { id: 'prod-002', name: 'Wool Cashmere Blend Coat', price: 459.99, category: 'Outerwear' },
  { id: 'prod-003', name: 'Silk Evening Gown', price: 189.99, category: 'Dresses' },
  { id: 'prod-004', name: 'Handcrafted Leather Bag', price: 249.99, category: 'Accessories' },
  { id: 'prod-005', name: 'Italian Leather Oxford Shoes', price: 329.99, category: 'Footwear' },
  { id: 'prod-006', name: 'Cashmere Scarf Collection', price: 89.99, category: 'Accessories' },
];

const UTMS = [
  { source: 'google', medium: 'cpc', campaign: 'brand_awareness_q3', term: 'leather jacket', content: 'hero_banner' },
  { source: 'facebook', medium: 'social', campaign: 'retargeting_abandoned', term: '', content: 'carousel_1' },
  { source: 'telegram', medium: 'social', campaign: 'telegram_launch_q3', term: 'fashion deals', content: 'channel_post' },
  { source: 'google', medium: 'organic', campaign: '', term: '', content: '' },
  { source: 'facebook', medium: 'cpc', campaign: 'new_arrivals_sept', term: 'new collection', content: 'story_ad' },
  { source: '', medium: '', campaign: '', term: '', content: '' },
];

const AD_CLICK_IDS = [
  { gclid: 'CKjPx-vn4YgDFcBkDwIdTCUBVg' },
  { fbclid: 'IwAR2xKj5PYs3ZqL8mN9fR7tH4dQ6vB1cE0wXyZ0aB2cD4eF6gH8iJ0kL2' },
  { ttclid: 'tg0z4n8p2m1k7j5h3f9d6s0a2w4e8r5t1y7u3i9o0p' },
  { msclkid: '8a7b6c5d4e3f2g1h0i9j8k7l6m5n4o3p2q1r0s' },
  { gclid: 'EAIaIQobChMI4L7Q3PT4iAMVBYmzCh0Yvg0' },
  {},
];

function makeDevice(visitorIdx) {
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];
  const browser = browsers[visitorIdx % 4];
  return {
    user_agent: `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) ${browser}/114.0.0.0 Safari/537.36`,
    browser_name: browser,
    browser_version: '114.0',
    os_name: 'macOS',
    os_version: '10.15.7',
    device_type: visitorIdx % 5 === 0 ? 'mobile' : visitorIdx % 7 === 0 ? 'tablet' : 'desktop',
    screen_width: 1440, screen_height: 900,
    viewport_width: 1280, viewport_height: 800,
    pixel_ratio: 2, language: 'en-US', color_depth: 24,
  };
}

function makeEvent(eventName, properties, visitorIdx = 0, pageIdx = 0, sessionId, referrer = '') {
  const visitor = VISITORS[visitorIdx % VISITORS.length];
  const page = PAGES[pageIdx % PAGES.length];
  const utm = UTMS[visitorIdx % UTMS.length];
  const adIds = AD_CLICK_IDS[visitorIdx % AD_CLICK_IDS.length];

  return {
    event_name: eventName,
    website_id: WEBSITE_ID,
    session_id: sessionId || uuid(),
    visitor_id: visitor.visitor_id,
    user_id: visitor.visitor_id,
    event_id: uuid(),
    timestamp: new Date().toISOString(),
    properties: { ...properties, email: visitor.email, name: visitor.name },
    page: { url: page.url, referrer, title: page.title, hostname: STORE_DOMAIN, pathname: page.path, search: '', hash: '' },
    device: makeDevice(visitorIdx),
    location: { timezone: 'America/New_York', timezone_offset: -240, country: 'US', region: 'NY', city: 'New York', ip_address: '192.168.1.1' },
    utm: { source: utm.source, medium: utm.medium, campaign: utm.campaign, term: utm.term, content: utm.content },
    ad: adIds,
    referrer,
  };
}

async function sendBatch(events) {
  const res = await fetch(`${ENDPOINT}/api/batch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: JSON.stringify({ events }),
  });
  return await res.json();
}

async function simulateUserJourney(visitorIdx) {
  const sessionId = uuid();
  const events = [];
  const numPages = randomInt(2, 5);

  let referrer = '';
  for (let p = 0; p < numPages; p++) {
    const pageIdx = p === 0 ? 0 : randomInt(0, PAGES.length - 1);
    events.push(makeEvent('PageView', {}, visitorIdx, pageIdx, sessionId, referrer));
    referrer = PAGES[pageIdx].url;

    if (Math.random() < 0.3) {
      events.push(makeEvent('Scroll', { percentage: randomChoice([25, 50, 75, 90, 100]), depth_px: randomInt(500, 3000), max_depth: 100 }, visitorIdx, pageIdx, sessionId, referrer));
    }

    if (Math.random() < 0.2) {
      const product = randomChoice(PRODUCTS);
      events.push(makeEvent('ProductView', { product_id: product.id, name: product.name, price: product.price, category: product.category, currency: 'USD' }, visitorIdx, pageIdx, sessionId, referrer));
    }

    if (Math.random() < 0.15) {
      events.push(makeEvent('ButtonClick', { text: randomChoice(['Shop Now', 'Learn More', 'Add to Cart', 'View Details']), selector: '.btn-primary', id: 'cta-1' }, visitorIdx, pageIdx, sessionId, referrer));
    }
  }

  if (Math.random() < 0.4) {
    const product = randomChoice(PRODUCTS);
    events.push(makeEvent('AddToCart', { product_id: product.id, name: product.name, price: product.price, quantity: randomInt(1, 2), currency: 'USD', category: product.category }, visitorIdx, 0, sessionId, referrer));
  }

  if (Math.random() < 0.2) {
    const items = Array.from({ length: randomInt(1, 3) }, () => {
      const p = randomChoice(PRODUCTS);
      return { product_id: p.id, name: p.name, price: p.price, quantity: randomInt(1, 2), category: p.category };
    });
    const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    events.push(makeEvent('Purchase', {
      order_id: `ORD-${Date.now()}-${visitorIdx}`,
      transaction_id: `TXN-${Date.now()}-${visitorIdx}`,
      items, total, value: total, currency: 'USD',
      shipping: randomFloat(5.99, 15.99), tax: randomFloat(total * 0.08, total * 0.1),
      coupon: Math.random() < 0.3 ? 'WELCOME10' : '',
      payment_method: randomChoice(['credit_card', 'paypal', 'apple_pay']),
      item_count: items.length,
      billing_city: 'New York', billing_country: 'US',
    }, visitorIdx, 0, sessionId, referrer));
  }

  if (Math.random() < 0.3) {
    const visitor = VISITORS[visitorIdx % VISITORS.length];
    events.push(makeEvent('Identify', { userId: visitor.visitor_id, email: visitor.email, name: visitor.name }, visitorIdx, 0, sessionId, referrer));
  }

  console.log(`  Simulating ${events.length} events for visitor ${visitorIdx + 1}/${VISITORS.length}...`);
  const result = await sendBatch(events);
  console.log(`  Result: ${result.succeeded} succeeded, ${result.failed} failed`);
  return result;
}

async function main() {
  if (API_KEY === 'YOUR_API_KEY' || WEBSITE_ID === 'YOUR_WEBSITE_ID') {
    console.error('GTM_API_KEY and GTM_WEBSITE_ID must be set.');
    console.error('Run node backend/scripts/seed/create-test-data.mjs first, then export the printed values.');
    process.exit(1);
  }

  console.log(`Starting event simulation for ${STORE_DOMAIN}...\n`);

  for (let v = 0; v < VISITORS.length; v++) {
    console.log(`\n=== Visitor ${v + 1}: ${VISITORS[v].email} ===`);
    await simulateUserJourney(v);
    await new Promise(r => setTimeout(r, 200));
  }

  if (TOKEN) {
    console.log('\n=== Summary ===');
    const res = await fetch(`${ENDPOINT}/api/events/stats`, {
      headers: { 'Authorization': `Bearer ${TOKEN}` },
    });
    const stats = await res.json();
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log('\n(Set GTM_TOKEN to print the event stats summary.)');
  }

  console.log('\nDone! Events should now be visible in the dashboard.');
}

main().catch(console.error);
