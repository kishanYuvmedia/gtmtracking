// Country → default currency + timezone for websites. The pixel snippet sends the website's
// currency, so e-commerce values are recorded in the shop's own money.
export interface CountryInfo {
  code: string;
  name: string;
  currency: string;
  timezone: string;
}

export const COUNTRIES: CountryInfo[] = [
  { code: 'IN', name: 'India', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'US', name: 'United States', currency: 'USD', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'CA', name: 'Canada', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'AU', name: 'Australia', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'NZ', name: 'New Zealand', currency: 'NZD', timezone: 'Pacific/Auckland' },
  { code: 'AE', name: 'United Arab Emirates', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'SA', name: 'Saudi Arabia', currency: 'SAR', timezone: 'Asia/Riyadh' },
  { code: 'QA', name: 'Qatar', currency: 'QAR', timezone: 'Asia/Qatar' },
  { code: 'SG', name: 'Singapore', currency: 'SGD', timezone: 'Asia/Singapore' },
  { code: 'MY', name: 'Malaysia', currency: 'MYR', timezone: 'Asia/Kuala_Lumpur' },
  { code: 'ID', name: 'Indonesia', currency: 'IDR', timezone: 'Asia/Jakarta' },
  { code: 'PH', name: 'Philippines', currency: 'PHP', timezone: 'Asia/Manila' },
  { code: 'TH', name: 'Thailand', currency: 'THB', timezone: 'Asia/Bangkok' },
  { code: 'JP', name: 'Japan', currency: 'JPY', timezone: 'Asia/Tokyo' },
  { code: 'BD', name: 'Bangladesh', currency: 'BDT', timezone: 'Asia/Dhaka' },
  { code: 'LK', name: 'Sri Lanka', currency: 'LKR', timezone: 'Asia/Colombo' },
  { code: 'NP', name: 'Nepal', currency: 'NPR', timezone: 'Asia/Kathmandu' },
  { code: 'DE', name: 'Germany', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'NL', name: 'Netherlands', currency: 'EUR', timezone: 'Europe/Amsterdam' },
  { code: 'ES', name: 'Spain', currency: 'EUR', timezone: 'Europe/Madrid' },
  { code: 'IT', name: 'Italy', currency: 'EUR', timezone: 'Europe/Rome' },
  { code: 'IE', name: 'Ireland', currency: 'EUR', timezone: 'Europe/Dublin' },
  { code: 'CH', name: 'Switzerland', currency: 'CHF', timezone: 'Europe/Zurich' },
  { code: 'ZA', name: 'South Africa', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'NG', name: 'Nigeria', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'BR', name: 'Brazil', currency: 'BRL', timezone: 'America/Sao_Paulo' },
  { code: 'MX', name: 'Mexico', currency: 'MXN', timezone: 'America/Mexico_City' },
];

export const CURRENCIES = [...new Set(COUNTRIES.map(country => country.currency))].sort();

export function findCountry(code: unknown): CountryInfo | null {
  if (typeof code !== 'string') return null;
  return COUNTRIES.find(country => country.code === code.trim().toUpperCase()) || null;
}
