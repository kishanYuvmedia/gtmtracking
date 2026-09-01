'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Plus, Copy, Check, Globe, ChevronRight, RefreshCw,
  Code, AlertCircle, ExternalLink, Eye, Activity, MousePointerClick,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';

interface Website {
  id: string;
  domain: string;
  api_key: string;
  name: string;
  status: string;
  event_count: number;
  events_24h: number;
  visitor_count: number;
  created_at: string;
}

const DATA_COLLECTED = [
  { label: 'Page Views', icon: Eye, desc: 'URLs, titles, referrers' },
  { label: 'Interactions', icon: MousePointerClick, desc: 'Clicks, scrolls, form submissions' },
  { label: 'Ad Campaigns', icon: Activity, desc: 'UTM params, GCLID, FB click IDs' },
  { label: 'Device & Browser', icon: Globe, desc: 'OS, screen, browser, language' },
  { label: 'Performance', icon: Activity, desc: 'Page load, Core Web Vitals' },
  { label: 'Session Data', icon: Activity, desc: 'Duration, pages visited, bounce rate' },
];

export default function WebsitesPage() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);
  const [newDomain, setNewDomain] = useState('');
  const [creating, setCreating] = useState(false);
  const [newSite, setNewSite] = useState<Website | null>(null);
  const [scriptContent, setScriptContent] = useState('');
  const [scriptLoading, setScriptLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => { loadWebsites(); }, []);

  async function loadWebsites() {
    try {
      const res = await api.getWebsites();
      setWebsites(res.websites);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate() {
    if (!newDomain.trim()) return;
    setCreating(true);
    try {
      const res = await api.createWebsite(newDomain.trim());
      const site = res.website as unknown as Website;
      setNewSite(site);
      setWizardStep(1);
      await loadWebsites();
      // Fetch the latest script from the server
      setScriptLoading(true);
      const scriptRes = await api.getWebsiteScript(site.id);
      setScriptContent(scriptRes.script);
      setScriptLoading(false);
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4">{[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Websites</h1>
          <p className="text-muted-foreground">Manage your connected websites and tracking scripts.</p>
        </div>
        <Button onClick={() => { setShowWizard(true); setWizardStep(0); setNewSite(null); }}>
          <Plus className="w-4 h-4 mr-2" />
          Add Website
        </Button>
      </div>

      {websites.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Globe className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No websites yet</h3>
            <p className="text-sm text-muted-foreground mb-6 text-center max-w-md">
              Connect your first website to start tracking events and collecting customer data.
            </p>
            <Button onClick={() => { setShowWizard(true); setWizardStep(0); }}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Website
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {websites.map((site) => (
            <Link key={site.id} href={`/dashboard/websites/${site.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{site.domain}</h3>
                          <Badge variant={site.status === 'active' ? 'success' : 'secondary'} className="h-5 text-[10px]">
                            {site.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>{site.event_count?.toLocaleString() || 0} total events</span>
                          <span>{site.events_24h || 0} last 24h</span>
                          <span>{site.visitor_count || 0} visitors</span>
                          <span>Added {formatDate(site.created_at, 'short')}</span>
                        </div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Add Website Wizard */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-background rounded-2xl border shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Connect Website</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowWizard(false)}>
                  <span className="text-xl">&times;</span>
                </Button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {wizardStep === 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold">Enter Website Domain</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter the domain of the website you want to track. We&apos;ll generate a tracking script you can add to your site.
                  </p>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Domain</label>
                    <input
                      type="text"
                      value={newDomain}
                      onChange={(e) => setNewDomain(e.target.value)}
                      placeholder="example.com"
                      className="flex h-10 w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                    />
                  </div>

                  {/* Data Collection Info */}
                  <div className="p-4 rounded-xl bg-muted/50 border">
                    <h4 className="text-sm font-semibold mb-3">What we collect</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {DATA_COLLECTED.map((item) => (
                        <div key={item.label} className="flex items-start gap-2 p-2 rounded-lg bg-background/50">
                          <item.icon className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                          <div>
                            <div className="text-xs font-medium">{item.label}</div>
                            <div className="text-[10px] text-muted-foreground">{item.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setShowWizard(false)}>Cancel</Button>
                    <Button onClick={handleCreate} disabled={!newDomain.trim() || creating}>
                      {creating ? 'Creating...' : 'Create & Generate Script'}
                    </Button>
                  </div>
                </div>
              )}

              {wizardStep === 1 && newSite && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-success/10 text-success text-sm">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Website <strong>{newSite.domain}</strong> created successfully!</span>
                  </div>

                  <h3 className="font-semibold">Install Tracking Script</h3>
                  <p className="text-sm text-muted-foreground">
                    Add this script to the <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{'<head>'}</code> of your website to start collecting data.
                  </p>

                  <div className="relative">
                    <pre className="p-4 rounded-xl bg-[#0a0a0a] text-green-400 text-xs font-mono overflow-x-auto leading-relaxed max-h-64 overflow-y-auto">
                      <code>{scriptLoading ? 'Loading script...' : scriptContent}</code>
                    </pre>
                    <div className="absolute top-3 right-3 flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-white/60 hover:text-white" onClick={() => handleCopy(scriptContent, 'script')}>
                        {copiedId === 'script' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-xl bg-warning/10 text-warning text-sm">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium">Important</p>
                      <p className="text-xs mt-1">The endpoint URL is set to your collector server. In production, change this to your actual server URL.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-muted/50 border">
                    <h4 className="text-sm font-semibold mb-2">What happens next?</h4>
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> The tracker will automatically collect page views, clicks, scrolls, and form submissions
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> Ad click IDs (GCLID, FB click ID, etc.) and UTM parameters are captured from the URL
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> Device info, performance metrics, and session data are collected automatically
                      </li>
                      <li className="flex items-start gap-2">
                        <ChevronRight className="w-3 h-3 mt-0.5 shrink-0" /> View all collected data in your website dashboard
                      </li>
                    </ul>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <Button variant="outline" onClick={() => setWizardStep(0)}>Back</Button>
                    <Button onClick={() => setShowWizard(false)}>Done</Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
