import { Request } from 'express';

const TRUSTED_HEADERS = [
  'cf-connecting-ip',
  'x-real-ip',
  'x-client-ip',
  'x-forwarded-for',
  'x-cluster-client-ip',
  'forwarded',
] as const;

export function extractClientIp(req: Request): string | null {
  for (const header of TRUSTED_HEADERS) {
    const value = req.headers[header];
    if (!value) continue;

    const raw = Array.isArray(value) ? value[0] : value;
    if (header === 'x-forwarded-for') {
      const first = raw.split(',')[0].trim();
      if (first) return first;
    }
    if (header === 'forwarded') {
      const match = raw.match(/for="?\[?([^\]"\s;]+)/);
      if (match) return match[1];
      const direct = raw.split(';')[0].replace(/^for=/, '').replace(/"/g, '').trim();
      if (direct) return direct;
    }
    if (raw) return raw;
  }

  return req.ip || req.socket?.remoteAddress || null;
}

export function anonymizeIp(ip: string): string {
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return parts.slice(0, 3).join(':') + '::';
  }
  const parts = ip.split('.');
  if (parts.length === 4) {
    parts[3] = '0';
  }
  return parts.join('.');
}
