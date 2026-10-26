import React, { useState } from 'react';
import { ChevronLeft, Pencil, X, Check, Copy } from 'lucide-react';

interface ConnectedFacebookAdsProps {
  onBack: () => void;
  onDisconnect: () => void;
}

type Tab = 'overview' | 'settings' | 'logs';

interface ConnectionField {
  label: string;
  value: string;
  masked?: boolean;
}

const initialFields: ConnectionField[] = [
  { label: 'Pixel ID', value: '123456789012345' },
  { label: 'Access Token', value: 'EAAJmzPX43kBAP', masked: true },
  { label: 'Test Event Code', value: 'TEST12345' },
];

const eventMapping = [
  { event: 'page_view', status: 'forwarding' as const },
  { event: 'button_click', status: 'forwarding' as const },
  { event: 'purchase', status: 'forwarding' as const },
  { event: 'sign_up', status: 'forwarding' as const },
  { event: 'add_to_cart', status: 'forwarding' as const },
];

export const ConnectedFacebookAdsScreen: React.FC<ConnectedFacebookAdsProps> = ({
  onBack,
  onDisconnect,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [fields, setFields] = useState<ConnectionField[]>(initialFields);
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleStartEdit = (idx: number) => {
    setEditingIdx(idx);
    setEditValue(fields[idx].value);
  };

  const handleSaveEdit = (idx: number) => {
    setFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, value: editValue } : f))
    );
    setEditingIdx(null);
  };

  const handleCancelEdit = () => {
    setEditingIdx(null);
  };

  const handleCopy = (value: string, idx: number) => {
    navigator.clipboard.writeText(value);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Destinations</span>
      </button>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="p-6 pb-0">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0">
                <span className="text-white text-sm font-bold">F</span>
              </div>
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-xl font-bold text-ink">Facebook Ads</h1>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-success/10 text-success text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-success" />
                    Active
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">
                  Connected · Last synced 2 minutes ago
                </p>
              </div>
            </div>
            <button
              onClick={onDisconnect}
              className="px-3.5 py-1.5 text-xs font-semibold text-danger border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Events today', value: '12,847' },
              { label: 'Success rate', value: '99.2%' },
              { label: 'Avg latency', value: '44ms' },
            ].map((metric) => (
              <div
                key={metric.label}
                className="bg-bg rounded-xl p-6 border border-border hover:border-ink/15 transition-colors"
              >
                <p className="text-xl font-bold text-ink tracking-tight">{metric.value}</p>
                <p className="text-[11px] text-muted mt-1 font-medium">{metric.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 border-b border-border">
          <div className="flex gap-0">
            {(['overview', 'settings', 'logs'] as Tab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px] ${
                  activeTab === tab
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-5">
              <div className="bg-bg rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <h3 className="text-sm font-bold text-ink">Connection Details</h3>
                </div>
                <div className="divide-y divide-border/60">
                  {fields.map((field, idx) => (
                    <div
                      key={field.label}
                      className="px-5 py-3.5 flex items-center justify-between group hover:bg-surface transition-colors"
                    >
                      <span className="text-xs text-muted w-28 shrink-0">{field.label}</span>
                      {editingIdx === idx ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            autoFocus
                            className="flex-1 px-2.5 py-1.5 text-sm border border-border rounded-md bg-surface text-ink focus:outline-none focus:ring-1 focus:ring-ink/20"
                          />
                          <button
                            onClick={() => handleSaveEdit(idx)}
                            className="p-1 rounded-md text-success hover:bg-success/10 transition-colors"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="p-1 rounded-md text-muted hover:bg-bg transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex-1 flex items-center justify-end gap-2">
                          <span
                            className={`text-sm font-medium text-ink ${
                              field.masked ? 'tracking-[0.2em] font-mono text-xs' : ''
                            }`}
                          >
                            {field.value}
                          </span>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleCopy(field.value, idx)}
                              className="p-1 rounded-md text-muted hover:text-ink hover:bg-bg transition-colors"
                              title="Copy"
                            >
                              {copiedIdx === idx ? (
                                <Check className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleStartEdit(idx)}
                              className="p-1 rounded-md text-muted hover:text-ink hover:bg-bg transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-bg rounded-xl border border-border overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border">
                  <h3 className="text-sm font-bold text-ink">Event Mapping</h3>
                </div>
                <div className="divide-y divide-border/60">
                  {eventMapping.map((item) => (
                    <div
                      key={item.event}
                      className="px-5 py-3.5 flex items-center justify-between hover:bg-surface transition-colors"
                    >
                      <span className="text-sm font-mono text-ink font-medium">
                        {item.event}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success" />
                        <span className="text-xs text-success font-medium">Forwarding</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Settings will appear here.</p>
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="text-center py-12">
              <p className="text-sm text-muted">Logs will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
