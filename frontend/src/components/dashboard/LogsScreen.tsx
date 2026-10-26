import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useWebsiteFilter } from '../../lib/websiteFilter';
import { FilterState } from './FilterDrawer';
import { EventDetailDrawer } from './EventDetailDrawer';

const EVENTS_PAGE_SIZE = 200;

interface WebsiteOption {
  id: string;
  name: string | null;
  domain: string;
}

interface DashboardEvent {
  id: string;
  event_name: string;
  event_id?: string;
  session_id: string;
  visitor_id: string;
  website_id: string;
  website_name: string | null;
  website_domain: string | null;
  created_at: string;
  payload?: Record<string, unknown> | null;
  properties?: Record<string, unknown>;
  page_info: Record<string, unknown> | null;
  device_info: Record<string, unknown> | null;
  performance_info?: Record<string, unknown> | null;
  network_info?: Record<string, unknown> | null;
  location_info?: Record<string, unknown> | null;
  url_params?: Record<string, string> | null;
}

function getRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function getString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export const LogsScreen: React.FC<{ filters: FilterState }> = ({ filters }) => {
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [isLoadingWebsites, setIsLoadingWebsites] = useState(true);
  const [isLoadingEvents, setIsLoadingEvents] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreEvents, setHasMoreEvents] = useState(false);
  const [websitesError, setWebsitesError] = useState('');
  const [eventsError, setEventsError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const { selectedWebsiteId } = useWebsiteFilter();
  const [selectedEvent, setSelectedEvent] = useState<{
    name: string;
    eventId: string;
    processingTime: string;
    dataSize: string;
    rawData: Record<string, unknown>;
    userContext: { region: string; ip: string; userAgent: string };
  } | null>(null);
  const error = websitesError || eventsError;

  useEffect(() => {
    let cancelled = false;
    setIsLoadingWebsites(true);
    api.getWebsites()
      .then((response: { websites: WebsiteOption[] }) => {
        if (!Array.isArray(response.websites)) throw new Error('The website list response was invalid');
        if (!cancelled) setWebsites(response.websites);
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setWebsitesError(cause instanceof Error ? cause.message : 'Unable to load websites');
          setIsLoadingEvents(false);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingWebsites(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isLoadingWebsites || websitesError) return;

    let cancelled = false;
    setIsLoadingEvents(true);
    setEventsError('');
    setEvents([]);
    setHasMoreEvents(false);
    api.getEvents(selectedWebsiteId || undefined, EVENTS_PAGE_SIZE, 0)
      .then((response: { events: DashboardEvent[] }) => {
        if (!Array.isArray(response.events)) throw new Error('The event log response was invalid');
        if (!cancelled) {
          setEvents(response.events);
          setHasMoreEvents(response.events.length === EVENTS_PAGE_SIZE);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setEventsError(cause instanceof Error ? cause.message : 'Unable to load event logs');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingEvents(false);
      });

    return () => { cancelled = true; };
  }, [isLoadingWebsites, websitesError, refreshKey, selectedWebsiteId]);

  const loadMoreEvents = async () => {
    if (isLoadingMore || !hasMoreEvents) return;
    setIsLoadingMore(true);
    setEventsError('');
    try {
      const response = await api.getEvents(selectedWebsiteId || undefined, EVENTS_PAGE_SIZE, events.length) as { events: DashboardEvent[] };
      if (!Array.isArray(response.events)) throw new Error('The event log response was invalid');
      setEvents((currentEvents) => [...currentEvents, ...response.events]);
      setHasMoreEvents(response.events.length === EVENTS_PAGE_SIZE);
    } catch (cause) {
      setEventsError(cause instanceof Error ? cause.message : 'Unable to load more event logs');
    } finally {
      setIsLoadingMore(false);
    }
  };

  const openEventDetails = (event: DashboardEvent) => {
    const rawData: Record<string, unknown> = {
      ...event,
      event_id: event.event_id || event.id,
    };
    const deviceInfo = getRecord(event.device_info);
    const locationInfo = getRecord(event.location_info);
    const networkInfo = getRecord(event.network_info);
    const serializedData = JSON.stringify(rawData);

    setSelectedEvent({
      name: event.event_name,
      eventId: event.event_id || event.id,
      processingTime: 'Not recorded',
      dataSize: `${(new TextEncoder().encode(serializedData).length / 1024).toFixed(2)} KB`,
      rawData,
      userContext: {
        region: [locationInfo.city, locationInfo.region, locationInfo.country]
          .filter((part): part is string => typeof part === 'string' && part.length > 0)
          .join(', ') || 'Not recorded',
        ip: getString(locationInfo.ip_address) || getString(networkInfo.ip_address) || 'Not recorded',
        userAgent: getString(deviceInfo.user_agent) || 'Not recorded',
      },
    });
  };

  const selectedEventName = filters.eventName && filters.eventName !== 'All Events'
    ? filters.eventName.toLowerCase().replace(/[^a-z0-9]/g, '')
    : '';
  const selectedDevice = filters.deviceCategory && filters.deviceCategory !== 'All Devices'
    ? filters.deviceCategory.toLowerCase()
    : '';
  const filteredEvents = useMemo(
    () => events.filter((event) => {
      const eventName = event.event_name.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (selectedEventName && eventName !== selectedEventName) return false;
      if (selectedDevice) {
        const deviceInfo = getRecord(event.device_info);
        const deviceType = (getString(deviceInfo.device_type) || getString(deviceInfo.type)).toLowerCase();
        if (deviceType !== selectedDevice) return false;
      }
      return true;
    }),
    [events, selectedEventName, selectedDevice]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-ink">Event Logs</h2>
          <p className="text-xs text-muted mt-1">Latest tracking events received from your connected websites.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={isLoadingEvents}
            className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-md text-xs text-muted hover:text-ink disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingEvents ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div role="alert" className="flex items-center gap-2 rounded-lg border border-danger/20 bg-danger/5 p-3 text-xs text-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="bg-bg border-b border-border">
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Timestamp</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Customer / Website</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Event</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Visitor</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Session</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Page URL</th>
                <th className="px-4 py-3 text-[10px] font-semibold text-muted uppercase tracking-wider text-left">Device</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoadingWebsites || isLoadingEvents ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted">Loading event logs...</td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[13px] text-muted">Event logs could not be loaded.</td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <p className="text-[13px] text-muted">
                      {websites.length === 0
                        ? 'Add a website and install its tracking pixel to see events here.'
                        : selectedEventName || selectedDevice
                          ? 'No events match the selected filters.'
                          : 'No events received yet. Install the tracking pixel to start collecting events.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((event) => {
                  const pageInfo = getRecord(event.page_info);
                  const deviceInfo = getRecord(event.device_info);
                  const browserInfo = getRecord(deviceInfo.browser);
                  const domain = event.website_domain || '';
                  const device = getString(deviceInfo.device_type)
                    || getString(deviceInfo.type)
                    || getString(browserInfo.name)
                    || 'Unknown';
                  const pageUrl = getString(pageInfo.url)
                    || getString(pageInfo.page_url)
                    || getString(pageInfo.href)
                    || '-';

                  return (
                    <tr key={event.id} className="hover:bg-bg/50 transition-colors">
                      <td className="px-4 py-3 text-[12px] text-muted whitespace-nowrap">
                        {new Date(event.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-[12px] font-medium text-ink">{event.website_name || domain || 'Website'}</div>
                        {domain && <div className="text-[11px] text-muted">{domain}</div>}
                      </td>
                      <td className="px-4 py-3 text-[12px]">
                        <button
                          type="button"
                          onClick={() => openEventDetails(event)}
                          className="font-semibold text-info underline decoration-transparent hover:decoration-current text-left"
                        >
                          {event.event_name}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted font-mono">{event.visitor_id}</td>
                      <td className="px-4 py-3 text-[12px] text-muted font-mono">{event.session_id}</td>
                      <td className="px-4 py-3 text-[12px] text-muted max-w-[240px] truncate" title={pageUrl}>{pageUrl}</td>
                      <td className="px-4 py-3 text-[12px] text-muted">{device}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoadingEvents && !error && events.length === 200 && (
          <div className="border-t border-border px-4 py-3 flex items-center justify-between">
            <span className="text-[11px] text-muted">Showing {events.length} real events.</span>
            {hasMoreEvents && (
              <button
                type="button"
                onClick={loadMoreEvents}
                disabled={isLoadingMore}
                className="px-3 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-ink hover:bg-bg disabled:opacity-50"
              >
                {isLoadingMore ? 'Loading...' : 'Load more events'}
              </button>
            )}
          </div>
        )}
      </div>
      {!isLoadingEvents && !error && events.length > 0 && events.length !== 200 && (
        <div className="flex justify-between items-center px-1">
          <span className="text-[11px] text-muted">Showing {events.length} real events.</span>
          {hasMoreEvents && (
            <button
              type="button"
              onClick={loadMoreEvents}
              disabled={isLoadingMore}
              className="px-3 py-1.5 rounded-md border border-border bg-surface text-xs font-medium text-ink hover:bg-bg disabled:opacity-50"
            >
              {isLoadingMore ? 'Loading...' : 'Load more events'}
            </button>
          )}
        </div>
      )}

      <EventDetailDrawer
        isOpen={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        event={selectedEvent}
      />
    </div>
  );
};
