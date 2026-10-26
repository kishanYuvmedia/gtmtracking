import React, { useEffect, useState } from 'react';
import { ChevronLeft, Globe, CheckCircle2, Copy, Check, ExternalLink, ShoppingCart, CircleDashed, AlertTriangle } from 'lucide-react';
import { api } from '../../lib/api';
import { WebsiteLocaleFields } from './WebsiteLocaleFields';

type Tab = 'overview' | 'settings' | 'logs';

interface DomainDetailProps {
  domain: {
    id: string;
    name: string;
    domain: string;
    status: string;
    lastSync: string;
    eventsToday: number;
  };
  initialTab?: Tab;
  onBack: () => void;
  onDisconnect: () => void;
}

interface SiteEvent {
  id: string;
  event_name: string;
  visitor_id: string;
  created_at: string;
  page_info: Record<string, unknown> | null;
}

function getPageUrl(pageInfo: Record<string, unknown> | null): string {
  const url = pageInfo?.url ?? pageInfo?.page_url;
  return typeof url === 'string' ? url : '-';
}

interface EcommerceEventStatus {
  name: string;
  label: string;
  required: boolean;
  total: number;
  last_7d: number;
  value_7d: number;
  last_seen: string | null;
  capture_sources: string[];
  status: 'receiving' | 'stale' | 'missing';
}

interface EcommerceStatus {
  ecommerce_enabled: boolean;
  pixel_status: 'active' | 'idle' | 'not_installed';
  last_visit: { at: string; event_name: string; page_url: string | null; visit_count: number | null; is_returning: boolean | null } | null;
  visits_7d: { sessions: number; returning: number };
  events: EcommerceEventStatus[];
}

const PIXEL_BADGE: Record<EcommerceStatus['pixel_status'], { label: string; className: string; dot: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success', dot: 'bg-success' },
  idle: { label: 'No events in 24h', className: 'bg-warning/10 text-warning', dot: 'bg-warning' },
  not_installed: { label: 'Pixel not detected', className: 'bg-bg text-muted border border-border', dot: 'bg-muted' },
};

const SOURCE_LABEL: Record<string, string> = {
  datalayer: 'dataLayer', shopify: 'Shopify', woocommerce: 'WooCommerce', dom: 'Page detection', manual: 'Manual',
};

function timeAgo(value: string | null): string {
  if (!value) return 'Never';
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export const DomainDetailScreen: React.FC<DomainDetailProps> = ({
  domain,
  initialTab = 'overview',
  onBack,
  onDisconnect,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const [copied, setCopied] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [scriptVersion, setScriptVersion] = useState(0);
  const [scriptWarnings, setScriptWarnings] = useState<string[]>([]);
  const [locale, setLocale] = useState({ country: '', currency: '' });
  const [savedLocale, setSavedLocale] = useState({ country: '', currency: '' });
  const [localeState, setLocaleState] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [localeError, setLocaleError] = useState('');

  useEffect(() => {
    (api.getWebsite(domain.id) as Promise<{ website: { country?: string | null; currency?: string | null } }>)
      .then(({ website }) => {
        const value = { country: website.country || '', currency: website.currency || '' };
        setLocale(value);
        setSavedLocale(value);
      })
      .catch(() => { /* card shows empty selects */ });
  }, [domain.id]);

  const saveLocale = async () => {
    setLocaleState('saving');
    setLocaleError('');
    try {
      await api.updateWebsite(domain.id, locale);
      setSavedLocale(locale);
      setLocaleState('saved');
      // The snippet embeds the currency: reload it so the copy button gives the new one.
      setScriptVersion((version) => version + 1);
      setTimeout(() => setLocaleState('idle'), 2000);
    } catch (cause) {
      setLocaleError(cause instanceof Error ? cause.message : 'Unable to save');
      setLocaleState('idle');
    }
  };
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [ecommerce, setEcommerce] = useState<EcommerceStatus | null>(null);

  useEffect(() => {
    let cancelled = false;
    (api.getEcommerceStatus(domain.id) as Promise<EcommerceStatus>)
      .then((response) => { if (!cancelled) setEcommerce(response); })
      .catch(() => { /* the rest of the page still works without it */ });
    return () => { cancelled = true; };
  }, [domain.id]);
  const badge = PIXEL_BADGE[ecommerce?.pixel_status || 'active'];
  const showEcommerce = !!ecommerce && (ecommerce.ecommerce_enabled || ecommerce.events.some((event) => event.total > 0));

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      api.getWebsiteScript(domain.id) as Promise<{ script: string; warnings?: string[] }>,
      api.getEvents(domain.id, 10) as Promise<{ events: SiteEvent[] }>,
    ])
      .then(([scriptResponse, eventResponse]) => {
        if (cancelled) return;
        setScriptCode(scriptResponse.script);
        setScriptWarnings(scriptResponse.warnings || []);
        setEvents(eventResponse.events);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load website details');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => { cancelled = true; };
  }, [domain.id, scriptVersion]);

  const handleCopy = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Site Connections</span>
      </button>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-bg border border-border flex items-center justify-center">
              <Globe className="w-5 h-5 text-muted" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-ink">{domain.name}</h1>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </div>
              <p className="text-xs text-muted mt-1">
                {domain.domain} · Connected · Last synced {domain.lastSync}
              </p>
            </div>
          </div>
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 text-xs font-semibold text-danger border border-danger/20 rounded-md hover:bg-danger/5 transition-colors"
          >
            Disconnect
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
          <div className="bg-bg rounded-lg p-3.5 border border-border">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Events Today</p>
            <p className="text-xl font-bold text-ink">{domain.eventsToday.toLocaleString()}</p>
          </div>
          <div className="bg-bg rounded-lg p-3.5 border border-border">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Script Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              {scriptCode ? (
                <CheckCircle2 className="w-4 h-4 text-success" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-muted" />
              )}
              <span className="text-sm font-semibold text-ink">
                {isLoading ? 'Loading...' : scriptCode ? 'Ready to install' : 'Unavailable'}
              </span>
            </div>
          </div>
          <div className="bg-bg rounded-lg p-3.5 border border-border">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">Last Visit</p>
            <p className="text-sm font-semibold text-ink mt-1" title={ecommerce?.last_visit ? new Date(ecommerce.last_visit.at).toLocaleString() : undefined}>
              {ecommerce ? timeAgo(ecommerce.last_visit?.at || null) : '…'}
            </p>
            {ecommerce?.last_visit && (
              <p className="text-[11px] text-muted mt-0.5">
                {ecommerce.last_visit.visit_count ? `Visit #${ecommerce.last_visit.visit_count}` : ecommerce.last_visit.event_name}
                {ecommerce.last_visit.is_returning !== null && ` · ${ecommerce.last_visit.is_returning ? 'Returning' : 'New'} visitor`}
              </p>
            )}
            {ecommerce && ecommerce.visits_7d.sessions > 0 && (
              <p className="text-[11px] text-muted">
                {Math.round((ecommerce.visits_7d.returning / ecommerce.visits_7d.sessions) * 100)}% returning (7d)
              </p>
            )}
          </div>
          <div className="bg-bg rounded-lg p-3.5 border border-border">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">DNS Status</p>
            <div className="flex items-center gap-1.5 mt-1">
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-sm font-semibold text-ink">Verified</span>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-border">
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

      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Tracking Script</h3>
              <button
                onClick={handleCopy}
                disabled={!scriptCode || isLoading}
                className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-muted bg-bg border border-border rounded-md hover:border-ink/20 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-success" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    Copy
                  </>
                )}
              </button>
            </div>
            <div className="p-4 space-y-3">
              {scriptWarnings.map((warning) => (
                <div key={warning} role="alert" className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 p-3 text-[11px] text-ink">
                  <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <span>{warning}</span>
                </div>
              ))}
              <pre className="text-[11px] font-mono text-ink bg-bg rounded-lg p-4 overflow-x-auto leading-relaxed">
                {isLoading ? 'Loading tracking script...' : scriptCode || 'Tracking script is unavailable.'}
              </pre>
            </div>
          </div>

          {showEcommerce && ecommerce && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-muted" />
                  <h3 className="text-sm font-bold text-ink">E-commerce Events</h3>
                </div>
                <p className="text-[11px] text-muted">
                  {ecommerce.ecommerce_enabled
                    ? 'Captured automatically from dataLayer, Shopify / WooCommerce and page detection.'
                    : 'Set the website type to E-Commerce to capture these automatically.'}
                </p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[640px]">
                  <thead>
                    <tr className="bg-bg border-b border-border">
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Event</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Status</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Last 7 days</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Value (7d)</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Last seen</th>
                      <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Captured by</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {ecommerce.events.map((event) => (
                      <tr key={event.name}>
                        <td className="px-4 py-2.5">
                          <p className="text-[12px] font-semibold text-ink">{event.name}{event.required && <span className="text-danger" title="Needed for ad conversion optimisation"> *</span>}</p>
                          <p className="text-[11px] text-muted">{event.label}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          {event.status === 'receiving' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-success"><CheckCircle2 className="w-3.5 h-3.5" /> Receiving</span>
                          ) : event.status === 'stale' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning"><AlertTriangle className="w-3.5 h-3.5" /> Not in 7 days</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] text-muted"><CircleDashed className="w-3.5 h-3.5" /> Not seen yet</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-[12px] text-ink text-right">{event.last_7d.toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-[12px] text-muted text-right">{event.value_7d ? event.value_7d.toLocaleString() : '—'}</td>
                        <td className="px-4 py-2.5 text-[12px] text-muted">{timeAgo(event.last_seen)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {event.capture_sources.length
                              ? event.capture_sources.map((source) => (
                                <span key={source} className="px-2 py-0.5 bg-bg border border-border rounded text-[10px] text-muted">{SOURCE_LABEL[source] || source}</span>
                              ))
                              : <span className="text-[11px] text-muted">—</span>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-ink">Recent Events</h3>
              <button onClick={() => setActiveTab('logs')} className="text-xs text-muted hover:text-ink flex items-center gap-1 transition-colors">
                View All <ExternalLink className="w-3 h-3" />
              </button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Event</th>
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Visitor</th>
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Page URL</th>
                  <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Received</th>
                </tr>
              </thead>
              <tbody>
                {error ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-danger">{error}</td></tr>
                ) : isLoading ? (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-muted">Loading events...</td></tr>
                ) : events.length ? events.slice(0, 5).map((event) => (
                  <tr key={event.id} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                    <td className="px-5 py-3 font-mono text-xs text-info font-semibold">{event.event_name}</td>
                    <td className="px-5 py-3 text-xs text-muted font-mono">{event.visitor_id}</td>
                    <td className="px-5 py-3 text-xs text-muted max-w-[240px] truncate" title={getPageUrl(event.page_info)}>
                      {getPageUrl(event.page_info)}
                    </td>
                    <td className="px-5 py-3 text-xs text-muted">{new Date(event.created_at).toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-xs text-muted">No events received yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-ink">Country &amp; Currency</h3>
            <p className="text-xs text-muted mt-1">Sets the currency your pixel sends with purchases and the timezone reports use.</p>
          </div>
          <WebsiteLocaleFields country={locale.country} currency={locale.currency} onChange={setLocale} disabled={localeState === 'saving'} />
          {localeError && <p role="alert" className="text-xs text-danger">{localeError}</p>}
          <div className="flex items-center justify-end gap-3">
            {localeState === 'saved' && (
              <span className="flex items-center gap-1 text-xs text-success"><Check className="w-3.5 h-3.5" /> Saved. Re-copy the tracking script on Overview.</span>
            )}
            <button
              onClick={saveLocale}
              disabled={!locale.country || localeState === 'saving' || (locale.country === savedLocale.country && locale.currency === savedLocale.currency)}
              className="px-4 py-2 bg-ink text-white text-xs font-semibold rounded-md hover:bg-ink/90 transition-colors disabled:opacity-50"
            >
              {localeState === 'saving' ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-ink mb-4">DNS Configuration</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted">Type</span>
              <span className="text-xs text-ink font-mono font-medium bg-bg px-2 py-0.5 rounded">CNAME</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted">Host</span>
              <span className="text-xs text-ink font-mono font-medium">track</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border/50">
              <span className="text-xs text-muted">Value</span>
              <span className="text-xs text-ink font-mono font-medium">pulse-track.clickowl.io</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-xs text-muted">TTL</span>
              <span className="text-xs text-ink font-mono font-medium">Auto</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-ink">Event Logs</h3>
            <p className="text-xs text-muted mt-1">{domain.name} ({domain.domain})</p>
          </div>
          <div className="divide-y divide-border/50">
            {error ? (
              <p className="p-6 text-xs text-danger">{error}</p>
            ) : isLoading ? (
              <p className="p-6 text-xs text-muted">Loading events...</p>
            ) : events.length ? events.map((event) => (
              <div key={event.id} className="grid grid-cols-1 md:grid-cols-4 gap-2 p-4">
                <span className="text-xs font-semibold text-ink">{event.event_name}</span>
                <span className="text-xs text-muted font-mono">Visitor {event.visitor_id}</span>
                <span className="text-xs text-muted truncate" title={getPageUrl(event.page_info)}>{getPageUrl(event.page_info)}</span>
                <span className="text-xs text-muted">{new Date(event.created_at).toLocaleString()}</span>
              </div>
            )) : (
              <p className="p-6 text-xs text-muted">No events received yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
