import React, { useEffect, useState } from 'react';
import { Save, Check, AlertCircle } from 'lucide-react';
import { api } from '../../lib/api';

interface IdentitySettings {
  email_keys: string[];
  phone_keys: string[];
  user_id_keys: string[];
  default_country: string;
}

const FIELD_ROWS: { key: 'email_keys' | 'phone_keys' | 'user_id_keys'; label: string; description: string }[] = [
  { key: 'email_keys', label: 'Email fields', description: 'Property or form field names that hold an email address.' },
  { key: 'phone_keys', label: 'Phone fields', description: 'Property or form field names that hold a phone number.' },
  { key: 'user_id_keys', label: 'User ID fields', description: 'Your own customer / account ID fields.' },
];

const toText = (keys: string[]) => keys.join(', ');
const toKeys = (text: string) => text.split(/[\s,]+/).map((key) => key.trim()).filter(Boolean);

export const IdentityFieldsPanel: React.FC = () => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [country, setCountry] = useState('IN');
  const [countries, setCountries] = useState<string[]>([]);
  const [defaults, setDefaults] = useState<IdentitySettings | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const apply = (settings: IdentitySettings) => {
    setDrafts({ email_keys: toText(settings.email_keys), phone_keys: toText(settings.phone_keys), user_id_keys: toText(settings.user_id_keys) });
    setCountry(settings.default_country);
  };

  useEffect(() => {
    api.getIdentitySettings()
      .then((response: { settings: IdentitySettings; defaults: IdentitySettings; supported_countries: string[]; can_edit: boolean }) => {
        apply(response.settings);
        setDefaults(response.defaults);
        setCountries(response.supported_countries);
        setCanEdit(response.can_edit);
      })
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Unable to load identity fields'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      const response = await api.updateIdentitySettings({
        email_keys: toKeys(drafts.email_keys || ''),
        phone_keys: toKeys(drafts.phone_keys || ''),
        user_id_keys: toKeys(drafts.user_id_keys || ''),
        default_country: country,
      }) as { settings: IdentitySettings };
      apply(response.settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save identity fields');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-xs text-muted">Loading identity fields…</p>;

  return (
    <div>
      <h2 className="text-sm font-bold text-ink mb-1">Identity Fields</h2>
      <p className="text-xs text-muted mb-4">
        Events are matched to people using these fields (in traits, event properties, form fields and URL parameters).
        Separate names with commas; earlier names win. IP address is never used to merge people.
      </p>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 mb-3 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {FIELD_ROWS.map((row) => (
        <div key={row.key} className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-border/50">
          <div className="flex-1 min-w-[200px] mr-8">
            <p className="text-sm font-medium text-ink">{row.label}</p>
            <p className="text-xs text-muted mt-0.5">{row.description}</p>
          </div>
          <input
            type="text"
            value={drafts[row.key] || ''}
            disabled={!canEdit}
            onChange={(e) => setDrafts((prev) => ({ ...prev, [row.key]: e.target.value }))}
            placeholder={defaults ? toText(defaults[row.key]) : ''}
            aria-label={row.label}
            className="input w-full sm:w-96 disabled:opacity-60"
          />
        </div>
      ))}

      <div className="flex flex-wrap items-center justify-between gap-3 py-4">
        <div className="flex-1 min-w-[200px] mr-8">
          <p className="text-sm font-medium text-ink">Default phone country</p>
          <p className="text-xs text-muted mt-0.5">Used to convert local numbers (e.g. 9876543210) to international format.</p>
        </div>
        <select value={country} disabled={!canEdit} onChange={(e) => setCountry(e.target.value)} className="select w-64 disabled:opacity-60" aria-label="Default phone country">
          {countries.map((code) => <option key={code} value={code}>{code}</option>)}
        </select>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        {!canEdit && <span className="text-xs text-muted">Only workspace admins can change these.</span>}
        {saved && <Check className="w-4 h-4 text-success" />}
        {canEdit && (
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save identity fields'}
          </button>
        )}
      </div>
    </div>
  );
};
