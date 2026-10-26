import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from './api';

export interface WebsiteOption {
  id: string;
  name: string | null;
  domain: string;
}

interface WebsiteFilterValue {
  websites: WebsiteOption[];
  // '' means all websites.
  selectedWebsiteId: string;
  selectedWebsite: WebsiteOption | null;
  setSelectedWebsiteId: (id: string) => void;
  refreshWebsites: () => Promise<void>;
}

const STORAGE_KEY = 'selected_website_id';
const WebsiteFilterContext = createContext<WebsiteFilterValue | null>(null);

function readStoredId(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || '';
  } catch {
    return '';
  }
}

export const WebsiteFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [websites, setWebsites] = useState<WebsiteOption[]>([]);
  const [selectedWebsiteId, setSelectedId] = useState(readStoredId);

  const setSelectedWebsiteId = useCallback((id: string) => {
    setSelectedId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY, id);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage unavailable: the selection still applies for this session.
    }
  }, []);

  const refreshWebsites = useCallback(async () => {
    const response = await api.getWebsites() as { websites?: WebsiteOption[] };
    const list = Array.isArray(response.websites) ? response.websites : [];
    setWebsites(list);
    setSelectedId((current) => {
      if (current && !list.some((website) => website.id === current)) {
        try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
        return '';
      }
      return current;
    });
  }, []);

  const value = useMemo(() => ({
    websites,
    selectedWebsiteId,
    selectedWebsite: websites.find((website) => website.id === selectedWebsiteId) || null,
    setSelectedWebsiteId,
    refreshWebsites,
  }), [websites, selectedWebsiteId, setSelectedWebsiteId, refreshWebsites]);

  return <WebsiteFilterContext.Provider value={value}>{children}</WebsiteFilterContext.Provider>;
};

export function useWebsiteFilter(): WebsiteFilterValue {
  const value = useContext(WebsiteFilterContext);
  if (!value) throw new Error('useWebsiteFilter must be used inside WebsiteFilterProvider');
  return value;
}
