import React, { useState } from 'react';
import { ChevronRight, Copy, Check, Search } from 'lucide-react';

interface ServerSetupProps {
  onBack: () => void;
  onNext: () => void;
}

interface DnsRecord {
  type: string;
  host: string;
  value: string;
  ttl: string;
}

export const ServerSetupScreen: React.FC<ServerSetupProps> = ({ onBack, onNext }) => {
  const [cdnEnabled, setCdnEnabled] = useState(true);
  const [subdomain, setSubdomain] = useState('');
  const [dnsRecord, setDnsRecord] = useState<DnsRecord | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleGenerateRecord = () => {
    if (!subdomain.trim()) return;
    setDnsRecord({
      type: 'CNAME',
      host: subdomain.split('.')[0] || 'track',
      value: `pulse-${subdomain.split('.')[0] || 'track'}.clickowl.io`,
      ttl: 'Auto',
    });
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      <nav className="flex items-center gap-1.5 text-xs text-muted">
        <button onClick={onBack} className="hover:text-ink transition-colors">Sites</button>
        <ChevronRight className="w-3 h-3" />
        <button onClick={onBack} className="hover:text-ink transition-colors">Add Domain</button>
        <ChevronRight className="w-3 h-3" />
        <span className="text-ink font-medium">Website Setup</span>
      </nav>

      <div className="flex gap-8">
        <div className="w-[180px] flex-shrink-0">
          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-4">Add Website Checklist</h3>
          <div className="space-y-0">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-success text-white flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3" />
                </div>
                <div className="w-px h-6 bg-border" />
              </div>
              <span className="text-xs text-muted line-through pt-0.5">Add Domain</span>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center">
                <div className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                  2
                </div>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink">Setup Website</span>
                <div className="space-y-1.5 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-ink" />
                    <span className="text-[11px] font-semibold text-ink">Server-side setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-border" />
                    <span className="text-[11px] text-muted">Generate Script</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-5">
          <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
            <h2 className="text-sm font-bold text-ink">Required DNS Record</h2>

            <div className="flex items-center justify-between py-2">
              <span className="text-xs font-semibold text-ink">Enable CDN</span>
              <button
                onClick={() => setCdnEnabled(!cdnEnabled)}
                className={`w-10 h-5 rounded-full transition-colors ${
                  cdnEnabled ? 'bg-ink' : 'bg-border'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white transition-transform ml-0.5 ${
                  cdnEnabled ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink">Add Sub-Domain</label>
              <input
                type="text"
                placeholder="track.example.com"
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                className="input"
              />
            </div>

            <button
              onClick={handleGenerateRecord}
              disabled={!subdomain.trim()}
              className={`w-full py-2.5 text-xs font-semibold rounded-lg transition-colors ${
                subdomain.trim()
                  ? 'bg-ink text-white hover:bg-ink-soft'
                  : 'bg-border text-muted cursor-not-allowed'
              }`}
            >
              Generate Record
            </button>
          </div>

          {!dnsRecord && (
            <div className="bg-surface border border-border rounded-xl p-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 rounded-full bg-bg border border-border flex items-center justify-center mb-3">
                  <Search className="w-5 h-5 text-muted" />
                </div>
                <p className="text-sm text-muted">No records generated at the moment.</p>
              </div>
            </div>
          )}

          {dnsRecord && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border bg-bg">
                <h3 className="text-xs font-bold text-muted uppercase tracking-wider">DNS Record</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted">Type</span>
                  <span className="text-xs text-ink font-mono font-medium bg-bg px-2 py-0.5 rounded">{dnsRecord.type}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted">Host</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink font-mono font-medium">{dnsRecord.host}</span>
                    <button
                      onClick={() => handleCopy(dnsRecord.host, 'host')}
                      className="p-1 rounded hover:bg-bg transition-colors"
                    >
                      {copiedField === 'host' ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-border/50">
                  <span className="text-xs font-semibold text-muted">Value</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ink font-mono font-medium">{dnsRecord.value}</span>
                    <button
                      onClick={() => handleCopy(dnsRecord.value, 'value')}
                      className="p-1 rounded hover:bg-bg transition-colors"
                    >
                      {copiedField === 'value' ? (
                        <Check className="w-3.5 h-3.5 text-success" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-muted" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-xs font-semibold text-muted">TTL</span>
                  <span className="text-xs text-ink font-mono font-medium">{dnsRecord.ttl}</span>
                </div>
              </div>
            </div>
          )}

          <div className="bg-surface border border-border rounded-xl p-6">
            <h3 className="text-xs font-bold text-ink mb-1">Tools and Tips</h3>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">Technical guides</span>
              <span className="text-xs text-ink font-semibold flex items-center gap-1 hover:underline cursor-pointer">
                Documentation <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onBack}
              className="px-5 py-2 text-xs font-semibold text-muted border border-border rounded-lg hover:bg-bg transition-colors"
            >
              Back
            </button>
            <button
              onClick={onNext}
              className="px-5 py-2 text-xs font-semibold text-white bg-ink rounded-lg hover:bg-ink-soft transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
