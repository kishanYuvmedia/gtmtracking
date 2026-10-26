import React, { useState } from 'react';
import { ChevronRight, Search } from 'lucide-react';

interface CrmLogsProps {
  onBack: () => void;
}

type LogFilter = 'all' | 'success' | 'failed' | 'pending';

const sampleLogs = [
  { timestamp: '2024-01-15 14:23:01', event: 'contact.updated', status: 'success', response: '200 OK', records: 1 },
  { timestamp: '2024-01-15 14:22:45', event: 'lead.created', status: 'success', response: '201 Created', records: 1 },
  { timestamp: '2024-01-15 14:21:33', event: 'deal.stage_changed', status: 'failed', response: '422 Unprocessable', records: 0 },
  { timestamp: '2024-01-15 14:20:12', event: 'opportunity.won', status: 'success', response: '200 OK', records: 1 },
  { timestamp: '2024-01-15 14:19:58', event: 'contact.updated', status: 'success', response: '200 OK', records: 3 },
  { timestamp: '2024-01-15 14:18:44', event: 'lead.created', status: 'pending', response: '—', records: 0 },
];

export const CrmLogsScreen: React.FC<CrmLogsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'configuration'>('logs');
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = sampleLogs.filter((log) => {
    if (filter !== 'all' && log.status !== filter) return false;
    if (searchQuery && !log.event.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <button onClick={onBack} className="hover:text-ink transition-colors">CRM Connection</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink font-medium">Connect Shopify</span>
      </nav>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {(['logs', 'configuration'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-[1px] ${
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

      {activeTab === 'logs' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Event Logs</h2>
            <div className="flex items-center gap-2 text-xs text-ink font-semibold">
              Salesforce
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-success">Connected</span>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            {(['all', 'success', 'failed', 'pending'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs font-semibold capitalize transition-colors pb-0.5 border-b-2 ${
                  filter === f
                    ? 'border-ink text-ink'
                    : 'border-transparent text-muted hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
            <div className="ml-auto relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
              <input
                type="text"
                placeholder="Search Events"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-search pl-9 w-44"
              />
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[550px]">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Timestamp</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Event</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Status</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Response</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Records</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {filteredLogs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-bg/50 transition-colors">
                      <td className="px-5 py-3 text-xs text-muted font-mono">{log.timestamp}</td>
                      <td className="px-5 py-3 text-sm text-ink font-mono font-medium">{log.event}</td>
                      <td className="px-5 py-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          log.status === 'success'
                            ? 'bg-success/10 text-success'
                            : log.status === 'failed'
                            ? 'bg-danger/10 text-danger'
                            : 'bg-warning/10 text-warning'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted font-mono">{log.response}</td>
                      <td className="px-5 py-3 text-sm text-ink text-right font-medium">{log.records}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredLogs.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted">No events match your filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'configuration' && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">Configuration will appear here.</p>
        </div>
      )}
    </div>
  );
};
