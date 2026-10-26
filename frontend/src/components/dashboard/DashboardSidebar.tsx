import React, { useEffect, useState } from 'react';
import { ClickOwlLogo, ClickOwlMark } from '../ClickOwlLogo';
import { BarChart3, Link2, Settings } from 'lucide-react';

export type DashboardPage = 'dashboard' | 'sites' | 'crm-connection' | 'analytics' | 'funnels' | 'retention' | 'destinations' | 'settings' | 'team-members' | 'api-keys';

interface DashboardSidebarProps {
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

interface NavItem {
  id: DashboardPage;
  label: string;
  icon: React.ReactNode;
}

const mainNavItems: NavItem[] = [
  { id: 'analytics', label: 'Event Overview', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'funnels', label: 'Funnels', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'retention', label: 'Retention', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'sites', label: 'Connection Site', icon: <Link2 className="w-4 h-4" /> },
  { id: 'destinations', label: 'Destinations', icon: <Link2 className="w-4 h-4" /> },
  { id: 'crm-connection', label: 'CRM Connection', icon: <Link2 className="w-4 h-4" /> },
];

const bottomNavItems: NavItem[] = [
  { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
];

interface NavButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  expanded: boolean;
  onClick: () => void;
}

const NavButton: React.FC<NavButtonProps> = ({ label, icon, isActive, expanded, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title={expanded ? undefined : label}
    aria-label={label}
    aria-current={isActive ? 'page' : undefined}
    className={`w-full flex items-center rounded-lg text-[13px] font-semibold py-2.5 transition-all duration-150 ${
      expanded ? 'justify-start gap-3 px-3' : 'justify-center gap-0 px-0'
    } ${
      isActive
        ? 'bg-ink text-white shadow-md'
        : 'text-muted hover:text-ink hover:bg-bg'
    }`}
  >
    <span className={`shrink-0 flex items-center justify-center w-5 h-5 transition-colors duration-150 ${isActive ? 'text-white' : 'text-muted'}`}>
      {icon}
    </span>
    <span className={`whitespace-nowrap overflow-hidden transition-all duration-150 ${
      expanded ? 'opacity-100 w-auto flex-1 text-left' : 'opacity-0 w-0 flex-none'
    }`}>
      {label}
    </span>
  </button>
);

interface SidebarInnerProps {
  expanded: boolean;
  activePage: DashboardPage;
  onNavigate: (page: DashboardPage) => void;
}

const SidebarInner: React.FC<SidebarInnerProps> = ({ expanded, activePage, onNavigate }) => {
  const isActive = (id: DashboardPage) => {
    if (id === 'analytics' && activePage === 'analytics') return true;
    if (id === 'sites' && (activePage === 'sites' || activePage === 'crm-connection')) return true;
    if (id === 'settings' && (activePage === 'settings' || activePage === 'team-members' || activePage === 'api-keys')) return true;
    return activePage === id;
  };

  return (
    <>
      <nav className="flex-1 flex flex-col min-h-0 px-3 py-4">
        <div className="space-y-1 overflow-y-auto">
          {mainNavItems.map((item, index) => (
            <NavButton
              key={`${item.id}-${index}`}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.id)}
              expanded={expanded}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </div>

        <div className="mt-auto pt-4 border-t border-border space-y-1">
          {bottomNavItems.map((item, index) => (
            <NavButton
              key={`${item.id}-${index}`}
              label={item.label}
              icon={item.icon}
              isActive={isActive(item.id)}
              expanded={expanded}
              onClick={() => onNavigate(item.id)}
            />
          ))}
        </div>
      </nav>
    </>
  );
};

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activePage,
  onNavigate,
  mobileOpen,
  onCloseMobile,
}) => {
  const [hovered, setHovered] = useState(false);
  const expanded = hovered;

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseMobile();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen, onCloseMobile]);

  return (
    <>
      {/* Desktop hover-expandable rail */}
      <div className="relative hidden md:block w-[68px] shrink-0">
        <aside
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          aria-label="Primary navigation"
          className={`absolute inset-y-0 left-0 z-30 flex flex-col bg-surface border-r border-border overflow-hidden transition-all duration-[220ms] ease-out ${
            expanded ? 'w-[230px] shadow-xl' : 'w-[68px]'
          }`}
        >
          <SidebarInner expanded={expanded} activePage={activePage} onNavigate={onNavigate} />
        </aside>
      </div>

      {/* Mobile off-canvas drawer */}
      <div
        className={`fixed inset-0 z-50 md:hidden transition-opacity duration-200 ${
          mobileOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!mobileOpen}
        {...(!mobileOpen ? { inert: true } : {})}
      >
        <div
          className="absolute top-16 inset-x-0 bottom-0 bg-ink/30"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
        <aside
          aria-label="Primary navigation"
          className={`absolute top-16 bottom-0 left-0 w-[230px] max-w-[85vw] bg-surface border-r border-border flex flex-col overflow-hidden shadow-xl transition-transform duration-[220ms] ease-out ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <SidebarInner expanded activePage={activePage} onNavigate={onNavigate} />
        </aside>
      </div>
    </>
  );
};