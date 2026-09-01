'use client';

import { Globe, Bell, Search, ChevronDown, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePathname } from 'next/navigation';
import { useWebsite } from '@/lib/contexts/website';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

function getPageTitle(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length <= 1) return 'Overview';
  const page = segments[1];
  return page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g, ' ');
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function Header() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { websites, selectedId, selectedWebsite, setSelectedId, loading } = useWebsite();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    api.getProfile().then(res => {
      if (res.user) setUser(res.user);
    }).catch(() => {});
  }, []);

  return (
    <header className="sticky top-0 z-30 h-16 border-b bg-background/80 backdrop-blur-xl">
      <div className="flex items-center justify-between h-full px-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold">{title}</h1>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            Live
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Website Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2 h-9 px-3 min-w-[160px]">
                <Globe className="w-4 h-4 shrink-0 text-muted-foreground" />
                <span className="text-sm truncate flex-1 text-left">
                  {loading ? (
                    <Skeleton className="h-4 w-20 inline-block" />
                  ) : selectedWebsite ? (
                    selectedWebsite.domain
                  ) : (
                    'All Websites'
                  )}
                </span>
                <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Filter by Website</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSelectedId(null)} className="flex items-center gap-3">
                <div className="w-5 flex justify-center">
                  {!selectedId && <Check className="w-4 h-4 text-primary" />}
                </div>
                <div>
                  <p className="text-sm font-medium">All Websites</p>
                  <p className="text-xs text-muted-foreground">Show data from all sites</p>
                </div>
              </DropdownMenuItem>
              {websites.map((site) => (
                <DropdownMenuItem key={site.id} onClick={() => setSelectedId(site.id)} className="flex items-center gap-3">
                  <div className="w-5 flex justify-center">
                    {selectedId === site.id && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{site.domain}</p>
                    <p className="text-xs text-muted-foreground">{site.event_count.toLocaleString()} events</p>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <button className="hidden sm:flex items-center gap-2 h-9 px-3 rounded-xl border bg-background text-sm text-muted-foreground hover:text-foreground transition-colors w-64">
            <Search className="w-4 h-4 shrink-0" />
            <span>Search anything...</span>
            <kbd className="ml-auto hidden md:inline-flex items-center gap-1 px-1.5 py-0.5 rounded border bg-muted text-[10px] font-mono text-muted-foreground">
              ⌘K
            </kbd>
          </button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="py-8 text-center text-sm text-muted-foreground">No new notifications</div>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                <Avatar className="w-7 h-7">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary">
                    {user ? getInitials(user.name) : '...'}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-none">{user?.name || 'Loading...'}</span>
                  <span className="text-xs text-muted-foreground">{user?.email || ''}</span>
                </div>
                <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile</DropdownMenuItem>
              <DropdownMenuItem>Workspace Settings</DropdownMenuItem>
              <DropdownMenuItem>API Keys</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => {
                localStorage.removeItem('token');
                window.location.href = '/login';
              }}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
