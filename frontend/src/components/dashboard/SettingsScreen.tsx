import React, { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { IdentityFieldsPanel } from './IdentityFieldsPanel';

interface SettingsField {
  label: string;
  description?: string;
  type: 'input' | 'select' | 'toggle';
  value: string;
  options?: string[];
}

const workspaceFields: SettingsField[] = [
  { label: 'Workspace Name', type: 'input', value: 'ClickOwl Analytics' },
  { label: 'Company Name', type: 'input', value: 'ClickOwl Inc.' },
  { label: 'Website', type: 'input', value: 'https://clickowl.io' },
];

const localizationFields: SettingsField[] = [
  { label: 'Timezone', type: 'select', value: 'UTC+05:30 (IST)', options: ['UTC+00:00 (GMT)', 'UTC-05:00 (EST)', 'UTC-08:00 (PST)', 'UTC+05:30 (IST)', 'UTC+01:00 (CET)', 'UTC+09:00 (JST)'] },
  { label: 'Date Format', type: 'select', value: 'MMM DD, YYYY', options: ['MMM DD, YYYY', 'DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'] },
  { label: 'Language', type: 'select', value: 'English', options: ['English', 'Spanish', 'French', 'German', 'Japanese', 'Hindi'] },
];

const dataFields: SettingsField[] = [
  { label: 'Data Retention', type: 'select', value: '90 days', options: ['30 days', '60 days', '90 days', '180 days', '365 days'] },
  { label: 'Enable Real-time Sync', type: 'toggle', value: 'true' },
  { label: 'Auto-archive Events', type: 'toggle', value: 'false' },
];

function SettingsRow({ field }: { field: SettingsField }) {
  const [value, setValue] = useState(field.value);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0 mr-8">
        <p className="text-sm font-medium text-ink">{field.label}</p>
        {field.description && <p className="text-xs text-muted mt-0.5">{field.description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {field.type === 'input' && (
          <input
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input w-64"
          />
        )}
        {field.type === 'select' && (
          <select
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="select w-64"
          >
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        )}
        {field.type === 'toggle' && (
          <button
            onClick={() => setValue(value === 'true' ? 'false' : 'true')}
            className={`w-9 h-5 rounded-full transition-colors relative ${value === 'true' ? 'bg-ink' : 'bg-border'}`}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${value === 'true' ? 'left-[18px]' : 'left-0.5'}`} />
          </button>
        )}
        {saved && <Check className="w-4 h-4 text-success" />}
      </div>
    </div>
  );
}

export const SettingsScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'localization' | 'data' | 'identity'>('general');

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-muted mt-1.5">Manage your workspace configuration and preferences.</p>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {(['general', 'localization', 'data', 'identity'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab
                ? 'border-ink text-ink'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        {activeTab === 'general' && (
          <div>
            <h2 className="text-sm font-bold text-ink mb-1">Workspace Settings</h2>
            <p className="text-xs text-muted mb-4">Manage your workspace details and branding.</p>
            {workspaceFields.map((field) => (
              <SettingsRow key={field.label} field={field} />
            ))}
          </div>
        )}
        {activeTab === 'localization' && (
          <div>
            <h2 className="text-sm font-bold text-ink mb-1">Localization</h2>
            <p className="text-xs text-muted mb-4">Set your timezone, date format, and language preferences.</p>
            {localizationFields.map((field) => (
              <SettingsRow key={field.label} field={field} />
            ))}
          </div>
        )}
        {activeTab === 'identity' && <IdentityFieldsPanel />}
        {activeTab === 'data' && (
          <div>
            <h2 className="text-sm font-bold text-ink mb-1">Data Settings</h2>
            <p className="text-xs text-muted mb-4">Configure data retention and sync preferences.</p>
            {dataFields.map((field) => (
              <SettingsRow key={field.label} field={field} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end" hidden={activeTab === 'identity'}>
        <button className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>
    </div>
  );
};
