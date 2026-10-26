import React, { useState } from 'react';
import { Key, Copy, Trash2, Plus, Eye, EyeOff, Check } from 'lucide-react';

interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  created: string;
  lastUsed: string;
  scopes: string[];
  status: 'active' | 'revoked';
}

const apiKeys: ApiKey[] = [
  { id: '1', name: 'Production', key: 'clk_live_sk_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', prefix: 'clk_live_sk_', created: 'Jan 15, 2026', lastUsed: '2 min ago', scopes: ['read', 'write', 'admin'], status: 'active' },
  { id: '2', name: 'Staging', key: 'clk_test_sk_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4', prefix: 'clk_test_sk_', created: 'Feb 20, 2026', lastUsed: '3 hr ago', scopes: ['read', 'write'], status: 'active' },
  { id: '3', name: 'Development', key: 'clk_dev_sk_m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8', prefix: 'clk_dev_sk_', created: 'Mar 10, 2026', lastUsed: '1 day ago', scopes: ['read'], status: 'active' },
];

export const ApiKeysScreen: React.FC = () => {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newScopes, setNewScopes] = useState<string[]>(['read']);
  const [revealedId, setRevealedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setNewScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);
  };

  const handleCopy = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-[900px] mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">API Keys</h1>
          <p className="text-sm text-muted mt-1.5">Manage API keys for programmatic access to your data.</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Generate Key
        </button>
      </div>

      {showCreate && (
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-sm font-bold text-ink mb-3">Create New API Key</h3>
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-1 block">Key Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Production, Staging"
                className="input"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted uppercase tracking-wider mb-2 block">Scopes</label>
              <div className="flex gap-2">
                {['read', 'write', 'admin'].map((scope) => (
                  <button
                    key={scope}
                    onClick={() => toggleScope(scope)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                      newScopes.includes(scope)
                        ? 'bg-ink text-white border-ink'
                        : 'bg-surface text-muted border-border hover:border-ink/20'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-muted hover:text-ink border border-border rounded-md transition-colors">Cancel</button>
              <button className="px-4 py-2 bg-ink text-white text-sm font-medium rounded-md hover:bg-ink/90 transition-colors">Create Key</button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <span className="text-sm font-bold text-ink">{apiKeys.length} API Keys</span>
        </div>
        <div className="divide-y divide-border/50">
          {apiKeys.map((apiKey) => (
            <div key={apiKey.id} className="px-5 py-4 hover:bg-bg/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-bg border border-border flex items-center justify-center">
                    <Key className="w-4 h-4 text-muted" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-ink">{apiKey.name}</p>
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        apiKey.status === 'active' ? 'bg-success/10 text-success' : 'bg-bg text-muted'
                      }`}>{apiKey.status}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-[11px] font-mono text-muted bg-bg px-2 py-0.5 rounded">
                        {revealedId === apiKey.id ? apiKey.key : `${apiKey.prefix}${'*'.repeat(20)}`}
                      </code>
                      <button
                        onClick={() => setRevealedId(revealedId === apiKey.id ? null : apiKey.id)}
                        className="text-muted hover:text-ink transition-colors"
                      >
                        {revealedId === apiKey.id ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleCopy(apiKey.key, apiKey.id)}
                        className="text-muted hover:text-ink transition-colors"
                      >
                        {copiedId === apiKey.id ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex gap-1">
                        {apiKey.scopes.map((scope) => (
                          <span key={scope} className="px-1.5 py-0.5 bg-bg border border-border rounded text-[9px] text-muted uppercase">{scope}</span>
                        ))}
                      </div>
                      <span className="text-[11px] text-muted">Created {apiKey.created}</span>
                      <span className="text-[11px] text-muted">Last used {apiKey.lastUsed}</span>
                    </div>
                  </div>
                </div>
                {apiKey.status === 'active' && (
                  <button className="text-muted hover:text-danger transition-colors p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
