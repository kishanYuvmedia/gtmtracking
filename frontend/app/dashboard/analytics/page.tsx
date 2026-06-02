import { Card } from '../../../components/ui/Card';
import { MetricsCard } from '../../../analytics/components/MetricsCard';
import { EventChart } from '../../../analytics/components/EventChart';
import { TopPages } from '../../../analytics/components/TopPages';
import { TrafficSources } from '../../../analytics/components/TrafficSources';

export default function AnalyticsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Analytics</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <MetricsCard label="Total Events" value="12,345" change="+12%" />
        <MetricsCard label="Conversion Rate" value="3.2%" change="+0.5%" />
        <MetricsCard label="Sessions" value="8,901" change="+8%" />
        <MetricsCard label="Avg. Session" value="4m 32s" change="+15s" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <EventChart />
        <TrafficSources />
      </div>

      <TopPages />
    </div>
  );
}
