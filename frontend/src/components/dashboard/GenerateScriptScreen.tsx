import React, { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { Check, ChevronRight, Copy, Send } from 'lucide-react';

interface GenerateScriptProps {
  onBack: () => void;
  onNext: () => void;
}

interface WebsiteOption {
  id: string;
  name: string | null;
  domain: string;
}

export const GenerateScriptScreen: React.FC<GenerateScriptProps> = ({ onBack, onNext }) => {
  const [copied, setCopied] = useState(false);
  const [scriptCode, setScriptCode] = useState('');
  const [websiteId, setWebsiteId] = useState(() => localStorage.getItem('currentWebsiteId') || '');
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [loadingWebsites, setLoadingWebsites] = useState(true);
  const [loadingScript, setLoadingScript] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.getWebsites()
      .then((response: { websites: WebsiteOption[] }) => {
        if (cancelled) return;

        let selectedIds: string[] = [];
        try {
          const savedIds: unknown = JSON.parse(localStorage.getItem('currentWebsiteIds') || '[]');
          if (Array.isArray(savedIds)) {
            selectedIds = savedIds.filter((id): id is string => typeof id === 'string');
          }
        } catch {
          selectedIds = [];
        }

        const setupIds = new Set(selectedIds);
        const availableWebsites = setupIds.size
          ? response.websites.filter((website) => setupIds.has(website.id))
          : response.websites;
        setWebsites(availableWebsites);
        if (!availableWebsites.length) {
          setWebsiteId('');
          setError('No connected websites were found. Add a website before generating its tracking pixel.');
        } else if (!availableWebsites.some((website) => website.id === websiteId)) {
          setWebsiteId(availableWebsites[0].id);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load connected websites');
      })
      .finally(() => {
        if (!cancelled) setLoadingWebsites(false);
      });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!websiteId) return;
    let cancelled = false;
    setLoadingScript(true);
    setError('');
    api.getWebsiteScript(websiteId)
      .then((response: { script: string }) => {
        if (!cancelled) setScriptCode(response.script);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to generate the tracking pixel');
      })
      .finally(() => {
        if (!cancelled) setLoadingScript(false);
      });

    return () => { cancelled = true; };
  }, [websiteId]);

  useEffect(() => {
    if (websiteId) localStorage.setItem('currentWebsiteId', websiteId);
  }, [websiteId]);

  useEffect(() => {
    if (websites.length) {
      localStorage.setItem('currentWebsiteIds', JSON.stringify(websites.map((website) => website.id)));
    }
  }, [websites]);

  const handleCopy = () => {
    if (!scriptCode) return;
    navigator.clipboard.writeText(scriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
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
                <div className="w-5 h-5 rounded-full bg-ink text-white flex items-center justify-center text-[10px] font-bold flex-shrink-0">2</div>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink">Setup Website</span>
                <div className="space-y-1.5 mt-1.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-success" />
                    <span className="text-[11px] text-muted">Server-side setup</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-ink" />
                    <span className="text-[11px] font-semibold text-ink">Generate Script</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-4">
          {websites.length > 1 && (
            <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
              <label htmlFor="pixel-website" className="text-xs font-semibold text-ink">Website for this pixel</label>
              <select
                id="pixel-website"
                value={websiteId}
                onChange={(event) => setWebsiteId(event.target.value)}
                className="select"
              >
                {websites.map((website) => (
                  <option key={website.id} value={website.id}>{website.name || website.domain} ({website.domain})</option>
                ))}
              </select>
            </div>
          )}

          {error && <p role="alert" className="text-xs text-danger">{error}</p>}

          <div className="bg-surface border border-border rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-sm font-bold text-ink">Add Tracking Script</h2>
              <p className="text-xs text-muted mt-1">
                Place this website-specific script inside the <code className="px-1 py-0.5 bg-bg rounded text-[10px] font-mono">&lt;head&gt;</code> tag.
              </p>
            </div>

            <div className="p-5">
              <div className="bg-[#1e1e2e] rounded-xl overflow-hidden border border-[#313244]">
                <div className="flex items-center justify-between px-4 py-2.5 bg-[#181825] border-b border-[#313244]">
                  <span className="text-[11px] text-[#6c7086] font-mono">tracking-pixel.html</span>
                  <button
                    onClick={handleCopy}
                    disabled={!scriptCode || loadingScript}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#313244] hover:bg-[#45475a] transition-colors text-[10px] text-[#cdd6f4] font-medium disabled:opacity-50"
                  >
                    {copied ? <><Check className="w-3 h-3 text-[#a6e3a1]" />Copied</> : <><Copy className="w-3 h-3" />Copy</>}
                  </button>
                </div>
                <div className="p-4 overflow-x-auto">
                  <pre className="text-[11px] leading-relaxed font-mono text-[#cdd6f4] whitespace-pre-wrap">
                    <code>{loadingWebsites || loadingScript ? 'Loading tracking pixel...' : scriptCode || 'No tracking pixel available.'}</code>
                  </pre>
                </div>
              </div>
            </div>

            <div className="px-5 pb-5">
              <button
                onClick={onNext}
                disabled={!scriptCode || loadingWebsites || loadingScript}
                className="w-full py-2.5 text-xs font-semibold text-white bg-ink rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50"
              >
                Verify
              </button>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-bg border border-border flex items-center justify-center flex-shrink-0">
              <Send className="w-4 h-4 text-muted" />
            </div>
            <div className="flex-1">
              <h3 className="text-xs font-bold text-ink">Send to Developer</h3>
              <p className="text-[11px] text-muted mt-0.5 leading-relaxed">Share the installation instructions with your developer to complete the setup.</p>
            </div>
            <button className="p-2 rounded-lg hover:bg-bg transition-colors" aria-label="Send instructions">
              <Send className="w-4 h-4 text-muted" />
            </button>
          </div>

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
            <button onClick={onBack} className="px-5 py-2 text-xs font-semibold text-muted border border-border rounded-lg hover:bg-bg transition-colors">
              Back
            </button>
            <button
              onClick={onNext}
              disabled={!scriptCode || loadingWebsites || loadingScript}
              className="px-5 py-2 text-xs font-semibold text-white bg-ink rounded-lg hover:bg-ink-soft transition-colors disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
