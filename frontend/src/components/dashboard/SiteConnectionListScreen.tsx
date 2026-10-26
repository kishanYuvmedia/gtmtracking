import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import {
  Plus,
  Globe,
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ChevronDown,
  BarChart3,
  Server,
  Clock,
  Send,
  Database,
  Layers,
} from 'lucide-react';
import { PricingModal } from './PricingModal';

interface Site {
  id: string;
  name: string;
  domain: string;
  status: 'connected' | 'pending' | 'error';
  lastSync: string;
  eventsToday: number;
  accountId: string;
  serverSideSetup: boolean;
  destinations: number;
  sources: number;
  segments: number;
  planUsed: number;
  planTotal: number;
}

interface SiteConnectionListProps {
  onAddDomain: () => void;
  onSelectSite: (site: Site) => void;
  onOpenSettings: (site: Site) => void;
  onDisconnect: (site: Site) => void;
}

function formatLastVisit(value: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(value).toLocaleDateString();
}

export const SiteConnectionListScreen: React.FC<SiteConnectionListProps> = ({
  onAddDomain,
  onSelectSite,
  onOpenSettings,
  onDisconnect,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [sites, setSites] = useState<Site[]>([]);
  const [isLoadingSites, setIsLoadingSites] = useState(true);
  const [sitesError, setSitesError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getWebsites()
      .then((res: { websites: { id: string; name: string | null; domain: string; status: string; events_24h?: number; last_event_at?: string | null }[] }) => {
        if (!Array.isArray(res.websites)) throw new Error('The website list response was invalid');
        if (cancelled) return;
        const mapped = res.websites.map((w) => ({
          id: w.id,
          name: w.name || w.domain,
          domain: w.domain,
          status: (w.status === 'active' ? 'connected' : 'pending') as 'connected' | 'pending' | 'error',
          lastSync: w.last_event_at ? formatLastVisit(w.last_event_at) : 'No events yet',
          eventsToday: w.events_24h || 0,
          accountId: w.id,
          serverSideSetup: false,
          destinations: 0,
          sources: 0,
          segments: 0,
          planUsed: w.events_24h || 0,
          planTotal: 10000,
        }));
        setSites(mapped);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setSitesError(cause instanceof Error ? cause.message : 'Unable to load websites');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSites(false);
      });
    return () => { cancelled = true; };
  }, []);

  const site = sites[0];
  const hasSite = sites.length > 0;

  const usagePercent = site ? Math.round((site.planUsed / site.planTotal) * 100) : 0;

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Left Panel — Plan & Checklist */}
      <aside className="hidden lg:flex flex-col w-[240px] shrink-0 gap-5">
        {/* Plan Card */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">Free Plan</p>
            <p className="text-[13px] text-ink mt-1">Current Plan</p>
          </div>
          <div className="mb-4">
            <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Events used</p>
            <p className="text-[15px] font-bold text-ink">
              {site ? site.planUsed.toLocaleString() : '0'} / {site ? site.planTotal.toLocaleString() : '10K'}
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full h-2 bg-bg rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-ink rounded-full transition-all duration-300"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <button
            onClick={() => setShowPricingModal(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-semibold text-ink bg-bg border border-border rounded-xl hover:border-ink/20 transition-colors"
          >
            Upgrade
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {/* Setup Checklist */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-4">Setup Checklist</p>
          <div className="border-t border-border mb-4" />

          {hasSite && (
            <div className="space-y-0">
              {/* Website name */}
              <div className="flex items-center gap-2.5 mb-4">
                <Globe className="w-4 h-4 text-muted" />
                <span className="text-[13px] font-semibold text-ink truncate">{site.name}</span>
                <ChevronDown className="w-4 h-4 text-muted ml-auto" />
              </div>

              {/* Checklist items */}
              <div className="ml-[7px] pl-4 border-l-2 border-border space-y-0">
                {/* Item 1: Website Connected */}
                <div className="relative flex items-center gap-3 py-2">
                  <div className="absolute -left-[23px] w-[16px] h-[16px] rounded-full bg-success flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-3 h-3 text-white" />
                  </div>
                  <span className="text-[13px] text-ink">Website Connected</span>
                </div>

                {/* Item 2: Server-side Setup */}
                <div className="relative flex items-center gap-3 py-2">
                  <div className={`absolute -left-[23px] w-[16px] h-[16px] rounded-full flex items-center justify-center shadow-sm ${
                    site.serverSideSetup ? 'bg-success' : 'bg-danger'
                  }`}>
                    {site.serverSideSetup ? (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    ) : (
                      <XCircle className="w-3 h-3 text-white" />
                    )}
                  </div>
                  <span className={`text-[13px] ${site.serverSideSetup ? 'text-ink' : 'text-danger'}`}>
                    Server-side Setup
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Right Panel — Main Content */}
      <div className="flex-1 min-w-0 space-y-5">
        {/* Connection Banner */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <p className="text-[13px] text-muted max-w-md leading-relaxed">
            Connect a website to start collecting analytics, monitor events, and manage tracking settings.
          </p>
          <button
            onClick={onAddDomain}
            className="flex items-center gap-2 px-5 py-2.5 text-[13px] font-semibold text-white bg-ink rounded-xl hover:bg-ink-soft transition-colors shadow-md shrink-0"
          >
            Add Website
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {sitesError && (
          <p role="alert" className="rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
            {sitesError}
          </p>
        )}

        {isLoadingSites && (
          <div className="bg-surface border border-border rounded-2xl p-8 text-center text-[13px] text-muted">
            Loading connected websites...
          </div>
        )}

        {/* Website Connection Card */}
        {!isLoadingSites && hasSite ? (
          <div
            onClick={() => onSelectSite(site)}
            className="bg-surface border border-border rounded-2xl hover:border-ink/20 hover:shadow-md transition-all duration-150 cursor-pointer shadow-sm"
          >
            {/* Card Header */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-bg border border-border flex items-center justify-center">
                  <Globe className="w-6 h-6 text-muted" />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-[15px] font-bold text-ink">{site.name}</h2>
                    <span className="text-[12px] text-muted bg-bg px-2 py-0.5 rounded-md">{site.accountId}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="w-2 h-2 rounded-full bg-success" />
                    <span className="text-[13px] text-success font-medium capitalize">{site.status}</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuOpen(!menuOpen);
                  }}
                  className="p-2 rounded-lg hover:bg-bg transition-colors"
                >
                  <MoreHorizontal className="w-5 h-5 text-muted" />
                </button>
                {menuOpen && (
                  <div className="absolute top-full right-0 mt-2 w-44 bg-surface border border-border rounded-xl shadow-xl z-10 py-1.5 animate-in">
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onSelectSite(site); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-bg transition-colors"
                    >
                      View Details
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onOpenSettings(site); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-ink hover:bg-bg transition-colors"
                    >
                      Settings
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDisconnect(site); }}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-danger hover:bg-danger/5 transition-colors"
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Metrics Grid */}
            <div className="border-t border-border">
              {/* Row 1 */}
              <div className="grid grid-cols-3 divide-x divide-border">
                {/* Events */}
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Events</p>
                  <p className="text-[17px] font-bold text-ink">
                    {site.eventsToday.toLocaleString()}{' '}
                    <span className="text-[13px] font-normal text-muted">/ {site.planTotal.toLocaleString()}</span>
                  </p>
                  <div className="w-full h-2 bg-bg rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-ink rounded-full transition-all duration-300"
                      style={{ width: `${usagePercent}%` }}
                    />
                  </div>
                </div>

                {/* Server-Side Setup */}
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Server-Side Setup</p>
                  <div className="flex items-center gap-2">
                    {site.serverSideSetup ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-success" />
                        <span className="text-[15px] font-bold text-ink">Set up</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-danger" />
                        <span className="text-[15px] font-bold text-danger">Not set up</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Last Ping */}
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Last Ping</p>
                  <p className="text-[15px] font-bold text-ink">{site.lastSync}</p>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border">
                {/* Destinations */}
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Destination</p>
                  <p className="text-[15px] font-bold text-ink">{site.destinations}/5</p>
                </div>

                {/* Sources */}
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Sources</p>
                  <p className="text-[15px] font-bold text-ink">{site.sources}/5</p>
                </div>

                {/* Segments */}
                <div className="p-6">
                  <p className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2">Segments</p>
                  <p className="text-[15px] font-bold text-ink">{site.segments}/5</p>
                </div>
              </div>
            </div>
          </div>
        ) : !isLoadingSites && (
          /* Empty State */
          <div className="bg-surface border border-border rounded-2xl p-16 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-bg border border-border flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-muted" />
              </div>
              <p className="text-[15px] text-muted">No websites connected yet.</p>
              <button
                onClick={onAddDomain}
                className="mt-4 text-[13px] text-ink font-semibold hover:underline"
              >
                Add your first website
              </button>
            </div>
          </div>
        )}

        {!isLoadingSites && sites.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Other connected domains</h3>
            {sites.slice(1).map((connectedSite) => (
              <button
                key={connectedSite.id}
                type="button"
                onClick={() => onSelectSite(connectedSite)}
                className="w-full flex items-center justify-between rounded-xl border border-border bg-surface p-4 text-left hover:border-ink/20 transition-colors"
              >
                <span>
                  <span className="block text-sm font-semibold text-ink">{connectedSite.name}</span>
                  <span className="block text-xs text-muted mt-1">{connectedSite.domain}</span>
                </span>
                <span className="text-xs text-muted">{connectedSite.eventsToday.toLocaleString()} events (24h)</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <PricingModal
        isOpen={showPricingModal}
        onClose={() => setShowPricingModal(false)}
        onSelectPlan={(plan) => console.log('Selected plan:', plan)}
      />
    </div>
  );
};
