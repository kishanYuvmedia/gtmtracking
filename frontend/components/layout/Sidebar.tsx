'use client';

import {
  LayoutDashboard, Globe,
  LogOut, ChevronLeft, Menu,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { href: '/dashboard/websites', label: 'Websites', icon: Globe },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-xl bg-background border shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        <Menu className="w-5 h-5" />
      </button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex flex-col border-r bg-sidebar transition-all duration-300',
          collapsed ? 'w-16' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        <div className={cn('flex items-center h-16 px-4 border-b border-sidebar-border', collapsed && 'justify-center')}>
          {collapsed ? (
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-sm">C</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <div>
                <h1 className="text-base font-bold">CustomerLab</h1>
                <p className="text-xs text-sidebar-muted">Data Platform</p>
              </div>
            </div>
          )}
        </div>

        <ScrollArea className="flex-1 px-2 py-4">
          <nav className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                    collapsed && 'justify-center px-2',
                    active
                      ? 'bg-sidebar-accent text-foreground'
                      : 'text-sidebar-muted hover:text-foreground hover:bg-sidebar-accent'
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {!collapsed && <span className="flex-1">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>

        <Separator className="mx-2 w-auto" />

        <div className={cn('p-2', collapsed && 'flex flex-col items-center')}>
          <button
            onClick={() => {
              localStorage.removeItem('token');
              window.location.href = '/login';
            }}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-sidebar-muted hover:text-foreground hover:bg-sidebar-accent transition-all w-full',
              collapsed && 'justify-center'
            )}
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 rounded-full border bg-background items-center justify-center shadow-sm hover:bg-accent transition"
        >
          <ChevronLeft className={cn('w-3 h-3 transition', collapsed && 'rotate-180')} />
        </button>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}
    </>
  );
}
