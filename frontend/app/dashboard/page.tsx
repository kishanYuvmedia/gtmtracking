'use client';

import { Card } from '../../components/ui/Card';
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

interface Stats {
  total_events: number;
  total_sessions: number;
  total_visitors: number;
  total_websites: number;
}

export default function DashboardOverview() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const res = await api.getEventStats();
      setStats(res.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const metrics = stats
    ? [
        { label: 'Total Events', value: stats.total_events.toLocaleString() },
        { label: 'Total Sessions', value: stats.total_sessions.toLocaleString() },
        { label: 'Total Visitors', value: stats.total_visitors.toLocaleString() },
        { label: 'Websites', value: stats.total_websites.toLocaleString() },
      ]
    : [];

  if (loading) return <div className="text-center py-12 text-gray-500">Loading overview...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.length === 0 ? (
          <Card>
            <p className="text-gray-500">No data yet. Add a website and start tracking events.</p>
          </Card>
        ) : (
          metrics.map((metric) => (
            <Card key={metric.label}>
              <p className="text-sm text-gray-500">{metric.label}</p>
              <p className="text-3xl font-bold mt-1">{metric.value}</p>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
