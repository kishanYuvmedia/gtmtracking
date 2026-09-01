'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe, Copy, Check, ArrowLeft, RefreshCw, Code,
  Eye, Activity, Users, Hash, TrendingUp, BarChart3,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface WebsiteDetail {
  id: string;
  domain: string;
  api_key: string;
  name: string;
  status: string;
  event_count: number;
  events_24h: number;
  visitor_count: number;
  session_count: number;
  created_at: string;
}

interface AdSummary {
  total_events: number;
  page_views: number;
  unique_visitors: number;
  sessions: number;
  utm_tracked: number;
  gclid_hits: number;
  fbclid_hits: number;
  msclkid_hits: number;
  ttclid_hits: number;
}

export default function WebsiteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [website, setWebsite] = useState<WebsiteDetail | null>(null);
  const [adSummary, setAdSummary] = useState<AdSummary | null>(null);
  const [eventNames, setEventNames] = useState<Array<{ event_name: string; count: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [scriptContent, setScriptContent] = useState('');
  const [showScript, setShowScript] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) loadWebsite();
  }, [params.id]);

  async function loadWebsite() {
    try {
      const [detailRes, scriptRes] = await Promise.all([
        api.getWebsite(params.id as string),
        api.getWebsiteScript(params.id as string),
      ]);
      setWebsite(detailRes.website as unknown as WebsiteDetail);
      setAdSummary(detailRes.adSummary as unknown as AdSummary);
      setEventNames(detailRes.eventNames as Array<{ event_name: string; count: number }>);
      setScriptContent(scriptRes.script);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  if (loading) return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-24" />)}</div>
      <Skeleton className="h-64" />
    </div>
  );

  if (!website) return (
    <div className="text-center py-16">
      <h2 className="text-xl font-bold mb-2">Website not found</h2>
      <Button onClick={() => router.push('/dashboard/websites')}>Back to Websites</Button>
    </div>
  );

  const hasAdData = adSummary && (adSummary.utm_tracked > 0 || adSummary.gclid_hits > 0 || adSummary.fbclid_hits > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard/websites')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{website.domain}</h1>
              <Badge variant={website.status === 'active' ? 'success' : 'secondary'}>{website.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Created {formatDate(website.created_at, 'short')} &middot; ID: {website.id.slice(0, 8)}...
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadWebsite}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowScript(!showScript)}>
            <Code className="w-4 h-4 mr-2" />
            {showScript ? 'Hide Script' : 'Get Script'}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link href={`/dashboard/websites/${params.id}/events`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-2 hover:border-primary/50">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Eye className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold">{website.event_count?.toLocaleString() || 0}</div>
                <div className="text-xs text-muted-foreground">Total Events</div>
                <div className="text-[10px] text-primary mt-0.5">Click to view report</div>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{website.events_24h || 0}</div>
              <div className="text-xs text-muted-foreground">Last 24 Hours</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{website.visitor_count || 0}</div>
              <div className="text-xs text-muted-foreground">Unique Visitors</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
              <Hash className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{website.session_count || 0}</div>
              <div className="text-xs text-muted-foreground">Sessions</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Script Section */}
      {showScript && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Code className="w-4 h-4" />
              Tracking Script
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              Add this script to the <code className="px-1 py-0.5 rounded bg-muted text-xs font-mono">{'<head>'}</code> of your website.
            </p>
            <div className="relative">
              <pre className="p-4 rounded-xl bg-[#0a0a0a] text-green-400 text-xs font-mono overflow-x-auto leading-relaxed max-h-48 overflow-y-auto">
                <code>{scriptContent}</code>
              </pre>
              <div className="absolute top-3 right-3">
                <Button variant="ghost" size="sm" className="h-7 text-white/60 hover:text-white" onClick={() => handleCopy(scriptContent, 'script')}>
                  {copiedId === 'script' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ad & Attribution Data */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Ad Campaign & Attribution Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAdData ? (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No ad attribution data yet.</p>
                <p className="text-xs mt-1">Data appears when visitors arrive via ad campaigns or UTM links.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-bold">{adSummary?.utm_tracked || 0}</div>
                    <div className="text-xs text-muted-foreground">UTM Tracked Events</div>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/50">
                    <div className="text-lg font-bold">{adSummary?.sessions || 0}</div>
                    <div className="text-xs text-muted-foreground">Ad-influenced Sessions</div>
                  </div>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Click ID Matches</h4>
                  <div className="space-y-1.5">
                    {adSummary && adSummary.gclid_hits > 0 && (
                      <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-blue-500/5">
                        <span className="text-sm">Google (GCLID)</span>
                        <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">{adSummary.gclid_hits}</Badge>
                      </div>
                    )}
                    {adSummary && adSummary.fbclid_hits > 0 && (
                      <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-blue-600/5">
                        <span className="text-sm">Facebook (FBCLID)</span>
                        <Badge variant="outline" className="bg-blue-600/10 text-blue-600 border-blue-200">{adSummary.fbclid_hits}</Badge>
                      </div>
                    )}
                    {adSummary && adSummary.msclkid_hits > 0 && (
                      <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-green-500/5">
                        <span className="text-sm">Microsoft (MSCLKID)</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-200">{adSummary.msclkid_hits}</Badge>
                      </div>
                    )}
                    {adSummary && adSummary.ttclid_hits > 0 && (
                      <div className="flex justify-between items-center py-1.5 px-3 rounded-lg bg-purple-500/5">
                        <span className="text-sm">TikTok (TTCLID)</span>
                        <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-200">{adSummary.ttclid_hits}</Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Event Types
            </CardTitle>
          </CardHeader>
          <CardContent>
            {eventNames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No events recorded yet.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {eventNames.slice(0, 10).map((evt) => (
                  <div key={evt.event_name} className="flex items-center justify-between py-1.5">
                    <span className="text-sm">{evt.event_name}</span>
                    <Badge variant="secondary" className="text-xs">{evt.count}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
