import React, { useState } from 'react';
import { ArrowLeft, ExternalLink, Shield, Check } from 'lucide-react';

export const HubSpotConnectScreen: React.FC<{ onBack: () => void; onSave: () => void }> = ({ onBack, onSave }) => {
  const [step, setStep] = useState<'auth' | 'config'>('auth');
  const [connected, setConnected] = useState(false);
  const [selectedLists, setSelectedLists] = useState<string[]>(['all_contacts']);
  const [syncFrequency, setSyncFrequency] = useState('realtime');

  const handleConnect = () => {
    setConnected(true);
    setStep('config');
  };

  const toggleList = (id: string) => {
    setSelectedLists((prev) => prev.includes(id) ? prev.filter((l) => l !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-[700px] mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-muted hover:text-ink transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-[#FF7A59] flex items-center justify-center">
          <span className="text-white text-base font-bold">H</span>
        </div>
        <div>
          <h1 className="text-lg font-bold text-ink">Connect HubSpot</h1>
          <p className="text-xs text-muted">Sync your event data with HubSpot CRM.</p>
        </div>
      </div>

      {!connected ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-[#FF7A59]/10 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8 text-[#FF7A59]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-ink">Authorize HubSpot Access</h2>
            <p className="text-sm text-muted mt-2 max-w-md mx-auto">
              ClickOwl needs permission to access your HubSpot account to sync events and contacts.
            </p>
          </div>
          <div className="bg-bg rounded-lg p-4 max-w-sm mx-auto text-left space-y-2">
            <p className="text-xs font-semibold text-ink">Permissions requested:</p>
            {['Read contacts', 'Write contacts', 'Read companies', 'Read deals'].map((perm) => (
              <div key={perm} className="flex items-center gap-2">
                <Check className="w-3.5 h-3.5 text-success" />
                <span className="text-xs text-muted">{perm}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#FF7A59] text-white text-sm font-medium rounded-md hover:bg-[#FF7A59]/90 transition-colors mx-auto"
          >
            <ExternalLink className="w-4 h-4" />
            Connect to HubSpot
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="bg-surface border border-border rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Check className="w-5 h-5 text-success" />
              <span className="text-sm font-bold text-ink">Connected to HubSpot</span>
              <span className="text-xs text-muted">· Account: clickowl@hubspot.com</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 block">Sync Frequency</label>
                <div className="flex gap-2">
                  {['realtime', 'hourly', 'daily'].map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setSyncFrequency(freq)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors capitalize ${
                        syncFrequency === freq ? 'bg-ink text-white border-ink' : 'bg-surface text-muted border-border hover:border-ink/20'
                      }`}
                    >
                      {freq}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 block">Contact Lists to Sync</label>
                <div className="space-y-2">
                  {[
                    { id: 'all_contacts', label: 'All Contacts', count: 12847 },
                    { id: 'marketing_leads', label: 'Marketing Leads', count: 3421 },
                    { id: 'customers', label: 'Customers', count: 892 },
                    { id: 'enterprise', label: 'Enterprise Accounts', count: 156 },
                  ].map((list) => (
                    <label key={list.id} className="flex items-center justify-between py-2 px-3 rounded-md border border-border hover:bg-bg/50 transition-colors cursor-pointer">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedLists.includes(list.id)}
                          onChange={() => toggleList(list.id)}
                          className="w-4 h-4 rounded border-border text-ink focus:ring-ink/20"
                        />
                        <span className="text-sm text-ink">{list.label}</span>
                      </div>
                      <span className="text-xs text-muted">{list.count.toLocaleString()} contacts</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button onClick={onBack} className="px-4 py-2 text-sm text-muted hover:text-ink border border-border rounded-md transition-colors">Cancel</button>
            <button onClick={onSave} className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">Save Configuration</button>
          </div>
        </div>
      )}
    </div>
  );
};
