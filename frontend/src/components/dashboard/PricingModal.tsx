import React from 'react';
import { X, Check, ArrowUpRight } from 'lucide-react';

interface PricingPlan {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const plans: PricingPlan[] = [
  {
    name: 'Starter',
    price: '$0',
    period: '/month',
    description: 'For small projects getting started',
    features: [
      '10,000 events/month',
      '1 website',
      '5 destinations',
      '5 sources',
      '5 segments',
      'Basic analytics',
      'Email support',
    ],
  },
  {
    name: 'Growth',
    price: '$49',
    period: '/month',
    description: 'For growing businesses',
    features: [
      '100,000 events/month',
      '5 websites',
      '15 destinations',
      '15 sources',
      '15 segments',
      'Advanced analytics',
      'Priority support',
      'Custom domains',
      'API access',
    ],
    highlighted: true,
    badge: 'Most Popular',
  },
  {
    name: 'Scale',
    price: '$199',
    period: '/month',
    description: 'For scaling operations',
    features: [
      '1,000,000 events/month',
      '25 websites',
      'Unlimited destinations',
      'Unlimited sources',
      'Unlimited segments',
      'Enterprise analytics',
      'Dedicated support',
      'Custom domains',
      'API access',
      'Webhooks',
      'Team collaboration',
    ],
  },
];

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (plan: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-surface border border-border rounded-2xl shadow-xl w-full max-w-4xl mx-4 overflow-hidden animate-in">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-bg transition-colors"
        >
          <X className="w-4 h-4 text-muted" />
        </button>

        <div className="p-6 pb-4 border-b border-border">
          <h2 className="text-lg font-bold text-ink">Choose Your Plan</h2>
          <p className="text-[13px] text-muted mt-1">Select the plan that best fits your needs</p>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-surface border rounded-2xl p-5 flex flex-col ${
                plan.highlighted
                  ? 'border-ink shadow-lg ring-1 ring-ink/10'
                  : 'border-border hover:border-ink/20 hover:shadow-md'
              } transition-all duration-150`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-ink text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-sm">
                  {plan.badge}
                </div>
              )}

              <div className="mb-4">
                <p className="text-[11px] font-semibold text-muted uppercase tracking-wider">{plan.name}</p>
                <div className="flex items-baseline gap-0.5 mt-2">
                  <span className="text-3xl font-bold text-ink">{plan.price}</span>
                  <span className="text-[13px] text-muted">{plan.period}</span>
                </div>
                <p className="text-[13px] text-muted mt-2">{plan.description}</p>
              </div>

              <div className="border-t border-border pt-4 mb-4 flex-1">
                <ul className="space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      <span className="text-[13px] text-ink">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                onClick={() => {
                  onSelectPlan?.(plan.name);
                  onClose();
                }}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2.5 text-[13px] font-semibold rounded-xl transition-all duration-150 ${
                  plan.highlighted
                    ? 'bg-ink text-white hover:bg-ink-soft shadow-md'
                    : 'bg-bg text-ink border border-border hover:border-ink/20'
                }`}
              >
                {plan.price === '$0' ? 'Current Plan' : 'Upgrade'}
                {plan.price !== '$0' && <ArrowUpRight className="w-3.5 h-3.5" />}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
