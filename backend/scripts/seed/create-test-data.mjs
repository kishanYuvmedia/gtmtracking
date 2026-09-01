// Creates a test user + website on a fresh (MongoDB) install and prints the
// credentials needed by simulate-events.mjs and the pixel tracker.
//
// Usage:
//   node backend/scripts/seed/create-test-data.mjs
//   GTM_ENDPOINT=https://your-collector.com GTM_EMAIL=x@y.com node backend/scripts/seed/create-test-data.mjs
//
// Outputs:
//   - GTM_API_KEY / GTM_WEBSITE_ID / GTM_TOKEN  (feed these to simulate-events.mjs)

const BASE = (process.env.GTM_ENDPOINT || 'http://localhost:4000').replace(/\/$/, '').replace(/\/api$/, '');
const ENDPOINT = `${BASE}/api`;
const NAME = process.env.GTM_NAME || 'Demo User';
const EMAIL = process.env.GTM_EMAIL || 'demo@example.com';
const PASSWORD = process.env.GTM_PASSWORD || 'demo123456';
const DOMAIN = process.env.GTM_DOMAIN || 'demo-store.com';

async function post(path, body, token) {
  const res = await fetch(`${ENDPOINT}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function main() {
  console.log(`Seeding against ${ENDPOINT}\n`);

  let token;
  let user;

  const reg = await post('/auth/register', { name: NAME, email: EMAIL, password: PASSWORD });
  if (reg.status === 201 || reg.status === 200) {
    token = reg.data.token;
    user = reg.data.user;
    console.log(`Registered ${EMAIL}`);
  } else if (reg.status === 409) {
    const login = await post('/auth/login', { email: EMAIL, password: PASSWORD });
    if (login.status !== 200) {
      throw new Error(`Login failed (${login.status}): ${JSON.stringify(login.data)}`);
    }
    token = login.data.token;
    user = login.data.user;
    console.log(`Using existing user ${EMAIL}`);
  } else {
    throw new Error(`Registration failed (${reg.status}): ${JSON.stringify(reg.data)}`);
  }

  const ws = await post('/websites', { domain: DOMAIN }, token);
  if (ws.status !== 201) {
    throw new Error(`Website creation failed (${ws.status}): ${JSON.stringify(ws.data)}`);
  }

  const website = ws.data.website;
  console.log(`Website created: ${website.domain} (${website.id})\n`);

  console.log('────────────────────────────────────────────');
  console.log('Export these for simulate-events.mjs:');
  console.log('');
  console.log(`  export GTM_ENDPOINT=${BASE}`);
  console.log(`  export GTM_API_KEY=${website.api_key}`);
  console.log(`  export GTM_WEBSITE_ID=${website.id}`);
  console.log(`  export GTM_TOKEN=${token}`);
  console.log('');
  console.log('Tracking script snippet:');
  console.log('');
  console.log(`  <script src="${BASE}/tracker.v3.js"`);
  console.log(`    data-api-key="${website.api_key}"`);
  console.log(`    data-website-id="${website.id}"`);
  console.log(`    data-endpoint="${BASE}" async></script>`);
  console.log('────────────────────────────────────────────');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
