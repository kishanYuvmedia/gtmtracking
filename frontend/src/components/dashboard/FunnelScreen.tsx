import React, { useState } from 'react';
import { Plus, ChevronDown, TrendingUp, Filter, Search, ArrowRight, X } from 'lucide-react';

interface FunnelStep {
  id: string;
  event: string;
  label: string;
}

interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  conversionRate: string;
  totalUsers: number;
  dropoffRate: string;
  lastUpdated: string;
}

const funnels: Funnel[] = [
  {
    id: '1',
    name: 'Purchase Flow',
    steps: [
      { id: '1', event: 'page_view', label: 'Page View' },
      { id: '2', event: 'add_to_cart', label: 'Add to Cart' },
      { id: '3', event: 'checkout_start', label: 'Start Checkout' },
      { id: '4', event: 'purchase_complete', label: 'Purchase' },
    ],
    conversionRate: '3.2%',
    totalUsers: 48291,
    dropoffRate: '96.8%',
    lastUpdated: '2 min ago',
  },
  {
    id: '2',
    name: 'Signup Funnel',
    steps: [
      { id: '1', event: 'landing_page', label: 'Landing Page' },
      { id: '2', event: 'signup_start', label: 'Start Signup' },
      { id: '3', event: 'signup_complete', label: 'Complete Signup' },
    ],
    conversionRate: '12.4%',
    totalUsers: 18432,
    dropoffRate: '87.6%',
    lastUpdated: '5 min ago',
  },
  {
    id: '3',
    name: 'Lead to Customer',
    steps: [
      { id: '1', event: 'form_submit', label: 'Form Submit' },
      { id: '2', event: 'demo_request', label: 'Demo Request' },
      { id: '3', event: 'trial_start', label: 'Start Trial' },
      { id: '4', event: 'subscription', label: 'Subscribe' },
    ],
    conversionRate: '8.1%',
    totalUsers: 3291,
    dropoffRate: '91.9%',
    lastUpdated: '1 hr ago',
  },
];

const stepColors = ['#0EA5E9', '#F59E0B', '#7C3AED', '#16A34A'];

export const FunnelScreen: React.FC = () => {
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel>(funnels[0]);
  const [showCreate, setShowCreate] = useState(false);
  const [newSteps, setNewSteps] = useState<FunnelStep[]>([]);

  const funnelData = [
    { step: 'Page View', users: 48291, rate: '100%', dropoff: '—' },
    { step: 'Add to Cart', users: 12847, rate: '26.6%', dropoff: '73.4%' },
    { step: 'Start Checkout', users: 4128, rate: '8.5%', dropoff: '18.1%' },
    { step: 'Purchase', users: 1545, rate: '3.2%', dropoff: '5.3%' },
  ];

  const barWidths = [100, 26.6, 8.5, 3.2];

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Funnels</h1>
          <p className="text-sm text-muted mt-1.5">Track conversion rates across multi-step user journeys.</p>
        </div>
        <button onClick={() => setShowCreate(!showCreate)} className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">
          <Plus className="w-4 h-4" /> New Funnel
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-ink mb-3">Create New Funnel</h3>
          <div className="space-y-3">
            <input type="text" placeholder="Funnel name" className="input" />
            <div className="flex items-center gap-2 flex-wrap">
              {newSteps.map((step, i) => (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border rounded-md">
                    <span className="text-xs text-ink font-medium">{step.label}</span>
                    <button onClick={() => setNewSteps((prev) => prev.filter((s) => s.id !== step.id))} className="text-muted hover:text-danger">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  {i < newSteps.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted" />}
                </React.Fragment>
              ))}
              <button
                onClick={() => setNewSteps((prev) => [...prev, { id: Date.now().toString(), event: `event_${prev.length + 1}`, label: `Step ${prev.length + 1}` }])}
                className="flex items-center gap-1 px-3 py-1.5 border border-dashed border-border rounded-md text-xs text-muted hover:text-ink hover:border-ink/20 transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Step
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowCreate(false); setNewSteps([]); }} className="px-4 py-2 text-sm text-muted hover:text-ink border border-border rounded-md transition-colors">Cancel</button>
              <button className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">Create Funnel</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-0">
        <div className={`${selectedFunnel ? 'w-[280px]' : 'w-full'} space-y-3 shrink-0`}>
          {funnels.map((funnel) => (
            <div
              key={funnel.id}
              onClick={() => setSelectedFunnel(funnel)}
              className={`bg-surface border rounded-xl p-6 cursor-pointer transition-all ${
                selectedFunnel?.id === funnel.id ? 'border-ink/20 shadow-sm' : 'border-border hover:border-ink/10'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-ink">{funnel.name}</h3>
                <span className="text-lg font-bold text-ink">{funnel.conversionRate}</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {funnel.steps.map((step, i) => (
                  <React.Fragment key={step.id}>
                    <span className="text-[10px] text-muted px-1.5 py-0.5 bg-bg rounded">{step.label}</span>
                    {i < funnel.steps.length - 1 && <ArrowRight className="w-2.5 h-2.5 text-border" />}
                  </React.Fragment>
                ))}
              </div>
              <div className="flex items-center justify-between text-[11px] text-muted">
                <span>{funnel.totalUsers.toLocaleString()} users</span>
                <span>{funnel.dropoffRate} drop-off</span>
              </div>
            </div>
          ))}
        </div>

        {selectedFunnel && (
          <div className="flex-1 ml-6 space-y-6">
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-bold text-ink">{selectedFunnel.name}</h2>
                  <p className="text-xs text-muted mt-0.5">{selectedFunnel.steps.length} steps · {selectedFunnel.totalUsers.toLocaleString()} total users</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-ink">{selectedFunnel.conversionRate}</p>
                  <p className="text-xs text-success font-semibold">Overall conversion</p>
                </div>
              </div>

              <div className="space-y-3">
                {funnelData.map((step, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="w-32 shrink-0">
                      <p className="text-xs font-semibold text-ink">{step.step}</p>
                    </div>
                    <div className="flex-1 h-10 bg-bg rounded-md overflow-hidden relative">
                      <div
                        className="h-full rounded-md transition-all duration-500"
                        style={{ width: `${barWidths[i]}%`, backgroundColor: stepColors[i] }}
                      />
                      <div className="absolute inset-0 flex items-center px-3">
                        <span className="text-xs font-bold text-ink">{step.users.toLocaleString()}</span>
                        <span className="text-[10px] text-muted ml-2">({step.rate})</span>
                      </div>
                    </div>
                    <div className="w-16 text-right shrink-0">
                      {i > 0 && <span className="text-[10px] text-danger font-medium">{step.dropoff}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <h3 className="text-sm font-bold text-ink">Step Details</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Step</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider">Event</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Users</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Conv. Rate</th>
                    <th className="px-5 py-2.5 text-[10px] font-semibold text-muted uppercase tracking-wider text-right">Drop-off</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedFunnel.steps.map((step, i) => (
                    <tr key={step.id} className="border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: stepColors[i] }}>{i + 1}</span>
                          <span className="text-xs font-semibold text-ink">{step.label}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-muted font-mono">{step.event}</td>
                      <td className="px-5 py-3 text-xs text-ink text-right font-medium">{funnelData[i]?.users.toLocaleString()}</td>
                      <td className="px-5 py-3 text-xs text-ink text-right font-semibold">{funnelData[i]?.rate}</td>
                      <td className="px-5 py-3 text-xs text-danger text-right">{funnelData[i]?.dropoff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
