import geoip from 'geoip-lite';

export interface GeoLocation {
  country: string | null;
  region: string | null;
  city: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  eu_country: boolean;
}

const EU_COUNTRIES = new Set([
  'AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU',
  'IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE',
  'GB','CH','NO','IS','LI',
]);

export function lookupGeo(ip: string): GeoLocation {
  const result: GeoLocation = {
    country: null,
    region: null,
    city: null,
    postal_code: null,
    latitude: null,
    longitude: null,
    timezone: null,
    eu_country: false,
  };

  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    return result;
  }

  try {
    const geo = geoip.lookup(ip);
    if (geo) {
      result.country = geo.country || null;
      result.region = geo.region || null;
      result.city = geo.city || null;
      result.latitude = geo.ll?.[0] ?? null;
      result.longitude = geo.ll?.[1] ?? null;
      result.timezone = geo.timezone || null;
      result.eu_country = geo.country ? EU_COUNTRIES.has(geo.country) : false;
    }
  } catch {
    // geoip-lite throws on invalid IPs, silently ignore
  }

  return result;
}
