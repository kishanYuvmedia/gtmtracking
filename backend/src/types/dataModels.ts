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

export interface BrowserEventPayload {
  // ── Core event fields ──
  event_name: string;
  website_id: string;
  session_id: string;
  visitor_id: string;
  event_id: string;
  timestamp: string;

  // ── Event-specific properties ──
  properties: Record<string, unknown>;

  // ── Enriched context (captured by tracker) ──
  page?: Partial<PageInfo>;
  device?: Partial<DeviceInfo>;
  network?: Partial<NetworkInfo>;
  performance?: Partial<PerformanceInfo>;

  // ── Enriched context (set server-side) ──
  location?: Partial<LocationInfo>;
}

// ─────────────────────────────────────────────
// Event-specific property shapes
// ─────────────────────────────────────────────

export interface PageViewProperties {
  url: string;
  title: string;
  referrer: string;
}

export interface ClickProperties {
  target: string;
  text: string;
  id: string;
  class: string;
  href?: string;
  x?: number;
  y?: number;
}

export interface ScrollProperties {
  percentage: number;
  depth_px: number;
  max_depth: number;
}

export interface FormSubmitProperties {
  form_id: string;
  form_action: string;
  form_method: string;
  field_count: number;
}

export interface EcommerceProperties {
  currency: string;
  value: number;
  items?: Array<{
    product_id: string;
    name: string;
    category?: string;
    quantity: number;
    price: number;
  }>;
}

export interface PurchaseProperties extends EcommerceProperties {
  transaction_id: string;
  shipping?: number;
  tax?: number;
  coupon?: string;
}

export interface LeadProperties {
  form_id: string;
  value?: number;
  currency?: string;
}

export interface SignupProperties {
  method: 'email' | 'google' | 'facebook' | 'apple' | 'other';
}

export interface LoginProperties {
  method: 'email' | 'google' | 'facebook' | 'apple' | 'other';
}

// ─────────────────────────────────────────────
// Website Data — stored per tracked domain
// ─────────────────────────────────────────────

export interface WebsiteData {
  // Core
  id: string;
  user_id: string;
  domain: string;
  name: string | null;
  description: string | null;
  api_key: string;
  pixel_id: string;
  status: 'active' | 'paused' | 'disabled';

  // Meta Conversion API
  meta_access_token: string | null;
  meta_ad_account_id: string | null;
  meta_test_event_code: string | null;

  // Auto-tracking config
  auto_track_pageview: boolean;
  auto_track_click: boolean;
  auto_track_scroll: boolean;
  auto_track_form: boolean;
  cookie_domain: string | null;

  // Compliance
  gdpr_enabled: boolean;
  consent_mode: 'default' | 'tcf' | 'cookiebot' | 'onetrust' | 'manual';
  data_retention_days: number;

  // Domain verification
  domain_verified: boolean;
  verification_token: string | null;
  verified_at: Date | null;

  // Branding
  favicon: string | null;
  primary_color: string | null;

  // Meta
  timezone: string;
  script_version: number;
  allowed_origins: string[];
  last_event_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

// ─────────────────────────────────────────────
// User Data — platform account owners
// ─────────────────────────────────────────────

export interface UserData {
  // Core
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  avatar: string | null;

  // Account
  role: 'admin' | 'customer';
  status: 'active' | 'suspended' | 'disabled';
  email_verified: boolean;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  password_changed_at: Date | null;

  // Preferences
  timezone: string;
  locale: string;
  notification_settings: NotificationSettings;

  // Billing
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  stripe_customer_id: string | null;
  subscription_status: string | null;
  trial_ends_at: Date | null;
  events_this_month: number;
  events_limit: number;

  // Meta
  created_at: Date;
  updated_at: Date;
}

export interface NotificationSettings {
  email_notifications: boolean;
  weekly_report: boolean;
  monthly_report: boolean;
  alert_on_high_events: boolean;
  alert_threshold: number | null;
}

// ─────────────────────────────────────────────
// Visitor / Session models
// ─────────────────────────────────────────────

export interface SessionData {
  id: string;
  visitor_id: string;
  website_id: string;
  device: Partial<DeviceInfo> | null;
  location: Partial<LocationInfo> | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  referrer: string | null;
  landing_page: string | null;
  exit_page: string | null;
  page_views: number;
  duration_seconds: number;
  browser_timezone: string | null;
  user_agent: string | null;
  ip_address: string | null;
  started_at: Date;
  last_activity: Date;
}

// ─────────────────────────────────────────────
// API shapes
// ─────────────────────────────────────────────

export interface CollectRequestBody {
  event_name: string;
  website_id?: string; // overridden server-side
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
