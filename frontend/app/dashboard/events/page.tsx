'use client';

import { Card } from '../../../components/ui/Card';
import { useState, useEffect } from 'react';
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

export default function EventsPage() {
  const [events, setEvents] = useState<EnrichedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<EnrichedEvent | null>(null);

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
      </div>

      {events.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No events yet</p>
            <p className="text-sm">Events will appear here once your tracking script starts sending data.</p>
          </div>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b border-gray-200">
                  <th className="pb-3 font-medium">Event</th>
                  <th className="pb-3 font-medium">Website</th>
                  <th className="pb-3 font-medium">Session</th>
                  <th className="pb-3 font-medium">Device</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelected(selected?.id === event.id ? null : event)}
                  >
                    <td className="py-3 text-sm font-medium">{event.event_name}</td>
                    <td className="py-3 text-sm text-gray-600">{event.website_domain}</td>
                    <td className="py-3 text-sm font-mono text-gray-500">{event.session_id.slice(0, 8)}...</td>
                    <td className="py-3 text-sm text-gray-500">
                      {event.device_info
                        ? `${(event.device_info as Record<string, unknown>).browser_name || '?'} / ${(event.device_info as Record<string, unknown>).os_name || '?'}`
                        : '-'}
                    </td>
                    <td className="py-3 text-sm text-gray-500">{timeAgo(event.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selected.event_name}</h2>
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
