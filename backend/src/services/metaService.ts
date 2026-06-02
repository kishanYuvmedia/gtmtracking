import { createHash } from 'crypto';

const META_GRAPH_URL = 'https://graph.facebook.com/v19.0';

const EVENT_MAPPING: Record<string, string> = {
  PageView: 'PageView',
  Purchase: 'Purchase',
  Lead: 'Lead',
  AddToCart: 'AddToCart',
  InitiateCheckout: 'InitiateCheckout',
  Signup: 'CompleteRegistration',
  Login: 'Contact',
};

interface MetaUserData {
  em?: string;
  ph?: string;
  fn?: string;
  ln?: string;
  ct?: string;
  st?: string;
  zp?: string;
  country?: string;
  client_ip_address?: string;
  client_user_agent?: string;
  fbc?: string;
  fbp?: string;
}

interface MetaEvent {
  event_name: string;
  event_time: number;
  action_source: string;
  user_data: MetaUserData;
  event_source_url?: string;
  event_id?: string;
  custom_data?: Record<string, unknown>;
}

function hashValue(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex');
}

export const metaService = {
  normalizeEvent(event: {
    event_name: string;
    payload: Record<string, unknown>;
    event_id: string;
  }): MetaEvent | null {
    const metaEventName = EVENT_MAPPING[event.event_name];
    if (!metaEventName) return null;

    const payload = event.payload as Record<string, string>;

    const userData: MetaUserData = {};

    if (payload.email) userData.em = hashValue(payload.email);
    if (payload.phone) userData.ph = hashValue(payload.phone);
    if (payload.first_name) userData.fn = hashValue(payload.first_name);
    if (payload.last_name) userData.ln = hashValue(payload.last_name);
    if (payload.city) userData.ct = hashValue(payload.city);
    if (payload.state) userData.st = hashValue(payload.state);
    if (payload.zip) userData.zp = hashValue(payload.zip);
    if (payload.country) userData.country = hashValue(payload.country);
    if (payload.client_ip_address) userData.client_ip_address = payload.client_ip_address;
    if (payload.client_user_agent) userData.client_user_agent = payload.client_user_agent;
    if (payload.fbc) userData.fbc = payload.fbc;
    if (payload.fbp) userData.fbp = payload.fbp;

    const customData: Record<string, unknown> = {};
    const reserved = ['email', 'phone', 'first_name', 'last_name', 'city', 'state', 'zip', 'country', 'client_ip_address', 'client_user_agent', 'fbc', 'fbp'];
    for (const [key, val] of Object.entries(payload)) {
      if (!reserved.includes(key)) {
        customData[key] = val;
      }
    }

    return {
      event_name: metaEventName,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      user_data: userData,
      event_source_url: payload.url as string | undefined,
      event_id: event.event_id,
      custom_data: Object.keys(customData).length > 0 ? customData : undefined,
    };
  },

  async sendEvent(pixelId: string, accessToken: string, event: MetaEvent): Promise<Record<string, unknown>> {
    const url = `${META_GRAPH_URL}/${pixelId}/events`;
    const body = {
      data: [event],
      access_token: accessToken,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    return response.json() as Promise<Record<string, unknown>>;
  },
};
