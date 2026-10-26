import React from 'react';
import { ChevronLeft, Check } from 'lucide-react';

interface FacebookAdsDetailProps {
  onBack: () => void;
  onConnect: () => void;
}

export const FacebookAdsDetailScreen: React.FC<FacebookAdsDetailProps> = ({
  onBack,
  onConnect,
}) => {
  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-xs font-medium text-muted hover:text-ink transition-colors"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        <span>Destinations</span>
      </button>

      <div className="bg-surface border border-border rounded-xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#1877F2] flex items-center justify-center shrink-0">
            <span className="text-white text-sm font-bold">F</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-ink">Facebook Ads</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-bg border border-border text-[11px] font-semibold text-muted">
                Not connected
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-bg border border-border text-[11px] font-medium text-muted">
                Advertising
              </span>
            </div>
            <p className="text-sm text-muted mt-2 leading-relaxed max-w-[560px]">
              Send conversion events and audiences to Facebook Ads to optimize your ad campaigns.
            </p>
          </div>
        </div>

        <div className="border-t border-border mt-5 pt-5">
          <button
            onClick={onConnect}
            className="px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-ink-soft transition-colors"
          >
            Connect Facebook Ads
          </button>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-bold text-ink">About this destination</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-bg rounded-xl p-6 border border-border">
            <p className="text-xs text-muted mb-1">Category</p>
            <p className="text-sm font-semibold text-ink">Advertising</p>
          </div>
          <div className="bg-bg rounded-xl p-6 border border-border">
            <p className="text-xs text-muted mb-1">Required fields</p>
            <p className="text-sm font-semibold text-ink">2 required</p>
          </div>
        </div>

        <div className="bg-bg rounded-xl p-6 border border-border">
          <p className="text-xs text-muted mb-3">What you can do</p>
          <div className="space-y-2.5">
            {[
              'Forward events in real-time',
              'Map custom event properties',
              'Filter events by type or property',
            ].map((capability) => (
              <div key={capability} className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-ink shrink-0" />
                <span className="text-sm text-ink">{capability}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
