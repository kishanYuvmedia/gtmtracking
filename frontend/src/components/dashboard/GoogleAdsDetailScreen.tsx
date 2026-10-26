import React, { useState } from 'react';
import { ArrowLeft, Settings, Activity, CheckCircle2, AlertCircle, TrendingUp, TrendingDown, MoreHorizontal, Trash2 } from 'lucide-react';

type Tab = 'overview' | 'settings' | 'logs';

interface ConnectionState {
  name: string;
  campaignId: string;
  accountId: string;
  status: 'active' | 'paused';
  lastSync: string;
  eventsSynced: number;
  conversions: number;
  spend: string;
}

const connectionData: ConnectionState = {
  name: 'Google Ads Campaign',
  campaignId: 'camp_8x9y0z',
  accountId: '123-456-7890',
  status: 'active',
  lastSync: '3 min ago',
  eventsSynced: 34521,
  conversions: 1247,
  spend: '$12,450',
};

const logs = [
  { timestamp: '2026-05-23 14:23:01', event: 'purchase_complete', status: 'success', response: '200 OK', conversion: '$49.99' },
  { timestamp: '2026-05-23 14:22:45', event: 'add_to_cart', status: 'success', response: '200 OK', conversion: '$29.99' },
  { timestamp: '2026-05-23 14:21:33', event: 'page_view', status: 'failed', response: '429 Rate Limited', conversion: '—' },
  { timestamp: '2026-05-23 14:20:12', event: 'purchase_complete', status: 'success', response: '200 OK', conversion: '$89.99' },
  { timestamp: '2026-05-23 14:19:58', event: 'sign_up', status: 'success', response: '200 OK', conversion: '—' },
];

export const GoogleAdsDetailScreen: React.FC<{ onBack: () => void; onDisconnect: () => void }> = ({ onBack, onDisconnect }) => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showActions, setShowActions] = useState(false);

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-white border border-border flex items-center justify-center">
          <span className="text-base font-bold text-[#4285F4]">G</span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-ink">{connectionData.name}</h1>
            <span className="px-2 py-0.5 rounded-full bg-success/10 text-success text-[10px] font-bold uppercase tracking-wider">Connected</span>
          </div>
          <p className="text-xs text-muted">Google Ads · Account {connectionData.accountId}</p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-0">
          {(['overview', 'settings', 'logs'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="relative">
          <button onClick={() => setShowActions(!showActions)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink border border-border rounded-md hover:border-ink/20 transition-colors">
            <MoreHorizontal className="w-3.5 h-3.5" />
            Actions
          </button>
          {showActions && (
            <div className="absolute top-full right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 py-1 min-w-[160px]">
              <button onClick={() => { setShowActions(false); onDisconnect(); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger/5 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect
              </button>
            </div>
          )}
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Events Synced</p>
              <p className="text-xl font-bold text-ink">{connectionData.eventsSynced.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3 text-success" /><span className="text-xs text-success font-semibold">+12.4%</span></div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Conversions</p>
              <p className="text-xl font-bold text-ink">{connectionData.conversions.toLocaleString()}</p>
              <div className="flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3 text-success" /><span className="text-xs text-success font-semibold">+8.2%</span></div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Ad Spend</p>
              <p className="text-xl font-bold text-ink">{connectionData.spend}</p>
              <div className="flex items-center gap-1 mt-1"><TrendingDown className="w-3 h-3 text-danger" /><span className="text-xs text-danger font-semibold">+3.1%</span></div>
            </div>
            <div className="bg-surface border border-border rounded-xl p-5">
              <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">ROAS</p>
              <p className="text-xl font-bold text-ink">4.2x</p>
              <div className="flex items-center gap-1 mt-1"><TrendingUp className="w-3 h-3 text-success" /><span className="text-xs text-success font-semibold">+0.3x</span></div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-ink">Connection Details</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                ['Account ID', connectionData.accountId],
                ['Campaign ID', connectionData.campaignId],
                ['Status', connectionData.status],
                ['Last Sync', connectionData.lastSync],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 border-b border-border/50">
                  <span className="text-xs text-muted">{label}</span>
                  <span className="text-xs text-ink font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink">Configuration</h3>
          {[
            { label: 'Conversion Window', value: '30 days', type: 'select' as const, options: ['7 days', '14 days', '30 days', '60 days'] },
            { label: 'Match Type', value: 'Email', type: 'select' as const, options: ['Email', 'Phone', 'Address', 'Multi-touch'] },
            { label: 'Auto-tag Conversions', value: 'true', type: 'toggle' as const },
            { label: 'Enhanced Conversions', value: 'true', type: 'toggle' as const },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink">{field.label}</p>
              </div>
              {field.type === 'select' && (
                <select defaultValue={field.value} className="px-3 py-1.5 text-sm border border-border rounded-lg bg-surface text-ink focus:outline-none focus:border-ink/20">
                  {field.options?.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                </select>
              )}
              {field.type === 'toggle' && (
                <button className={`w-9 h-5 rounded-full transition-colors relative ${field.value === 'true' ? 'bg-ink' : 'bg-border'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${field.value === 'true' ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-ink">Sync Logs</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Timestamp</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Event</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Status</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Response</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                  <td className="px-5 py-3 text-xs text-muted font-mono">{log.timestamp}</td>
                  <td className="px-5 py-3 text-xs text-ink font-mono font-medium">{log.event}</td>
                  <td className="px-5 py-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      log.status === 'success' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                    }`}>{log.status}</span>
                  </td>
                  <td className="px-5 py-3 text-xs text-muted font-mono">{log.response}</td>
                  <td className="px-5 py-3 text-xs text-ink text-right font-medium">{log.conversion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
