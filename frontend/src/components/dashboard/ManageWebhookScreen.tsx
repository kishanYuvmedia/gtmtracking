import React, { useState } from 'react';
import { ChevronRight, Copy, Check } from 'lucide-react';

interface ManageWebhookProps {
  onBack: () => void;
}

export const ManageWebhookScreen: React.FC<ManageWebhookProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'logs' | 'configuration'>('configuration');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const handleCopy = (text: string, type: 'url' | 'passcode') => {
    navigator.clipboard.writeText(text);
    if (type === 'url') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 1500);
    } else {
      setCopiedPasscode(true);
      setTimeout(() => setCopiedPasscode(false), 1500);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <button onClick={onBack} className="hover:text-ink transition-colors">CRM Connection</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink font-medium">Manage Webhook</span>
      </nav>

      <div className="border-b border-border">
        <div className="flex gap-0">
          {(['logs', 'configuration'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3.5 text-sm font-semibold capitalize transition-colors border-b-2 -mb-[1px] ${
                activeTab === tab
                  ? 'border-ink text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'configuration' && (
        <div className="space-y-8">
          <div>
            <p className="text-xs text-muted mb-1">
              Add this in your CRM's outgoing webhook settings:
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-success" />
              <span className="text-xs font-medium text-success">Connected</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink">Webhook URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="https://hook.clickowl.io/crm/8×2k9"
                className="input font-mono"
              />
              <button
                onClick={() => handleCopy('https://hook.clickowl.io/crm/8×2k9', 'url')}
                className="p-2.5 border border-border rounded-lg hover:bg-bg transition-colors"
                title="Copy"
              >
                {copiedUrl ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-muted" />
                )}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-ink">Signing Passcode</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value="XYZ_123"
                className="input font-mono"
              />
              <button
                onClick={() => handleCopy('XYZ_123', 'passcode')}
                className="p-2.5 border border-border rounded-lg hover:bg-bg transition-colors"
                title="Copy"
              >
                {copiedPasscode ? (
                  <Check className="w-4 h-4 text-success" />
                ) : (
                  <Copy className="w-4 h-4 text-muted" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button className="px-4 py-2 text-xs font-semibold text-muted border border-border rounded-lg hover:bg-bg transition-colors">
              Send To Dev
            </button>
            <button className="px-4 py-2 text-xs font-semibold text-white bg-ink rounded-lg hover:bg-ink-soft transition-colors">
              Send Test Event
            </button>
          </div>
        </div>
      )}

      {activeTab === 'logs' && (
        <div className="text-center py-12">
          <p className="text-sm text-muted">Webhook logs will appear here.</p>
        </div>
      )}
    </div>
  );
};
