import React, { useState } from 'react';
import { TrendingUp, Calendar, ChevronDown, Download } from 'lucide-react';

const cohortData = [
  { week: 'Week 1', day0: 100, day1: 42, day7: 28, day14: 21, day30: 15 },
  { week: 'Week 2', day0: 100, day1: 38, day7: 25, day14: 19, day30: 13 },
  { week: 'Week 3', day0: 100, day1: 45, day7: 31, day14: 24, day30: 18 },
  { week: 'Week 4', day0: 100, day1: 40, day7: 27, day14: 20, day30: 14 },
  { week: 'Week 5', day0: 100, day1: 44, day7: 29, day14: 22, day30: 16 },
  { week: 'Week 6', day0: 100, day1: 41, day7: 26, day14: 18, day30: 12 },
];

const retentionMetrics = [
  { label: 'D1 Retention', value: '42%', change: '+2.1%', isPositive: true },
  { label: 'D7 Retention', value: '28%', change: '+1.8%', isPositive: true },
  { label: 'D30 Retention', value: '15%', change: '-0.5%', isPositive: false },
  { label: 'Avg Session Length', value: '4m 32s', change: '+12s', isPositive: true },
];

function getHeatColor(value: number): string {
  if (value >= 40) return 'bg-ink text-white';
  if (value >= 30) return 'bg-ink/70 text-white';
  if (value >= 20) return 'bg-ink/40 text-ink';
  if (value >= 15) return 'bg-ink/20 text-ink';
  if (value >= 10) return 'bg-ink/10 text-ink';
  return 'bg-bg text-muted';
}

export const RetentionScreen: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('weekly');
  const [selectedMetric, setSelectedMetric] = useState('cohort');

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Retention</h1>
          <p className="text-sm text-muted mt-1.5">Analyze user retention and engagement over time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted hover:text-ink border border-border rounded-md hover:border-ink/20 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
          <div className="relative">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs border border-border rounded-lg bg-surface text-ink focus:outline-none focus:border-ink/20 pr-8"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {retentionMetrics.map((metric) => (
          <div key={metric.label} className="bg-surface border border-border rounded-xl p-6">
            <p className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1">{metric.label}</p>
            <p className="text-xl font-bold text-ink">{metric.value}</p>
            <div className="flex items-center gap-1 mt-1">
              {metric.isPositive ? <TrendingUp className="w-3 h-3 text-success" /> : <TrendingUp className="w-3 h-3 text-danger rotate-180" />}
              <span className={`text-xs font-semibold ${metric.isPositive ? 'text-success' : 'text-danger'}`}>{metric.change}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {(['cohort', 'trend', 'users'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedMetric(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px] ${
              selectedMetric === tab ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab === 'cohort' ? 'Cohort Table' : tab === 'trend' ? 'Retention Trend' : 'User Cohorts'}
          </button>
        ))}
      </div>

      {selectedMetric === 'cohort' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-ink">Retention Cohort Table</h3>
            <p className="text-xs text-muted mt-0.5">Percentage of users returning after their first visit</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Cohort</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center">Day 0</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center">Day 1</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center">Day 7</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center">Day 14</th>
                  <th className="px-4 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-center">Day 30</th>
                </tr>
              </thead>
              <tbody>
                {cohortData.map((row, i) => (
                  <tr key={i} className="border-b border-border/50 last:border-0">
                    <td className="px-4 py-3 text-xs font-semibold text-ink">{row.week}</td>
                    {[row.day0, row.day1, row.day7, row.day14, row.day30].map((val, j) => (
                      <td key={j} className="px-4 py-3 text-center">
                        <span className={`inline-block w-14 py-1.5 rounded text-[11px] font-bold ${getHeatColor(val)}`}>
                          {val}%
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-border flex items-center gap-4">
            <span className="text-[10px] text-muted uppercase tracking-wider">Legend:</span>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-ink" />
              <span className="text-[10px] text-muted">40%+</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-ink/70" />
              <span className="text-[10px] text-muted">30-39%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-ink/40" />
              <span className="text-[10px] text-muted">20-29%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-ink/20" />
              <span className="text-[10px] text-muted">15-19%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-ink/10" />
              <span className="text-[10px] text-muted">10-14%</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-4 h-3 rounded bg-bg border border-border" />
              <span className="text-[10px] text-muted">&lt;10%</span>
            </div>
          </div>
        </div>
      )}

      {selectedMetric === 'trend' && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-ink mb-4">Retention Trend</h3>
          <div className="space-y-4">
            {[
              { label: 'D1 Retention', data: [42, 38, 45, 40, 44, 41, 43, 39, 46, 42, 40, 44], color: '#0EA5E9' },
              { label: 'D7 Retention', data: [28, 25, 31, 27, 29, 26, 30, 24, 32, 28, 26, 29], color: '#F59E0B' },
              { label: 'D30 Retention', data: [15, 13, 18, 14, 16, 12, 17, 13, 19, 15, 14, 16], color: '#7C3AED' },
            ].map((series) => (
              <div key={series.label} className="flex items-center gap-4">
                <span className="w-24 text-xs font-medium text-ink shrink-0">{series.label}</span>
                <div className="flex-1 flex items-end gap-0.5 h-8">
                  {series.data.map((val, i) => (
                    <div key={i} className="flex-1 rounded-sm" style={{ height: `${val * 2}%`, backgroundColor: series.color }} />
                  ))}
                </div>
                <span className="w-12 text-xs font-bold text-ink text-right">{series.data[series.data.length - 1]}%</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between mt-3 text-[10px] text-muted">
            <span>12 weeks ago</span>
            <span>This week</span>
          </div>
        </div>
      )}

      {selectedMetric === 'users' && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="text-sm font-bold text-ink">User Cohorts</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Cohort</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Users</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">D1</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">D7</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">D30</th>
                <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">LTV</th>
              </tr>
            </thead>
            <tbody>
              {[
                { cohort: 'May 12 - May 18', users: 4829, d1: '42%', d7: '28%', d30: '15%', ltv: '$12.40' },
                { cohort: 'May 5 - May 11', users: 5123, d1: '38%', d7: '25%', d30: '13%', ltv: '$11.20' },
                { cohort: 'Apr 28 - May 4', users: 4567, d1: '45%', d7: '31%', d30: '18%', ltv: '$14.80' },
                { cohort: 'Apr 21 - Apr 27', users: 4231, d1: '40%', d7: '27%', d30: '14%', ltv: '$13.10' },
                { cohort: 'Apr 14 - Apr 20', users: 3987, d1: '44%', d7: '29%', d30: '16%', ltv: '$15.60' },
              ].map((row, i) => (
                <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                  <td className="px-5 py-3 text-xs font-semibold text-ink">{row.cohort}</td>
                  <td className="px-5 py-3 text-xs text-ink text-right">{row.users.toLocaleString()}</td>
                  <td className="px-5 py-3 text-xs text-ink text-right font-medium">{row.d1}</td>
                  <td className="px-5 py-3 text-xs text-ink text-right font-medium">{row.d7}</td>
                  <td className="px-5 py-3 text-xs text-ink text-right font-medium">{row.d30}</td>
                  <td className="px-5 py-3 text-xs text-success text-right font-bold">{row.ltv}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
