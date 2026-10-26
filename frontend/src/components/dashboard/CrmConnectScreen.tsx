import React, { useState } from 'react';
import { ChevronRight, Shield } from 'lucide-react';

interface CrmConnectScreenProps {
  onBack: () => void;
  onSave?: () => void;
}

export const CrmConnectScreen: React.FC<CrmConnectScreenProps> = ({ onBack, onSave }) => {
  const [account, setAccount] = useState('yourbrand.myshopify.com');

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <button onClick={onBack} className="hover:text-ink transition-colors">CRM Connection</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink font-medium">Connect Shopify</span>
      </nav>

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h2 className="text-xs font-bold text-muted uppercase tracking-wider">Authentication</h2>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-bg border border-border rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg border border-border bg-surface flex items-center justify-center">
                <Shield className="w-4 h-4 text-muted" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Authenticate with Salesforce</p>
                <p className="text-[11px] text-muted mt-0.5">
                  You will be redirected to authorize access securely.
                </p>
              </div>
            </div>
            <button className="px-4 py-2 text-xs font-semibold text-muted border border-border rounded-md bg-surface hover:bg-bg hover:border-ink/20 transition-colors whitespace-nowrap">
              Connect via OAuth
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface px-4 text-[11px] font-medium text-muted uppercase tracking-wider">OR</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Account</label>
            <input
              type="text"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="input"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={onSave}
              className="px-5 py-2.5 bg-ink text-white text-sm font-semibold rounded-lg hover:bg-ink-soft transition-colors"
            >
              Authenticate
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
