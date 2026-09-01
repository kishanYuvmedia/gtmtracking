'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { api } from '@/lib/api';

interface Website {
  id: string;
  domain: string;
  name: string;
  api_key: string;
  status: string;
  event_count: number;
  events_24h: number;
  visitor_count: number;
  created_at: string;
}

interface WebsiteContextType {
  websites: Website[];
  selectedId: string | null;
  selectedWebsite: Website | null;
  loading: boolean;
  setSelectedId: (id: string | null) => void;
  refresh: () => Promise<void>;
}

const WebsiteContext = createContext<WebsiteContextType>({
  websites: [],
  selectedId: null,
  selectedWebsite: null,
  loading: true,
  setSelectedId: () => {},
  refresh: async () => {},
});

export function WebsiteProvider({ children }: { children: ReactNode }) {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.getWebsites();
      setWebsites(res.websites);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedWebsite = websites.find(w => w.id === selectedId) || null;

  return (
    <WebsiteContext.Provider value={{ websites, selectedId, selectedWebsite, loading, setSelectedId, refresh }}>
      {children}
    </WebsiteContext.Provider>
  );
}

export function useWebsite() {
  const ctx = useContext(WebsiteContext);
  if (!ctx) throw new Error('useWebsite must be used within WebsiteProvider');
  return ctx;
}
