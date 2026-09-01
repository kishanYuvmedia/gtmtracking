// ─────────────────────────────────────────────
// Browser Data — collected client-side via tracker.js
// ─────────────────────────────────────────────

export interface DeviceInfo {
  user_agent: string;
  browser_name: string | null;
  browser_version: string | null;
  os_name: string | null;
  os_version: string | null;
  device_type: 'mobile' | 'tablet' | 'desktop';
  screen_width: number;
  screen_height: number;
  viewport_width: number;
  viewport_height: number;
  pixel_ratio: number;
  language: string;
  color_depth: number;
}

export interface NetworkInfo {
  connection_type: 'slow-2g' | '2g' | '3g' | '4g' | '5g' | 'wifi' | 'ethernet' | 'unknown';
  effective_bandwidth: number | null;
  rtt: number | null;
  downlink_max: number | null;
  save_data: boolean;
}

export interface PageInfo {
  url: string;
  referrer: string;
  title: string;
  canonical_url: string | null;
  previous_url: string | null;
  history_length: number;
  protocol: string;
  hostname: string;
  pathname: string;
  search: string;
  hash: string;
}

export interface PerformanceInfo {
  load_time: number | null;
  dom_interactive: number | null;
  dom_content_loaded: number | null;
  first_paint: number | null;
  first_contentful_paint: number | null;
  time_to_interactive: number | null;
  dom_size: number | null;
  resource_count: number | null;
  transfer_size: number | null;
}

export interface LocationInfo {
  timezone: string | null;
  timezone_offset: number | null;
  /** set server-side via IP */
  country: string | null;
  region: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  ip_address: string | null;
}

// ─────────────────────────────────────────────
// Event data shapes
// ─────────────────────────────────────────────

export interface Identifiers {
  event_id?: string;
  session_id?: string;
  visitor_id?: string;
  website?: string;
  time?: string;
  sdk_version?: string;
}

export interface EventPayload {
  type: string;
  properties: Record<string, unknown>;
}

export interface EngagementData {
  time_on_page_ms?: number;
  scroll_depth_percent?: number;
  mouse_movements?: number;
  click_count?: number;
  keypress_count?: number;
  rage_click?: boolean;
  inactive_time_ms?: number;
  active_time_ms?: number;
}

export interface SessionSectionData {
  session_duration_ms?: number;
  event_count?: number;
  pageviews?: number;
  entry_page?: string;
  exit_page?: string;
  bounce?: boolean;
}

export interface AttributionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  msclkid?: string;
  ttclid?: string;
  affiliate_id?: string;
  campaign_id?: string;
}

export interface ConsentData {
  consent_status?: string;
  analytics?: boolean;
  marketing?: boolean;
  preferences?: boolean;
}

// Legacy flat format (backward compat)
export interface CollectRequestBody {
  event_name?: string;
  website_id?: string;
  session_id?: string;
  visitor_id?: string;
  event_id?: string;
  timestamp?: string;
  properties?: Record<string, unknown>;
  page?: Partial<PageInfo>;
  device?: Partial<DeviceInfo>;
  network?: Partial<NetworkInfo>;
  performance?: Partial<PerformanceInfo>;
  location?: Partial<LocationInfo>;
  utm?: {
    source?: string;
    medium?: string;
    campaign?: string;
    term?: string;
    content?: string;
  };
  ad?: Record<string, string>;
  referrer?: string;
  // V3 fields pass through
  identifiers?: Identifiers;
  attribution?: AttributionData;
  engagement?: EngagementData;
  consent?: ConsentData;
  session?: SessionSectionData;
  custom?: Record<string, unknown>;
}

export interface IdentifyRequestBody {
  visitor_id: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  city?: string;
  country?: string;
  zip?: string;
  birth_date?: string;
  gender?: string;
  client_ip?: string;
  location?: {
    country?: string;
    region?: string;
    city?: string;
  };
  custom?: Record<string, unknown>;
}
