import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, User, LogOut, Bell, Menu, Globe, Check } from 'lucide-react';
import { ClickOwlLogo, ClickOwlMark } from '../ClickOwlLogo';
import { api } from '../../lib/api';
import { useWebsiteFilter } from '../../lib/websiteFilter';

interface DashboardTopBarProps {
  onProfile?: () => void;
  onLogout?: () => void;
  onMenuToggle?: () => void;
}

export const DashboardTopBar: React.FC<DashboardTopBarProps> = ({ onProfile, onLogout, onMenuToggle }) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [showWebsites, setShowWebsites] = useState(false);
  const websiteRef = useRef<HTMLDivElement>(null);
  const { websites, selectedWebsite, selectedWebsiteId, setSelectedWebsiteId, refreshWebsites } = useWebsiteFilter();

  useEffect(() => {
    refreshWebsites().catch(() => {});
  }, [refreshWebsites]);

  useEffect(() => {
    api.getProfile().then((res: any) => {
      if (res.user) {
        setName(res.user.name || '');
        setEmail(res.user.email || '');
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (websiteRef.current && !websiteRef.current.contains(e.target as Node)) {
        setShowWebsites(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 bg-surface border-b border-border px-4 sm:px-6 flex items-center gap-4 shrink-0">
      {/* Left: brand / mobile menu */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onMenuToggle}
          aria-label="Open navigation menu"
          className="md:hidden w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center hover:bg-bg transition-colors"
        >
          <Menu className="w-4 h-4 text-ink" />
        </button>
        <ClickOwlMark className="md:hidden" />
        <div className="hidden md:flex items-center">
          <ClickOwlLogo variant="horizontal" size="sm" />
        </div>
      </div>

      {/* Center: flexible empty space */}
      <div className="flex-1 min-w-0" />

      {/* Right: notifications + profile */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0">
        <div className="relative" ref={websiteRef}>
          <button
            type="button"
            onClick={() => setShowWebsites(!showWebsites)}
            aria-haspopup="listbox"
            aria-expanded={showWebsites}
            title="Filter by website"
            className="flex items-center gap-2 h-8 px-2.5 rounded-lg bg-bg border border-border text-[12px] text-ink hover:border-ink/20 transition-colors max-w-[220px]"
          >
            <Globe className="w-4 h-4 text-muted shrink-0" />
            <span className="truncate hidden sm:inline">{selectedWebsite ? selectedWebsite.name || selectedWebsite.domain : 'All websites'}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted shrink-0" />
          </button>

          {showWebsites && (
            <div role="listbox" className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-50 py-1.5 min-w-[240px] max-h-[320px] overflow-y-auto">
              {[{ id: '', label: 'All websites', domain: '' }, ...websites.map((website) => ({ id: website.id, label: website.name || website.domain, domain: website.domain }))].map((option) => (
                <button
                  key={option.id || 'all'}
                  role="option"
                  aria-selected={selectedWebsiteId === option.id}
                  onClick={() => { setSelectedWebsiteId(option.id); setShowWebsites(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-bg transition-colors"
                >
                  <span className="w-4 shrink-0">{selectedWebsiteId === option.id && <Check className="w-4 h-4 text-ink" />}</span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-ink truncate">{option.label}</span>
                    {option.domain && option.domain !== option.label && <span className="block text-[11px] text-muted truncate">{option.domain}</span>}
                  </span>
                </button>
              ))}
              {websites.length === 0 && <p className="px-4 py-2 text-[12px] text-muted">No websites added yet.</p>}
            </div>
          )}
        </div>

        <button
          type="button"
          title="Notifications"
          aria-label="Notifications"
          className="relative w-8 h-8 rounded-lg bg-bg border border-border flex items-center justify-center hover:bg-bg transition-colors"
        >
          <Bell className="w-4 h-4 text-muted" />
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-danger border-[1.5px] border-surface" />
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-bg transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-ink flex items-center justify-center shadow-sm">
              <span className="text-white text-[11px] font-bold">{name ? name.split(' ').map((n:string) => n[0]).join('').toUpperCase().slice(0,2) : 'U'}</span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-[13px] font-semibold text-ink leading-tight">{name || 'User'}</p>
              <p className="text-[11px] text-muted">{email}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-muted" />
          </button>

          {showDropdown && (
            <div className="absolute top-full right-0 mt-2 bg-surface border border-border rounded-xl shadow-xl z-50 py-1.5 min-w-[180px]">
              <div className="px-4 py-3 border-b border-border">
                <p className="text-[13px] font-semibold text-ink">{name || 'User'}</p>
                <p className="text-[11px] text-muted mt-0.5">{email}</p>
              </div>
              <button
                onClick={() => { setShowDropdown(false); onProfile?.(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-ink hover:bg-bg transition-colors"
              >
                <User className="w-4 h-4 text-muted" />
                Profile
              </button>
              <button
                onClick={() => { setShowDropdown(false); onLogout?.(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-danger hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};