'use client';

import { Card } from '../../../components/ui/Card';
import { useState, useEffect, useMemo } from 'react';
import { api } from '../../../lib/api';

interface EnrichedEvent {
  id: string;
  event_name: string;
  event_id: string;
  session_id: string;
  visitor_id: string;
  website_domain: string;
  properties: Record<string, unknown>;
  device_info: Record<string, unknown> | null;
  page_info: Record<string, unknown> | null;
  performance_info: Record<string, unknown> | null;
  network_info: Record<string, unknown> | null;
  location_info: Record<string, unknown> | null;
  created_at: string;
}

interface GroupedEvents {
  date: string;
  label: string;
  events: EnrichedEvent[];
}

function groupByDate(events: EnrichedEvent[]): GroupedEvents[] {
  const groups: Record<string, EnrichedEvent[]> = {};
  for (const ev of events) {
    const d = new Date(ev.created_at);
    const key = d.toISOString().slice(0, 10);
    if (!groups[key]) groups[key] = [];
    groups[key].push(ev);
  }
  return Object.entries(groups)
    .map(([date, evs]) => ({
      date,
      label: formatDateLabel(date),
      events: evs,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function formatDateLabel(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateStr === today.toISOString().slice(0, 10)) return 'Today';
  if (dateStr === yesterday.toISOString().slice(0, 10)) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
}

const EVENT_COLORS: Record<string, string> = {
  PageView: 'bg-blue-100 text-blue-700',
  ButtonClick: 'bg-green-100 text-green-700',
  LinkClick: 'bg-purple-100 text-purple-700',
  Click: 'bg-yellow-100 text-yellow-700',
  Scroll: 'bg-orange-100 text-orange-700',
  FormSubmit: 'bg-pink-100 text-pink-700',
};

function eventBadge(name: string) {
  const colors = EVENT_COLORS[name] || 'bg-gray-100 text-gray-700';
  return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors}`;
}

export default function EventsPage() {
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrichedEvent | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    try {
      const res = await api.getEvents();
      setEvents(res.events);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!filter) return events;
    return events.filter(e => e.event_name === filter);
  }, [events, filter]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const eventTypes = useMemo(() => {
    const types = new Set(events.map(e => e.event_name));
    return Array.from(types).sort();
  }, [events]);

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading events...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Events</h1>
        {eventTypes.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter('')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                !filter ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All
            </button>
            {eventTypes.map(type => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                  filter === type ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        )}
      </div>

      {events.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No events yet</p>
            <p className="text-sm">Events will appear here once your tracking script starts sending data.</p>
          </div>
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No events match filter</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {grouped.map(group => (
            <div key={group.date}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-lg font-semibold text-gray-900">{group.label}</h2>
                <span className="text-sm text-gray-400">{group.events.length} events</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                        <th className="pb-3 font-medium">Event</th>
                        <th className="pb-3 font-medium">Website</th>
                        <th className="pb-3 font-medium">Session</th>
                        <th className="pb-3 font-medium">Page</th>
                        <th className="pb-3 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.events.map((event) => (
                        <tr
                          key={event.id}
                          className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                          onClick={() => setSelected(selected?.id === event.id ? null : event)}
                        >
                          <td className="py-3">
                            <span className={eventBadge(event.event_name)}>{event.event_name}</span>
                          </td>
                          <td className="py-3 text-sm text-gray-600">{event.website_domain}</td>
                          <td className="py-3 text-sm font-mono text-gray-500">{event.session_id.slice(0, 8)}...</td>
                          <td className="py-3 text-sm text-gray-500 max-w-[200px] truncate">
                            {event.page_info
                              ? (event.page_info as Record<string, unknown>).pathname as string || (event.page_info as Record<string, unknown>).url as string || '-'
                              : '-'}
                          </td>
                          <td className="py-3 text-sm text-gray-500 whitespace-nowrap">{timeAgo(event.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">
                <span className={eventBadge(selected.event_name)}>{selected.event_name}</span>
              </h2>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>

            <div className="space-y-4 text-sm">
              <Section title="Identifiers">
                <Row label="Event ID" value={selected.event_id} mono />
                <Row label="Session ID" value={selected.session_id} mono />
                <Row label="Visitor ID" value={selected.visitor_id} mono />
                <Row label="Website" value={selected.website_domain} />
                <Row label="Time" value={new Date(selected.created_at).toLocaleString()} />
              </Section>

              {selected.properties && Object.keys(selected.properties).length > 0 && (
                <Section title="Event Properties">
                  <pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs mt-1 overflow-x-auto">{JSON.stringify(selected.properties, null, 2)}</pre>
                </Section>
              )}

              {selected.page_info && (
                <Section title="Page">
                  {renderObject(selected.page_info)}
                </Section>
              )}

              {selected.device_info && (
                <Section title="Device">
                  {renderObject(selected.device_info)}
                </Section>
              )}

              {selected.network_info && (
                <Section title="Network">
                  {renderObject(selected.network_info)}
                </Section>
              )}

              {selected.performance_info && (
                <Section title="Performance">
                  {renderObject(selected.performance_info)}
                </Section>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-md font-semibold text-gray-700 mb-2 border-b pb-1">{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-gray-500">{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''}>{value}</span>
    </div>
  );
}

function renderObject(obj: Record<string, unknown>) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
      {Object.entries(obj).filter(([_, v]) => v != null).map(([k, v]) => (
        <div key={k} className="flex justify-between py-0.5">
          <span className="text-gray-500 text-xs">{k}</span>
          <span className="font-mono text-xs truncate max-w-[200px]" title={String(v)}>
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        </div>
      ))}
    </div>
  );
}
