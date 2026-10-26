import React, { useState } from 'react';
import { ClickOwlLogo } from '../ClickOwlLogo';
import { AnalyticsWatermark } from '../AnalyticsWatermark';
import { 
  ArrowLeft, 
  Search, 
  Bell, 
  BarChart3, 
  Clock, 
  Activity, 
  Users, 
  MousePointer, 
  Sparkles, 
  Check, 
  ChevronRight,
  TrendingUp
} from 'lucide-react';
import { ScreenMode } from '../../types';

interface WorkspaceReadyScreenProps {
  onNavigate: (screen: ScreenMode) => void;
}

export const WorkspaceReadyScreen: React.FC<WorkspaceReadyScreenProps> = ({
  onNavigate,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'clicks' | 'team'>('overview');
  const [copiedKey, setCopiedKey] = useState(false);
  const accountEmail = (() => {
    try { return localStorage.getItem('pendingEmail') || ''; } catch { return ''; }
  })();

  const handleCopy = () => {
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div
      id="workspace-ready-container"
      className="min-h-screen pt-0 transition-colors duration-300 flex flex-col bg-slate-50 text-slate-900"
    >
      {/* Top Bar */}
      <div className="bg-[#F7F7F5] border-b border-neutral-300 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => onNavigate('signin')}
            className="flex items-center gap-2 text-xs font-semibold text-neutral-800 hover:text-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </button>
          <div className="h-4 w-px bg-neutral-400 hidden sm:block"></div>
          <span className="text-xs font-bold text-neutral-900 hidden sm:inline-block">
            ClickOwl Intelligence Console
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-neutral-600" />
            <input
              type="text"
              placeholder="Search clicks, reports, wisdom..."
              className="input-search pl-9 w-64"
            />
          </div>
          <button className="p-1.5 rounded-lg bg-white/80 border border-neutral-300 text-neutral-700">
            <Bell className="w-4 h-4" />
          </button>
          <div className="w-8 h-8 rounded-full bg-[#FFD10A] flex items-center justify-center font-bold text-[#010101] text-xs shadow-sm">
            JD
          </div>
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Left Sidebar */}
        <aside className="w-full md:w-72 lg:w-80 bg-[#F7F7F5] border-r border-neutral-300 p-6 flex flex-col justify-between shrink-0 relative overflow-hidden">
          <div className="space-y-6 relative z-10">
            <div className="pb-4 border-b border-neutral-300/80">
              <ClickOwlLogo variant="horizontal" size="sm" />
            </div>

            <nav className="space-y-1 text-sm font-medium">
              <button
                onClick={() => setActiveTab('overview')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  activeTab === 'overview'
                    ? 'bg-white text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-700 hover:bg-white/50'
                }`}
              >
                <BarChart3 className="w-4 h-4 text-[#FFD10A]" />
                <span>Live Intelligence</span>
              </button>

              <button
                onClick={() => setActiveTab('clicks')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  activeTab === 'clicks'
                    ? 'bg-white text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-700 hover:bg-white/50'
                }`}
              >
                <MousePointer className="w-4 h-4 text-[#FFD10A]" />
                <span>Click Streams</span>
              </button>

              <button
                onClick={() => setActiveTab('team')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                  activeTab === 'team'
                    ? 'bg-white text-neutral-950 font-bold shadow-sm'
                    : 'text-neutral-700 hover:bg-white/50'
                }`}
              >
                <Users className="w-4 h-4 text-[#FFD10A]" />
                <span>Team Members</span>
              </button>
            </nav>
          </div>

          <div className="relative z-0 mt-8 pt-8">
            <AnalyticsWatermark
              color="#9ca3af"
              opacity={0.7}
              className="w-full max-w-[240px] mx-auto transform translate-y-3"
            />
          </div>
        </aside>

        {/* Center Main Stage */}
        <main className="flex-1 p-6 sm:p-10 lg:p-12 overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center py-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFD10A]/20 text-[#010101] text-xs font-bold mb-4">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Setup Complete</span>
              </div>
              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-neutral-950">
                Your Workspace is Ready
              </h1>
              <p className="mt-3 text-base text-neutral-600 max-w-xl mx-auto">
                Welcome to ClickOwl! Start capturing intelligent clickstream analytics and tracking team productivity instantly.
              </p>
            </div>

            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold mb-2">
                  <span>Clicks Ingested</span>
                    <Activity className="w-4 h-4 text-[#FFD10A]" />
                </div>
                <div className="text-2xl font-black text-neutral-950">14,820</div>
                <div className="text-xs text-emerald-600 font-bold mt-1 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> +24% today
                </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold mb-2">
                  <span>Wisdom Accuracy</span>
                    <Sparkles className="w-4 h-4 text-[#FFD10A]" />
                </div>
                <div className="text-2xl font-black text-neutral-950">99.4%</div>
                <div className="text-xs text-neutral-500 mt-1">High attribution confidence</div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between text-xs text-neutral-500 font-semibold mb-2">
                  <span>Focus Time Tracked</span>
                    <Clock className="w-4 h-4 text-[#FFD10A]" />
                </div>
                <div className="text-2xl font-black text-neutral-950">18h 45m</div>
                <div className="text-xs text-emerald-600 font-bold mt-1">Active team session</div>
              </div>
            </div>

            {/* Quick Setup Checklist */}
            <div className="p-6 sm:p-8 rounded-2xl border border-slate-200 bg-white shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-neutral-950 flex items-center gap-2">
                <span>Recommended Next Steps</span>
              </h2>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-neutral-900">Create ClickOwl Account & Workspace</div>
                      <div className="text-xs text-neutral-500">Default workspace configured for {accountEmail || 'your account'}</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">Done</span>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-[#FFD10A] text-[#010101] flex items-center justify-center text-xs font-bold">2</div>
                    <div>
                      <div className="text-sm font-bold text-neutral-900">Embed ClickOwl Tracking Script</div>
                      <div className="text-xs text-neutral-500">Copy your site tracking script tag into your HTML header</div>
                    </div>
                  </div>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 text-xs font-bold rounded-lg bg-[#010101] text-white hover:bg-[#FFD10A] hover:text-[#010101] transition-colors"
                  >
                    {copiedKey ? 'Copied Code!' : 'Copy Script'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-slate-200 text-neutral-700 flex items-center justify-center text-xs font-bold">3</div>
                    <div>
                      <div className="text-sm font-bold text-neutral-900">Explore Live Click Heatmaps</div>
                      <div className="text-xs text-neutral-500">Test interactive click tracking on the homepage</div>
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigate('signin')}
                    className="flex items-center gap-1 text-xs font-bold text-[#E8B900] hover:underline"
                  >
                    <span>Try Heatmap</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
