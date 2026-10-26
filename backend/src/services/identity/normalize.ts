// Identifier normalisation. Matching only ever compares normalised values.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim().toLowerCase();
  return EMAIL_PATTERN.test(value) ? value : null;
}

// Calling code + valid national significant-number lengths (without trunk prefix).
const COUNTRY_PHONE: Record<string, { code: string; lengths: number[] }> = {
  IN: { code: '91', lengths: [10] },
  US: { code: '1', lengths: [10] },
  CA: { code: '1', lengths: [10] },
  GB: { code: '44', lengths: [10] },
  AU: { code: '61', lengths: [9] },
  AE: { code: '971', lengths: [8, 9] },
  SA: { code: '966', lengths: [9] },
  DE: { code: '49', lengths: [10, 11] },
  FR: { code: '33', lengths: [9] },
  SG: { code: '65', lengths: [8] },
  NZ: { code: '64', lengths: [8, 9, 10] },
};

export const SUPPORTED_PHONE_COUNTRIES = Object.keys(COUNTRY_PHONE);

const isE164Digits = (digits: string) => /^[1-9]\d{7,14}$/.test(digits);

/**
 * Normalises to E.164 (+<country><number>). National numbers are completed with the
 * workspace default country: "9876543210", "098765 43210", "91 98765 43210" and
 * "+91 98765 43210" all become "+919876543210". Returns null when it cannot be sure.
 */
export function normalizePhone(raw: unknown, defaultCountry = 'IN'): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) raw = String(Math.trunc(raw));
  if (typeof raw !== 'string') return null;
  // Drop extensions ("ext. 12", "x12", "#12") before reading digits.
  const input = raw.trim().split(/\s*(?:ext\.?|extension|x|#)\s*\d+$/i)[0];
  if (!input || /[a-wyz]/i.test(input)) return null;

  let digits = input.replace(/\D/g, '');
  if (input.startsWith('+')) return isE164Digits(digits) ? `+${digits}` : null;
  if (input.startsWith('00')) {
    digits = digits.slice(2);
    return isE164Digits(digits) ? `+${digits}` : null;
  }

  const country = COUNTRY_PHONE[defaultCountry.toUpperCase()];
  if (!country) return null;
  if (digits.startsWith('0') && country.lengths.includes(digits.length - 1)) digits = digits.slice(1);
  if (country.lengths.includes(digits.length)) return `+${country.code}${digits}`;
  if (digits.startsWith(country.code) && country.lengths.includes(digits.length - country.code.length)) {
    return `+${digits}`;
  }
  return null;
}

export function normalizeId(raw: unknown): string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return String(raw);
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  return value && value.length <= 256 ? value : null;
}
