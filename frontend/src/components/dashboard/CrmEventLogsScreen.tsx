import React, { useState } from 'react';
import { ChevronRight, X, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface CrmEventLogsProps {
  onBack: () => void;
}

type LogFilter = 'all' | 'success' | 'failed' | 'pending';

interface LogEntry {
  timestamp: string;
  event: string;
  eventId: string;
  status: 'success' | 'failed' | 'pending';
  response: string;
  records: number;
  processingTime: string;
  dataSize: string;
  region: string;
  ipAddress: string;
  userAgent: string;
  rawData: Record<string, unknown>;
}

const sampleLogs: LogEntry[] = [
  { timestamp: '2024-01-15 14:23:01', event: 'contact.updated', eventId: 'evt_8fGkX2p01', status: 'success', response: '200 OK', records: 1, processingTime: '11.2ms', dataSize: '3.1 KB', region: 'North America (US-East)', ipAddress: '192.168.1.42', userAgent: 'Chrome 124', rawData: { event_type: 'contact.updated', timestamp: '2024-01-15T14:23:01Z', properties: { order_id: 'ord_9x8y7z', total: 299.99, currency: 'USD', items: 3, is_converted: true }, context: { library: 'salesforce-webhook', ip_address: '192.168.1.42', user_agent: 'Chrome 124' } } },
  { timestamp: '2024-01-15 14:22:45', event: 'lead.created', eventId: 'evt_3aBcDeFg', status: 'success', response: '201 Created', records: 1, processingTime: '8.4ms', dataSize: '1.8 KB', region: 'Europe (EU-West)', ipAddress: '10.0.0.15', userAgent: 'Safari 17', rawData: { event_type: 'lead.created', timestamp: '2024-01-15T14:22:45Z', properties: { lead_id: 'ldr_4k5l6m', name: 'Jane Smith', email: 'jane@example.com' }, context: { library: 'salesforce-webhook', ip_address: '10.0.0.15', user_agent: 'Safari 17' } } },
  { timestamp: '2024-01-15 14:21:33', event: 'deal.stage_changed', eventId: 'evt_7hIjKlMn', status: 'failed', response: '422 Unprocessable', records: 0, processingTime: '320ms', dataSize: '0.4 KB', region: 'North America (US-West)', ipAddress: '172.16.0.88', userAgent: 'Firefox 125', rawData: { event_type: 'deal.stage_changed', timestamp: '2024-01-15T14:21:33Z', properties: { deal_id: 'dl_2n3o4p', stage: 'negotiation', error: 'Missing required field: amount' }, context: { library: 'salesforce-webhook', ip_address: '172.16.0.88', user_agent: 'Firefox 125' } } },
  { timestamp: '2024-01-15 14:20:12', event: 'opportunity.won', eventId: 'evt_9qRsTuVw', status: 'success', response: '200 OK', records: 1, processingTime: '9.1ms', dataSize: '2.4 KB', region: 'Asia Pacific (AP-South)', ipAddress: '192.168.5.123', userAgent: 'Chrome 124', rawData: { event_type: 'opportunity.won', timestamp: '2024-01-15T14:20:12Z', properties: { opportunity_id: 'opp_5w6x7y', amount: 15000, currency: 'USD' }, context: { library: 'salesforce-webhook', ip_address: '192.168.5.123', user_agent: 'Chrome 124' } } },
  { timestamp: '2024-01-15 14:19:58', event: 'contact.updated', eventId: 'evt_1aB2cD3e', status: 'success', response: '200 OK', records: 3, processingTime: '14.7ms', dataSize: '4.2 KB', region: 'North America (US-East)', ipAddress: '192.168.1.99', userAgent: 'Edge 124', rawData: { event_type: 'contact.updated', timestamp: '2024-01-15T14:19:58Z', properties: { contacts_updated: 3, batch: true }, context: { library: 'salesforce-webhook', ip_address: '192.168.1.99', user_agent: 'Edge 124' } } },
  { timestamp: '2024-01-15 14:18:44', event: 'lead.created', eventId: 'evt_4fG5hI6j', status: 'pending', response: '—', records: 0, processingTime: '—', dataSize: '—', region: 'Europe (EU-Central)', ipAddress: '10.1.2.34', userAgent: 'Chrome 124', rawData: { event_type: 'lead.created', timestamp: '2024-01-15T14:18:44Z', properties: { status: 'queued' }, context: { library: 'salesforce-webhook', ip_address: '10.1.2.34', user_agent: 'Chrome 124' } } },
];

export const CrmEventLogsScreen: React.FC<CrmEventLogsProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'configuration'>('logs');
  const [filter, setFilter] = useState<LogFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [drawerTab, setDrawerTab] = useState<'overview' | 'headers'>('overview');
  const [rawExpanded, setRawExpanded] = useState(true);

  const filteredLogs = sampleLogs.filter((log) => {
    if (filter !== 'all' && log.status !== filter) return false;
    if (searchQuery && !log.event.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const formatJson = (obj: Record<string, unknown>, indent = 0): React.ReactNode[] => {
    const lines: React.ReactNode[] = [];
    const pad = '  '.repeat(indent);
    const entries = Object.entries(obj);

    entries.forEach(([key, value], i) => {
      const isLast = i === entries.length - 1;
      const comma = isLast ? '' : ',';

      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        lines.push(
          <div key={`${key}-open`}>
            {pad}<span className="json-key">"{key}"</span>: {'{'}
          </div>
        );
        lines.push(...formatJson(value as Record<string, unknown>, indent + 1));
        lines.push(
          <div key={`${key}-close`}>
            {pad}{'}'}{comma}
          </div>
        );
      } else if (Array.isArray(value)) {
        lines.push(
          <div key={`${key}-arr`}>
            {pad}<span className="json-key">"{key}"</span>: [{value.map((v) => typeof v === 'string' ? `"${v}"` : v).join(', ')}]{comma}
          </div>
        );
      } else if (typeof value === 'string') {
        lines.push(
          <div key={`${key}-str`}>
            {pad}<span className="json-key">"{key}"</span>: <span className="json-string">"{value}"</span>{comma}
          </div>
        );
      } else {
        lines.push(
          <div key={`${key}-num`}>
            {pad}<span className="json-key">"{key}"</span>: <span className="json-bool">{String(value)}</span>{comma}
          </div>
        );
      }
    });

    return lines;
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <button onClick={onBack} className="hover:text-ink transition-colors">CRM Connection</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink font-medium">Salesforce</span>
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
                    <tr
                      key={idx}
                      onClick={() => setSelectedLog(log)}
                      className="hover:bg-bg/50 transition-colors cursor-pointer"
                    >
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

      {selectedLog && (
        <>
          <div
            className="fixed inset-0 bg-ink/20 z-40 transition-opacity"
            onClick={() => setSelectedLog(null)}
          />
          <div className="fixed top-0 right-0 h-full w-[340px] bg-surface border-l border-border z-50 flex flex-col shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h3 className="text-sm font-bold text-ink">{selectedLog.event}</h3>
                <p className="text-xs text-muted mt-0.5 font-mono">{selectedLog.eventId}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-bg transition-colors"
              >
                <X className="w-4 h-4 text-muted" />
              </button>
            </div>

            <div className="border-b border-border">
              <div className="flex gap-0 px-5">
                {(['overview', 'headers'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setDrawerTab(tab)}
                    className={`px-0 py-3 text-xs font-semibold capitalize transition-colors border-b-2 -mb-[1px] mr-4 ${
                      drawerTab === tab
                        ? 'border-ink text-ink'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {drawerTab === 'overview' && (
                <div className="p-5 space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Processing Time</p>
                      <p className="text-sm font-bold text-ink">{selectedLog.processingTime}</p>
                    </div>
                    <div className="bg-bg border border-border rounded-xl p-3">
                      <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Data Size</p>
                      <p className="text-sm font-bold text-ink">{selectedLog.dataSize}</p>
                    </div>
                  </div>

                  <div className="bg-bg border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setRawExpanded(!rawExpanded)}
                      className="w-full flex items-center justify-between px-4 py-3 text-xs font-bold text-ink uppercase tracking-wider"
                    >
                      Raw Event Data
                      {rawExpanded ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                    </button>
                    {rawExpanded && (
                      <div className="px-4 pb-4 border-t border-border">
                        <pre className="text-xs font-mono text-ink overflow-x-auto p-3 bg-surface rounded-lg mt-3 leading-relaxed">
                          <span className="text-charbracket">{'{'}</span>
                          {'\n'}
                          {formatJson(selectedLog.rawData)}
                          {'\n'}
                          <span className="text-charbracket">{'}'}</span>
                        </pre>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-ink uppercase tracking-wider">User Context</h4>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted">Region</span>
                        <span className="text-xs text-ink font-medium">{selectedLog.region}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted">IP Address</span>
                        <span className="text-xs text-ink font-mono font-medium">{selectedLog.ipAddress}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-xs text-muted">User Agent</span>
                        <span className="text-xs text-ink font-medium">{selectedLog.userAgent}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {drawerTab === 'headers' && (
                <div className="p-5">
                  <p className="text-sm text-muted">Headers will appear here.</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border flex gap-2">
              <button className="flex-1 py-2 text-xs font-semibold text-ink border border-border rounded-lg hover:bg-bg transition-colors">
                Copy Event ID
              </button>
              <button className="flex-1 py-2 text-xs font-semibold text-white bg-ink rounded-lg hover:bg-ink-soft transition-colors">
                Download Full JSON
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`
        .json-key { color: #7c3aed; }
        .json-string { color: #059669; }
        .json-bool { color: #d97706; }
        .json-bracket { color: #6b7280; }
        .text-charbracket { color: #6b7280; }
      `}</style>
    </div>
  );
};
