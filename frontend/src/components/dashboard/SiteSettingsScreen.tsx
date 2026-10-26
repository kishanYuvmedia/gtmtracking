import React, { useState } from 'react';
import { ArrowLeft, Save, Trash2, Globe, Shield, Code, Bell } from 'lucide-react';

export const SiteSettingsScreen: React.FC<{ onBack: () => void; onDisconnect: () => void }> = ({ onBack, onDisconnect }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'tracking' | 'advanced' | 'danger'>('general');
  const [domainName, setDomainName] = useState('example2.com');
  const [siteName, setSiteName] = useState('Example2.com');
  const [trackPageviews, setTrackPageviews] = useState(true);
  const [trackClicks, setTrackClicks] = useState(true);
  const [trackForms, setTrackForms] = useState(false);
  const [ipAnonymization, setIpAnonymization] = useState(true);
  const [crossDomain, setCrossDomain] = useState(false);

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-ink">Site Settings</h1>
          <p className="text-xs text-muted">{domainName} · Configure tracking and domain settings</p>
        </div>
      </div>

      <div className="flex items-center gap-0 border-b border-border">
        {(['general', 'tracking', 'advanced', 'danger'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-[1px] ${
              activeTab === tab ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            {tab === 'danger' ? 'Danger Zone' : tab}
          </button>
        ))}
      </div>

      {activeTab === 'general' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Site Name</label>
            <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Domain</label>
            <input type="text" value={domainName} onChange={(e) => setDomainName(e.target.value)} className="input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Timezone</label>
            <select className="select">
              <option>UTC+05:30 (IST)</option>
              <option>UTC+00:00 (GMT)</option>
              <option>UTC-05:00 (EST)</option>
              <option>UTC-08:00 (PST)</option>
            </select>
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      )}

      {activeTab === 'tracking' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink">Tracking Options</h3>
          {[
            { label: 'Track Pageviews', desc: 'Automatically track page view events', value: trackPageviews, setter: setTrackPageviews },
            { label: 'Track Clicks', desc: 'Capture click events on links and buttons', value: trackClicks, setter: setTrackClicks },
            { label: 'Track Form Submissions', desc: 'Monitor form field interactions', value: trackForms, setter: setTrackForms },
            { label: 'IP Anonymization', desc: 'Anonymize user IP addresses for compliance', value: ipAnonymization, setter: setIpAnonymization },
            { label: 'Cross-domain Tracking', desc: 'Track users across multiple domains', value: crossDomain, setter: setCrossDomain },
          ].map((field) => (
            <div key={field.label} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-medium text-ink">{field.label}</p>
                <p className="text-xs text-muted mt-0.5">{field.desc}</p>
              </div>
              <button onClick={() => field.setter(!field.value)} className={`w-9 h-5 rounded-full transition-colors relative ${field.value ? 'bg-ink' : 'bg-border'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${field.value ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-bold text-ink">Advanced Settings</h3>
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Custom Domain</label>
            <input type="text" placeholder="tracking.yourdomain.com" className="input" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Script Version</label>
            <select className="select">
              <option>Latest (v3.2.1)</option>
              <option>Stable (v3.1.0)</option>
              <option>Legacy (v2.8.4)</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Event Buffer Size</label>
            <input type="number" defaultValue={50} className="input" />
          </div>
          <div className="flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>
      )}

      {activeTab === 'danger' && (
        <div className="bg-surface border border-danger/20 rounded-xl p-6">
          <h3 className="text-sm font-bold text-danger mb-1">Danger Zone</h3>
          <p className="text-xs text-muted mb-4">Irreversible actions that affect your site connection.</p>
          <div className="flex items-center justify-between py-3 border-b border-border/50">
            <div>
              <p className="text-sm font-medium text-ink">Delete Tracking Script</p>
              <p className="text-xs text-muted">Remove the tracking script from your site</p>
            </div>
            <button className="px-3 py-1.5 text-xs text-danger border border-danger/20 rounded-md hover:bg-danger/5 transition-colors">Delete</button>
          </div>
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-ink">Disconnect Site</p>
              <p className="text-xs text-muted">Stop all tracking and remove site data</p>
            </div>
            <button onClick={onDisconnect} className="px-3 py-1.5 text-xs text-white bg-danger rounded-md hover:bg-danger/90 transition-colors">Disconnect</button>
          </div>
        </div>
      )}
    </div>
  );
};
