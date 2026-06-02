import { Card } from '../../components/ui/Card';

const sources = [
  { name: 'Organic Search', value: 45, color: 'bg-primary-500' },
  { name: 'Direct', value: 25, color: 'bg-green-500' },
  { name: 'Social Media', value: 18, color: 'bg-blue-500' },
  { name: 'Referral', value: 12, color: 'bg-yellow-500' },
];

export function TrafficSources() {
  return (
    <Card title="Traffic Sources">
      <div className="space-y-4">
        {sources.map((source) => (
          <div key={source.name} className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${source.color}`} />
            <span className="flex-1 text-sm">{source.name}</span>
            <span className="text-sm font-semibold">{source.value}%</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
