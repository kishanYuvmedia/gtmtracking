import React, { useEffect, useRef, useState } from 'react';
import {
  Filter,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Eye,
  Pencil,
  Trash2,
  Search,
  Download,
  ChevronUp,
  X,
  PenLine,
} from 'lucide-react';
import { FilterDrawer, FilterState } from './FilterDrawer';
import { DatePickerPopover } from './DatePickerPopover';
import { api } from '../../lib/api';
import { useWebsiteFilter } from '../../lib/websiteFilter';
import { LogsScreen } from './LogsScreen';

interface OverviewCounts { events: number; unique_users: number; unique_visitors: number; sessions: number }
interface OverviewEventRow { name: string; total: number; unique_users: number; last_seen: string; sources: string[]; destinations: number }
interface OverviewResponse {
  range: { from: string; to: string; interval: 'day' | 'week' | 'month'; timezone: string };
  totals: OverviewCounts;
  previous: OverviewCounts;
  trend: { bucket: string; web: number; server: number; unique_users: number }[];
  events: OverviewEventRow[];
}
interface ChartPoint { label: string; web: number; server: number }

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 24 * 60 * 60 * 1000;

function formatRangeDate(d: Date) {
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

function bucketLabel(bucket: string, interval: 'day' | 'week' | 'month') {
  const [year, month, day] = bucket.split('-').map(Number);
  return interval === 'month' ? `${MONTHS_SHORT[month - 1]} ${String(year).slice(2)}` : `${MONTHS_SHORT[month - 1]} ${day}`;
}

function percentChange(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function niceMax(value: number) {
  if (value <= 4) return 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(value)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((m) => m * 4 >= value) || magnitude * 10;
  return step * 4;
}

const TrendBadge: React.FC<{ change: number | null }> = ({ change }) => {
  if (change === null) return <span className="text-[11px] text-muted">No prior data</span>;
  const up = change >= 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <div className="flex items-center gap-1 mt-1">
      <Icon className={`w-3 h-3 ${up ? 'text-success' : 'text-warning'}`} />
      <span className={`text-[11px] font-semibold ${up ? 'text-success' : 'text-warning'}`}>{up ? '+' : ''}{change.toFixed(1)}%</span>
    </div>
  );
};

interface MiniLineChartProps {
  height?: number;
  data: ChartPoint[];
}

const MiniLineChart: React.FC<MiniLineChartProps> = ({ height = 220, data: chartData }) => {
  const maxVal = niceMax(Math.max(0, ...chartData.map((d) => Math.max(d.web, d.server))));
  const w = 800;
  const h = height;
  const padding = { top: 20, right: 20, bottom: 30, left: 45 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;

  const getX = (i: number) => padding.left + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartW : chartW / 2);
  const getY = (val: number) => padding.top + chartH - (val / maxVal) * chartH;

  const webPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.web)}`)
    .join(' ');

  const serverPath = chartData
    .map((d, i) => `${i === 0 ? 'M' : 'L'} ${getX(i)} ${getY(d.server)}`)
    .join(' ');

  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const yTicks = [0, 1, 2, 3, 4].map((tick) => (maxVal / 4) * tick);
  const labelEvery = Math.max(1, Math.ceil(chartData.length / 12));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full"
        style={{ height: `${h}px` }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((val) => (
          <g key={val}>
            <line
              x1={padding.left}
              y1={getY(val)}
              x2={w - padding.right}
              y2={getY(val)}
              stroke="#E5E7EB"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <text x={padding.left - 8} y={getY(val) + 4} textAnchor="end" className="fill-[#9CA3AF]" fontSize="10">
              {val >= 1000 ? `${+(val / 1000).toFixed(1)}k` : +val.toFixed(1)}
            </text>
          </g>
        ))}

        {chartData.map((d, i) => (i % labelEvery === 0 || i === chartData.length - 1) && (
          <text key={i} x={getX(i)} y={h - 8} textAnchor="middle" className="fill-[#9CA3AF]" fontSize="10">
            {d.label}
          </text>
        ))}

        <path d={webPath} fill="none" stroke="#06B6D4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d={serverPath} fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {chartData.map((d, i) => (
          <g key={i}>
            <circle cx={getX(i)} cy={getY(d.web)} r="3" fill="white" stroke="#06B6D4" strokeWidth="2" />
            <circle cx={getX(i)} cy={getY(d.server)} r="3" fill="white" stroke="#F97316" strokeWidth="2" />
          </g>
        ))}

        {hoverIdx !== null && (
          <>
            <line
              x1={getX(hoverIdx)}
              y1={padding.top}
              x2={getX(hoverIdx)}
              y2={padding.top + chartH}
              stroke="#374151"
              strokeWidth="1"
              strokeDasharray="4,4"
            />
            <rect x={Math.min(Math.max(getX(hoverIdx) - 55, 0), w - 110)} y={padding.top - 8} width="110" height="62" rx="6" fill="#1F2937" />
            <text x={Math.min(Math.max(getX(hoverIdx), 55), w - 55)} y={padding.top + 8} textAnchor="middle" fill="#9CA3AF" fontSize="9">
              {chartData[hoverIdx].label}
            </text>
            <text x={Math.min(Math.max(getX(hoverIdx), 55), w - 55)} y={padding.top + 24} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
              Web: {chartData[hoverIdx].web.toLocaleString()}
            </text>
            <text x={Math.min(Math.max(getX(hoverIdx), 55), w - 55)} y={padding.top + 40} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
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
      </svg>
    </div>
  );
};

const initialFilters: FilterState = {
  destinationPlatform: '',
  eventName: '',
  campaignName: { operator: 'Contains', value: '' },
  adName: { operator: 'Contains', value: '' },
  utmSource: { operator: 'Contains', value: '' },
  utmMedium: { operator: 'Contains', value: '' },
  eventSource: { operator: 'Equals', value: '' },
  eventSourceId: { operator: 'Contains', value: '' },
  deviceCategory: '',
  deviceOS: '',
  browser: '',
  country: '',
  region: '',
  city: '',
  productName: { operator: 'Contains', value: '' },
  value: { operator: 'Greater than', value: '' },
  currency: 'INR',
  dateRange: '',
  startDate: '',
  endDate: '',
  timeStart: '',
  timeEnd: '',
};

interface EventOverviewScreenProps {
  initialTab?: 'overview' | 'users' | 'logs';
}

export const EventOverviewScreen: React.FC<EventOverviewScreenProps> = ({ initialTab = 'overview' }) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'users' | 'logs'>(initialTab);
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>(initialFilters);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date(end.getTime() - 29 * DAY_MS);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  });
  const selectedDateRange = `${formatRangeDate(dateRange.start)} – ${formatRangeDate(dateRange.end)}`;
  const [granularity, setGranularity] = useState<'Daily' | 'Weekly' | 'Monthly'>('Daily');
  const { selectedWebsiteId } = useWebsiteFilter();
  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState('');
  const interval = granularity === 'Weekly' ? 'week' : granularity === 'Monthly' ? 'month' : 'day';
  const eventNameFilter = appliedFilters.eventName && appliedFilters.eventName !== 'All Events' ? appliedFilters.eventName : '';

  useEffect(() => {
    if (activeSubTab !== 'overview') return;
    let cancelled = false;
    setOverviewLoading(true);
    setOverviewError('');
    // The picker's end date is inclusive; the API range end is exclusive.
    const to = new Date(dateRange.end);
    to.setHours(24, 0, 0, 0);
    api.getEventOverview({
      websiteId: selectedWebsiteId || undefined,
      eventName: eventNameFilter || undefined,
      from: dateRange.start,
      to: new Date(Math.min(to.getTime(), Date.now() + 60_000)),
      interval,
    })
      .then((response: OverviewResponse) => { if (!cancelled) setOverview(response); })
      .catch((cause: unknown) => {
        if (!cancelled) setOverviewError(cause instanceof Error ? cause.message : 'Unable to load the event overview');
      })
      .finally(() => { if (!cancelled) setOverviewLoading(false); });
    return () => { cancelled = true; };
  }, [activeSubTab, selectedWebsiteId, eventNameFilter, dateRange, interval]);

  const chartPoints: ChartPoint[] = (overview?.trend || []).map((point) => ({
    label: bucketLabel(point.bucket, overview!.range.interval),
    web: point.web,
    server: point.server,
  }));
  const overviewEvents = overview?.events || [];
  const [granularityOpen, setGranularityOpen] = useState(false);
  const granularityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (granularityRef.current && !granularityRef.current.contains(e.target as Node)) {
        setGranularityOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const getActiveFilterCount = () => {
    let count = 0;
    if (appliedFilters.destinationPlatform) count++;
    if (appliedFilters.eventName) count++;
    if (appliedFilters.campaignName.value) count++;
    if (appliedFilters.adName.value) count++;
    if (appliedFilters.utmSource.value) count++;
    if (appliedFilters.utmMedium.value) count++;
    if (appliedFilters.eventSource.value) count++;
    if (appliedFilters.eventSourceId.value) count++;
    if (appliedFilters.deviceCategory) count++;
    if (appliedFilters.deviceOS) count++;
    if (appliedFilters.browser) count++;
    if (appliedFilters.country) count++;
    if (appliedFilters.region) count++;
    if (appliedFilters.city) count++;
    if (appliedFilters.productName.value) count++;
    if (appliedFilters.value.value) count++;
    if (appliedFilters.dateRange) count++;
    return count;
  };

  const activeFilterCount = getActiveFilterCount();

  const getActiveFilterChips = () => {
    const chips: { key: string; label: string }[] = [];
    if (appliedFilters.destinationPlatform) chips.push({ key: 'platform', label: appliedFilters.destinationPlatform });
    if (appliedFilters.eventName) chips.push({ key: 'event', label: appliedFilters.eventName });
    if (appliedFilters.campaignName.value) chips.push({ key: 'campaign', label: appliedFilters.campaignName.value });
    if (appliedFilters.utmSource.value) chips.push({ key: 'utmSource', label: appliedFilters.utmSource.value });
    if (appliedFilters.deviceCategory) chips.push({ key: 'device', label: appliedFilters.deviceCategory });
    if (appliedFilters.country) chips.push({ key: 'country', label: appliedFilters.country });
    if (appliedFilters.dateRange) chips.push({ key: 'date', label: appliedFilters.dateRange });
    return chips;
  };

  const removeFilterChip = (key: string) => {
    setAppliedFilters(prev => {
      const next = { ...prev };
      switch (key) {
        case 'platform': next.destinationPlatform = ''; break;
        case 'event': next.eventName = ''; break;
        case 'campaign': next.campaignName = { ...next.campaignName, value: '' }; break;
        case 'utmSource': next.utmSource = { ...next.utmSource, value: '' }; break;
        case 'device': next.deviceCategory = ''; break;
        case 'country': next.country = ''; break;
        case 'date': next.dateRange = ''; break;
      }
      return next;
    });
  };

  const clearAllFilters = () => {
    setAppliedFilters({ ...initialFilters });
  };

  // Drill into the raw events for this name in the Logs tab.
  const handleEventClick = (eventName: string) => {
    setAppliedFilters((prev) => ({ ...prev, eventName }));
    setActiveSubTab('logs');
  };

  const chips = getActiveFilterChips();

  const subTabs = [
    { id: 'overview' as const, label: 'Event Overview' },
    { id: 'users' as const, label: 'Users' },
    { id: 'logs' as const, label: 'Logs' },
  ];

  return (
    <div className="space-y-5">
      {/* Sub-tabs Header */}
      <div className="flex items-center justify-between border-b border-border pb-0">
        <div className="flex items-center gap-0">
          {subTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id)}
              className={`px-4 py-2.5 text-[13px] font-medium transition-colors border-b-2 -mb-[1px] ${
                activeSubTab === tab.id
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setFilterDrawerOpen(true)}
            className="flex items-center gap-1.5 text-[12px] text-muted hover:text-ink transition-colors"
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
          </button>
          <button
            onClick={() => setDatePickerOpen(true)}
            className="flex items-center gap-2 text-[12px] text-muted hover:text-ink transition-colors"
          >
            <span>{selectedDateRange}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Filter Chips */}
      {chips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {chips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] rounded-md text-[11px] text-[#1D4ED8] font-medium"
            >
              {chip.label}
              <button
                onClick={() => removeFilterChip(chip.key)}
                className="p-0.5 rounded-full hover:bg-[#DBEAFE] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            onClick={clearAllFilters}
            className="text-[11px] text-[#3B82F6] hover:text-[#2563EB] font-medium transition-colors"
          >
            Clear all
          </button>
        </div>
      )}

      {activeSubTab === 'overview' && (
        <>
          {/* Monitoring Section */}
          <div>
            <h2 className="text-[14px] font-semibold text-ink mb-3">Monitoring</h2>
            {overviewError && (
              <p role="alert" className="mb-3 rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs text-danger">{overviewError}</p>
            )}
            <div className="flex gap-2 flex-wrap">
              <div className="bg-surface border border-border rounded-lg px-5 py-4 min-w-[163px]">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">TOTAL EVENTS</p>
                <p className="text-xl font-bold text-ink">{overviewLoading && !overview ? '…' : (overview?.totals.events || 0).toLocaleString()}</p>
                {overview && <TrendBadge change={percentChange(overview.totals.events, overview.previous.events)} />}
              </div>
              <div className="bg-surface border border-border rounded-lg px-5 py-4 min-w-[163px]">
                <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1" title="Distinct IP addresses">UNIQUE USERS (BY IP)</p>
                <p className="text-xl font-bold text-ink">{overviewLoading && !overview ? '…' : (overview?.totals.unique_users || 0).toLocaleString()}</p>
                {overview && <TrendBadge change={percentChange(overview.totals.unique_users, overview.previous.unique_users)} />}
              </div>
            </div>
          </div>

          {/* Events Over Time Section */}
          <div>
            <h2 className="text-[14px] font-semibold text-ink mb-3">Events Over Time</h2>
            <div className="border-b border-border pb-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#06B6D4]" />
                    <span className="text-[11px] text-muted">Web</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F97316]" />
                    <span className="text-[11px] text-muted">Server</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    title="Annotate"
                    aria-label="Annotate"
                    className="w-7 h-7 flex items-center justify-center border border-border rounded-md text-muted hover:text-ink hover:bg-bg transition-colors"
                  >
                    <PenLine className="w-3.5 h-3.5" />
                  </button>
                  <div className="relative" ref={granularityRef}>
                    <button
                      onClick={() => setGranularityOpen(!granularityOpen)}
                      className="flex items-center gap-1 text-[11px] text-muted hover:text-ink transition-colors"
                    >
                      {granularity}
                      <ChevronDown className="w-3 h-3" />
                    </button>
                    {granularityOpen && (
                      <div className="absolute top-full right-0 mt-1.5 bg-surface border border-border rounded-lg shadow-lg z-20 py-1 min-w-[110px]">
                        {(['Daily', 'Weekly', 'Monthly'] as const).map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setGranularity(opt); setGranularityOpen(false); }}
                            className={`w-full text-left px-3 py-1.5 text-[11px] transition-colors ${
                              granularity === opt
                                ? 'text-ink font-semibold bg-bg'
                                : 'text-muted hover:text-ink hover:bg-bg'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-surface border border-border rounded-lg p-4">
              {chartPoints.length === 0 || (overview && overview.totals.events === 0) ? (
                <p className="py-16 text-center text-[13px] text-muted">
                  {overviewLoading ? 'Loading events…' : 'No events in this date range. Install the tracking pixel to start collecting events.'}
                </p>
              ) : (
                <MiniLineChart height={200} data={chartPoints} />
              )}
            </div>
          </div>

          {/* Annotations Section */}
          <div>
            <h2 className="text-[14px] font-semibold text-ink mb-3">Annotations</h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">#</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">DATE & TIME</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">TITLE</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">DESCRIPTION</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">ADDED BY</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">ACTIONS</th>
                    </tr>
                  </thead>
                <tbody>
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-[11px] text-muted">No annotations yet.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </div>

          {/* Table Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button className="p-1.5 border border-border rounded-md hover:bg-bg transition-colors">
                <Search className="w-3.5 h-3.5 text-muted" />
              </button>
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-muted hover:text-ink border border-border rounded-md hover:border-ink/20 transition-colors">
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
            </div>
            <button className="p-1.5 hover:bg-bg rounded transition-colors">
              <ChevronUp className="w-4 h-4 text-muted" />
            </button>
          </div>

          {/* Events Breakdown Section */}
          <div>
            <h2 className="text-[14px] font-semibold text-ink mb-3">Events Breakdown</h2>
            <div className="bg-surface border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">EVENT NAME</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">TOTAL EVENTS</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left" title="Distinct IP addresses">UNIQUE USERS</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">EMQ SCORE</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">LAST UPDATED</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">SOURCES</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">DESTINATIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overviewEvents.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-[11px] text-muted">
                          {overviewLoading ? 'Loading…' : 'No events in this date range.'}
                        </td>
                      </tr>
                    )}
                    {overviewEvents.map((event) => (
                      <tr key={event.name} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors cursor-pointer">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => handleEventClick(event.name)}
                            className="text-[11px] text-info font-medium underline hover:text-[#1D4ED8] transition-colors cursor-pointer text-left"
                          >
                            {event.name}
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[11px] font-semibold text-ink">{event.total.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] text-ink">{event.unique_users.toLocaleString()}</td>
                        <td className="px-4 py-3 text-[11px] text-muted" title="Event match quality is calculated once a destination is connected">—</td>
                        <td className="px-4 py-3 text-[11px] text-muted">{new Date(event.last_seen).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {event.sources.map((s) => (
                              <span key={s} className="px-2 py-0.5 bg-bg border border-border rounded text-[10px] text-muted">{s}</span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-bg border border-border text-[10px] font-semibold text-ink">
                            {event.destinations}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {activeSubTab === 'logs' && (
        <LogsScreen filters={appliedFilters} />
      )}

      {activeSubTab === 'users' && (
        <div className="bg-surface border border-border rounded-lg p-8 text-center">
          <p className="text-[13px] text-muted">Users content</p>
        </div>
      )}

      <FilterDrawer
        isOpen={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        onApply={(filters) => setAppliedFilters(filters)}
        currentFilters={appliedFilters}
      />

      {datePickerOpen && (
        <DatePickerPopover
          onClose={() => setDatePickerOpen(false)}
          onApply={(start, end) => {
            const from = new Date(start);
            from.setHours(0, 0, 0, 0);
            const to = new Date(end);
            to.setHours(23, 59, 59, 999);
            setDateRange(from <= to ? { start: from, end: to } : { start: to, end: from });
          }}
        />
      )}

    </div>
  );
};
