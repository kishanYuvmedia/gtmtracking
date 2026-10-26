import type { IdentityType } from '../../database/models/Identity';
import { DEFAULT_IDENTITY_SETTINGS, type IdentitySettings } from '../../database/models/Workspace';
import { normalizeEmail, normalizeId, normalizePhone } from './normalize';

export interface Identifier {
  type: IdentityType;
  value: string;
}

// Lower number = stronger. Decides which matched profile anchors a decision.
export const IDENTIFIER_PRIORITY: Record<IdentityType, number> = {
  user_id: 1, email: 2, phone: 3, anonymous_id: 4, fbc: 5, gclid: 5, fbp: 6,
};

export const identityKey = (identifier: Identifier) => `${identifier.type}:${identifier.value}`;

export interface IdentifiableEvent {
  anonymous_id?: string | null;
  visitor_id?: string | null;
  user_id?: string | null;
  event_type?: string | null;
  properties?: unknown;
  payload?: unknown;
  context?: unknown;
  page_info?: unknown;
  url_params?: unknown;
  click_ids?: unknown;
}

/** Explicit identifiers supplied out-of-band (identify() calls, queue job payloads). */
export interface ExplicitIdentifiers {
  anonymous_id?: string | null;
  user_id?: string | null;
  email?: string | null;
  phone?: string | null;
}

const TRAIT_CONTAINER_KEYS = ['traits', 'user_traits', 'user'];
const FORM_CONTAINER_KEYS = ['form', 'form_data', 'formData', 'fields', 'form_fields'];

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

// Form captures arrive either as objects ({email: ...}) or arrays ([{name: 'email', value: ...}]).
function formRecord(value: unknown): Record<string, unknown> | null {
  if (Array.isArray(value)) {
    const fields: Record<string, unknown> = {};
    for (const field of value) {
      const item = record(field);
      const name = item && (item.name ?? item.key ?? item.id);
      if (typeof name === 'string' && item && 'value' in item) fields[name] = item.value;
    }
    return Object.keys(fields).length ? fields : null;
  }
  return record(value);
}

function urlQuery(event: IdentifiableEvent): Record<string, unknown> | null {
  const params: Record<string, unknown> = { ...(record(event.url_params) || {}) };
  const page = record(event.page_info);
  const url = page?.url ?? page?.page_url;
  if (typeof url === 'string') {
    try {
      new URL(url).searchParams.forEach((value, key) => { if (!(key in params)) params[key] = value; });
    } catch {
      // Not an absolute URL: nothing to read.
    }
  }
  return Object.keys(params).length ? params : null;
}

/**
 * Every place identifiers can appear, strongest first. Traits outrank raw properties so
 * an identify() email wins over, say, a "referrer email" property on the same event.
 */
function sources(event: IdentifiableEvent): Record<string, unknown>[] {
  const properties = record(event.properties);
  const payload = record(event.payload);
  const context = record(event.context);
  const found: (Record<string, unknown> | null)[] = [];
  for (const container of [properties, payload, context]) {
    for (const key of TRAIT_CONTAINER_KEYS) found.push(record(container?.[key]));
  }
  if (event.event_type === 'identify') found.push(properties);
  for (const container of [properties, payload]) {
    for (const key of FORM_CONTAINER_KEYS) found.push(formRecord(container?.[key]));
  }
  found.push(properties, record(payload?.properties), payload, urlQuery(event));
  return found.filter((item): item is Record<string, unknown> => !!item);
}

function firstMatch(containers: Record<string, unknown>[], keys: string[], normalize: (value: unknown) => string | null) {
  const wanted = keys.map(key => key.toLowerCase());
  for (const container of containers) {
    const entries = Object.entries(container);
    // Respect configured key order inside each container.
    for (const key of wanted) {
      const entry = entries.find(([name]) => name.toLowerCase() === key);
      const value = entry ? normalize(entry[1]) : null;
      if (value) return value;
    }
  }
  return null;
}

function cookie(event: IdentifiableEvent, name: '_fbp' | '_fbc'): string | null {
  const context = record(event.context);
  const payload = record(event.payload);
  const short = name.slice(1);
  for (const container of [record(context?.cookies), record(payload?.cookies), payload, record(event.properties)]) {
    const value = normalizeId(container?.[name] ?? container?.[short]);
    if (value) return value;
  }
  return null;
}

/**
 * Collects one value per identifier type from an event. IP address and user agent are
 * intentionally never returned: they are enrichment signals only and must not link people.
 */
export function extractIdentifiers(
  event: IdentifiableEvent,
  settings: IdentitySettings = DEFAULT_IDENTITY_SETTINGS,
  explicit: ExplicitIdentifiers = {},
): Identifier[] {
  const containers = sources(event);
  const values: Partial<Record<IdentityType, string | null>> = {
    user_id: normalizeId(explicit.user_id) || normalizeId(event.user_id) || firstMatch(containers, settings.user_id_keys, normalizeId),
    email: normalizeEmail(explicit.email) || firstMatch(containers, settings.email_keys, normalizeEmail),
    phone: normalizePhone(explicit.phone, settings.default_country)
      || firstMatch(containers, settings.phone_keys, value => normalizePhone(value, settings.default_country)),
    anonymous_id: normalizeId(explicit.anonymous_id) || normalizeId(event.anonymous_id) || normalizeId(event.visitor_id),
    fbp: cookie(event, '_fbp'),
    fbc: cookie(event, '_fbc'),
    gclid: normalizeId(record(event.click_ids)?.gclid) || normalizeId(urlQuery(event)?.gclid),
  };

  return (Object.entries(values) as [IdentityType, string | null][])
    .filter((entry): entry is [IdentityType, string] => !!entry[1])
    .map(([type, value]) => ({ type, value }))
    .sort((a, b) => IDENTIFIER_PRIORITY[a.type] - IDENTIFIER_PRIORITY[b.type]);
}


/** Traits carried by the event (identify traits and trait containers), minus empty values. */
export function extractTraits(event: IdentifiableEvent): Record<string, unknown> {
  const properties = record(event.properties);
  const payload = record(event.payload);
  const context = record(event.context);
  const traits: Record<string, unknown> = {};
  const containers = [
    ...[properties, payload, context].flatMap(container => TRAIT_CONTAINER_KEYS.map(key => record(container?.[key]))),
  ].filter((item): item is Record<string, unknown> => !!item);
  // Lowest priority first so stronger containers overwrite.
  for (const container of containers.reverse()) {
    for (const [key, value] of Object.entries(container)) {
      if (!isEmptyTrait(value)) traits[key] = value;
    }
  }
  return traits;
}

export function isEmptyTrait(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === 'string' && !value.trim())
    || (Array.isArray(value) && value.length === 0);
}

export function displayName(traits: Record<string, unknown>): string | null {
  const text = (key: string) => (typeof traits[key] === 'string' ? (traits[key] as string).trim() : '');
  const full = text('name') || text('full_name');
  if (full) return full;
  const parts = [text('first_name') || text('firstName'), text('last_name') || text('lastName')].filter(Boolean);
  return parts.length ? parts.join(' ') : null;
}
