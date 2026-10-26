import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';

export interface CountryOption {
  code: string;
  name: string;
  currency: string;
  timezone: string;
}

let cache: Promise<{ countries: CountryOption[]; currencies: string[] }> | null = null;

export function useCountries() {
  const [data, setData] = useState<{ countries: CountryOption[]; currencies: string[] }>({ countries: [], currencies: [] });
  const [error, setError] = useState('');
  useEffect(() => {
    cache = cache || (api.getCountries() as Promise<{ countries: CountryOption[]; currencies: string[] }>);
    cache.then(setData).catch((cause: unknown) => {
      cache = null;
      setError(cause instanceof Error ? cause.message : 'Unable to load countries');
    });
  }, []);
  return { ...data, error };
}

interface WebsiteLocaleFieldsProps {
  country: string;
  currency: string;
  onChange: (value: { country: string; currency: string }) => void;
  disabled?: boolean;
}

/** Country select; choosing a country sets its currency, which can still be overridden. */
export const WebsiteLocaleFields: React.FC<WebsiteLocaleFieldsProps> = ({ country, currency, onChange, disabled }) => {
  const { countries, currencies, error } = useCountries();
  const selected = countries.find((item) => item.code === country);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_160px] gap-3">
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink" htmlFor="website-country">Country</label>
        <select
          id="website-country"
          value={country}
          disabled={disabled}
          onChange={(e) => {
            const next = countries.find((item) => item.code === e.target.value);
            onChange({ country: e.target.value, currency: next ? next.currency : currency });
          }}
          className="select"
        >
          <option value="" disabled>Select country</option>
          {countries.map((item) => (
            <option key={item.code} value={item.code}>{item.name}</option>
          ))}
        </select>
        {error && <p className="text-[11px] text-danger">{error}</p>}
      </div>
      <div className="space-y-1">
        <label className="text-xs font-semibold text-ink" htmlFor="website-currency">Currency</label>
        <select
          id="website-currency"
          value={currency}
          disabled={disabled || !country}
          onChange={(e) => onChange({ country, currency: e.target.value })}
          className="select"
        >
          {!currency && <option value="">—</option>}
          {currencies.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </div>
      {selected && (
        <p className="sm:col-span-2 text-[11px] text-muted -mt-1">
          The pixel records e-commerce values in {currency || selected.currency}
          {currency && currency !== selected.currency ? ` (default for ${selected.name} is ${selected.currency})` : ''}.
          Reports use the {selected.timezone} timezone.
        </p>
      )}
    </div>
  );
};
