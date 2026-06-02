'use client';

import { Card } from '../../../components/ui/Card';
import { Button } from '../../../components/ui/Button';
import { Input } from '../../../components/ui/Input';
import { Plus, Copy, ExternalLink, Check } from 'lucide-react';
import { api } from '../../../lib/api';
import { useState, useEffect } from 'react';

interface Website {
  id: string;
  domain: string;
  api_key: string;
  pixel_id: string;
  event_count: number;
  created_at: string;
}

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [scriptModal, setScriptModal] = useState<{ id: string; domain: string } | null>(null);
  const [script, setScript] = useState('');

  useEffect(() => {
    loadWebsites();
  }, []);

  async function loadWebsites() {
    try {
      const res = await api.getWebsites();
      setWebsites(res.websites);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    if (!newDomain.trim()) return;
    setCreating(true);
    try {
      await api.createWebsite(newDomain.trim());
      setShowModal(false);
      setNewDomain('');
      await loadWebsites();
    } catch (err) {
      console.error(err);
    } finally {
      setCreating(false);
    }
  }

  async function handleShowScript(id: string, domain: string) {
    setScriptModal({ id, domain });
    try {
      const res = await api.getWebsiteScript(id);
      setScript(res.script);
    } catch {
      setScript('Failed to load script');
    }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return <div className="text-center py-12 text-gray-500">Loading websites...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Websites</h1>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Website
        </Button>
      </div>

      {websites.length === 0 ? (
        <Card>
          <div className="text-center py-12 text-gray-500">
            <p className="text-lg mb-2">No websites yet</p>
            <p className="text-sm">Add your first website to start tracking events.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {websites.map((site) => (
            <Card key={site.id}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{site.domain}</h3>
                  <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                    <span>API Key: {site.api_key.slice(0, 12)}...</span>
                    <span>{site.event_count.toLocaleString()} events</span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                      active
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCopy(site.api_key, `api-${site.id}`)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Copy API Key"
                  >
                    {copiedId === `api-${site.id}` ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleShowScript(site.id, site.domain)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition"
                    title="Get tracking script"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Add Website</h2>
            <Input
              label="Domain"
              placeholder="example.com"
              value={newDomain}
              onChange={(e) => setNewDomain(e.target.value)}
            />
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={creating || !newDomain.trim()}>
                {creating ? 'Creating...' : 'Add Website'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {scriptModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Tracking Script</h2>
              <button onClick={() => setScriptModal(null)} className="text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <p className="text-sm text-gray-500 mb-3">
              Add this script to the <code className="bg-gray-100 px-1 rounded">&lt;head&gt;</code> of <strong>{scriptModal.domain}</strong>
            </p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-x-auto whitespace-pre-wrap">{script}</pre>
            <div className="flex justify-end mt-4">
              <Button onClick={() => handleCopy(script, 'script')}>
                {copiedId === 'script' ? 'Copied!' : 'Copy Script'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
