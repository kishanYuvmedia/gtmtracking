'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Globe, Activity, Users, ArrowUpRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';
import { useWebsite } from '@/lib/contexts/website';

export default function DashboardOverview() {
  const { selectedId, websites } = useWebsite();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, [selectedId]);

  const metrics = [
    { label: 'Websites', value: websites.length, icon: Globe },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {selectedId ? 'Showing data for the selected website.' : 'Welcome back! Here&apos;s what&apos;s happening across all your websites.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                {loading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <p className="text-2xl font-bold">{metric.value.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground mt-1">{metric.label}</p>
                  </>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Websites</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">{[1,2,3].map(i => <Skeleton key={i} className="h-16" />)}</div>
            ) : websites.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No websites yet. Add your first website to get started.
              </div>
            ) : (
              <div className="space-y-3">
                {websites.slice(0, 5).map((site) => (
                  <div key={site.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Globe className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{site.domain}</p>
                        <p className="text-xs text-muted-foreground">Created {formatDate(site.created_at, 'short')}</p>
                      </div>
                    </div>
                    <Badge variant={site.status === 'active' ? 'success' : 'secondary'}>
                      {site.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/dashboard/websites"
              className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Manage Websites</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
