interface MetricsCardProps {
  label: string;
  value: string;
  change: string;
}

export function MetricsCard({ label, value, change }: MetricsCardProps) {
  const isPositive = change.startsWith('+');
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
      <p className={`text-sm mt-1 ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {change}
      </p>
    </div>
  );
}
