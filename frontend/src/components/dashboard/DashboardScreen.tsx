import React, { useState } from 'react';
import {
  Activity,
  Users,
  Link2,
  Send,
  TrendingUp,
  TrendingDown,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  MoreHorizontal,
} from 'lucide-react';

const kpiCards = [
  {
    label: 'Total Events',
    value: '104,187',
    change: '+14.3%',
    isPositive: true,
    period: 'vs last 30 days',
    icon: Activity,
  },
  {
    label: 'Unique Users',
    value: '18,432',
    change: '-2.1%',
    isPositive: false,
    period: 'vs last 30 days',
    icon: Users,
  },
  {
    label: 'Connected Sources',
    value: '5',
    change: '+1',
    isPositive: true,
    period: 'this month',
    icon: Link2,
  },
  {
    label: 'Active Destinations',
    value: '3',
    change: '0',
    isPositive: true,
    period: 'syncing',
    icon: Send,
  },
];

const chartData = [
  { date: 'May 12', web: 1200, server: 1100 },
  { date: 'May 13', web: 1350, server: 1200 },
  { date: 'May 14', web: 1100, server: 1050 },
  { date: 'May 15', web: 1800, server: 1600 },
  { date: 'May 16', web: 2400, server: 2200 },
  { date: 'May 17', web: 2800, server: 2600 },
  { date: 'May 18', web: 3200, server: 3000 },
  { date: 'May 19', web: 3500, server: 3300 },
  { date: 'May 20', web: 3800, server: 3600 },
  { date: 'May 21', web: 3600, server: 3400 },
  { date: 'May 22', web: 3200, server: 3000 },
  { date: 'May 23', web: 2800, server: 2600 },
];

const recentEvents = [
  { name: 'page_view', total: '48,291', emq: '78%', updated: 'May 18, 2026 | 12:45 PM', sources: ['Browser'], destinations: 1 },
  { name: 'purchase_complete', total: '12,847', emq: '92%', updated: 'May 18, 2026 | 12:45 PM', sources: ['Server-side'], destinations: 2 },
  { name: 'add_to_cart', total: '8,291', emq: '85%', updated: 'May 18, 2026 | 12:45 PM', sources: ['Browser', 'Mobile'], destinations: 1 },
  { name: 'identify', total: '18,432', emq: '95%', updated: 'May 18, 2026 | 12:45 PM', sources: ['Web SDK'], destinations: 3 },
  { name: 'sign_up', total: '3,291', emq: '88%', updated: 'May 17, 2026 | 09:30 AM', sources: ['Browser'], destinations: 1 },
];

const recentActivity = [
  { action: 'Webhook delivery succeeded', integration: 'Salesforce CRM', time: '2 min ago', status: 'success' as const },
  { action: 'Event batch synced', integration: 'Facebook Ads', time: '5 min ago', status: 'success' as const },
  { action: 'DNS verification pending', integration: 'example.com', time: '12 min ago', status: 'pending' as const },
  { action: 'Connection timeout', integration: 'Google Analytics', time: '1 hr ago', status: 'error' as const },
  { action: 'Script installed verified', integration: 'mysite.io', time: '2 hr ago', status: 'success' as const },
];

const connections = [
  { name: 'Salesforce', type: 'CRM', status: 'connected' as const, lastSync: '2 min ago', eventsToday: 1247 },
  { name: 'Facebook Ads', type: 'Destination', status: 'connected' as const, lastSync: '5 min ago', eventsToday: 3847 },
  { name: 'Webhook', type: 'CRM', status: 'connected' as const, lastSync: '1 min ago', eventsToday: 892 },
  { name: 'Google Analytics', type: 'Destination', status: 'error' as const, lastSync: '1 hr ago', eventsToday: 0 },
  { name: 'Shopify', type: 'CRM', status: 'pending' as const, lastSync: '—', eventsToday: 0 },
];

function MiniLineChart() {
  const maxVal = 3800;
  const w = 800;
  const h = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 40 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const getX = (i: number) => padding.left + (i / (chartData.length - 1)) * chartW;
  const getY = (val: number) => padding.top + chartH - (val / maxVal) * chartH;

  const webPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.web)}`)
    .join(' ');

  const serverPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.server)}`)
    .join(' ');

  const webAreaPath = `${webPath} L ${getX(chartData.length - 1)} ${padding.top + chartH} L ${getX(0)} ${padding.top + chartH} Z`;

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[220px]"
        onMouseLeave={() => setHoverIdx(null)}
      >
        {[0, 950, 1900, 2850, 3800].map((val) => (
          <g key={val}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={w - padding.right}
              y2={getY(val)}
              stroke="#E5E5E5"
              strokeWidth="1"
            />
            <text x={padding.left - 8} y={getY(val) + 4} textAnchor="end" className="fill-muted" fontSize="10">
              {val >= 1000 ? `${val / 1000}k` : val}
            </text>
          </g>
        ))}

        {chartData.map((d, i) => (
          <text key={i} x={getX(i)} y={h - 8} textAnchor="middle" className="fill-muted" fontSize="10">
            {d.date.replace('May ', '')}
          </text>
        ))}

        <path d={webAreaPath} fill="url(#webGradient)" opacity="0.15" />
        <path d={webPath} fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={serverPath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {chartData.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.web)} r="3" fill="white" stroke="#0EA5E9" strokeWidth="2" />
            <circle cx={getX(i)} cy={getY(d.server)} r="3" fill="white" stroke="#F59E0B" strokeWidth="2" />
          </g>
        ))}

        {hoverIdx !== null && (
          <>
            <line
              x1={getX(hoverIdx)}
              y1={padding.top}
              x2={getX(hoverIdx)}
              y2={padding.top + chartH}
              stroke="#010101"
              strokeWidth="1"
              strokeDasharray="4,4"
              opacity="0.3"
            />
            <rect x={getX(hoverIdx) - 50} y={padding.top - 8} width="100" height="50" rx="6" fill="#010101" />
            <text x={getX(hoverIdx)} y={padding.top + 12} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
              Web: {chartData[hoverIdx].web.toLocaleString()}
            </text>
            <text x={getX(hoverIdx)} y={padding.top + 28} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
              Server: {chartData[hoverIdx].server.toLocaleString()}
            </text>
          </>
        )}

        {chartData.map((_, i) => (
          <rect
            key={i}
            x={getX(i) - chartW / chartData.length / 2}
            y={padding.top}
            width={chartW / chartData.length}
            height={chartH}
            fill="transparent"
            onMouseEnter={() => setHoverIdx(i)}
          />
        ))}

        <defs>
          <linearGradient id="webGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0EA5E9" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#0EA5E9" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>

      <div className="flex items-center justify-end gap-4 mt-2 text-xs text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5E9]" />
          <span>Web</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
          <span>Server</span>
        </div>
      </div>
    </div>
  );
}

export const DashboardScreen: React.FC = () => {
  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
        <p className="text-sm text-muted mt-1.5">Monitor your data, integrations and analytics in one place.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-muted uppercase tracking-wide">{card.label}</span>
                <Icon className="w-4 h-4 text-brand" />
              </div>
              <div className="text-2xl font-bold text-ink">{card.value}</div>
              <div className="flex items-center gap-1.5 mt-2">
                {card.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5 text-success" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5 text-danger" />
                )}
                <span className={`text-xs font-semibold ${card.isPositive ? 'text-success' : 'text-danger'}`}>
                  {card.change}
                </span>
                <span className="text-xs text-muted">{card.period}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-ink">Event Activity</h2>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>May 12, 2026 – May 23, 2026</span>
            <select className="px-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink focus:outline-none focus:border-ink/20">
              <option>Daily</option>
              <option>Weekly</option>
            </select>
          </div>
        </div>
        <MiniLineChart />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-surface border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Recent Events</h2>
            <button className="text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Event Name</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Total Events</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">EMQ Score</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Sources</th>
                  <th className="px-5 py-3 text-xs font-semibold text-muted uppercase tracking-wide">Dest.</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr key={event.name} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-xs text-brand font-semibold">{event.name}</span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-ink">{event.total}</td>
                    <td className="px-5 py-3 text-muted">{event.emq}</td>
                    <td className="px-5 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {event.sources.map((s) => (
                          <span key={s} className="px-2 py-0.5 bg-bg border border-border rounded text-[11px] text-muted">{s}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-bg border border-border text-xs font-semibold text-ink">
                        {event.destinations}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink">Integration Activity</h2>
            <button className="text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors">
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-border/50">
            {recentActivity.map((item, i) => (
              <div key={i} className="px-5 py-3.5 hover:bg-bg/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {item.status === 'success' && <CheckCircle2 className="w-4 h-4 text-success" />}
                    {item.status === 'pending' && <Clock className="w-4 h-4 text-warning" />}
                    {item.status === 'error' && <AlertCircle className="w-4 h-4 text-danger" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink truncate">{item.action}</p>
                    <p className="text-[11px] text-muted mt-0.5">{item.integration}</p>
                  </div>
                  <span className="text-[11px] text-muted whitespace-nowrap">{item.time}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Connection Status</h2>
          <button className="text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors">
            Manage <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 p-5">
          {connections.map((conn) => (
            <div key={conn.name} className="border border-border rounded-lg p-4 hover:border-ink/20 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center">
                    <Link2 className="w-3.5 h-3.5 text-muted" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink">{conn.name}</p>
                    <p className="text-[11px] text-muted">{conn.type}</p>
                  </div>
                </div>
                <button className="text-muted hover:text-ink transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    conn.status === 'connected'
                      ? 'bg-success'
                      : conn.status === 'error'
                      ? 'bg-danger'
                      : 'bg-warning'
                  }`}
                />
                <span className="text-[11px] text-muted capitalize">{conn.status}</span>
                <span className="text-[11px] text-muted">· {conn.lastSync}</span>
              </div>
              {conn.eventsToday > 0 && (
                <p className="text-[11px] text-muted mt-2">{conn.eventsToday.toLocaleString()} events today</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
