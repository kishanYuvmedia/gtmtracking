const API_URL = process.env.NEXT_PUBLIC_API_URL!;

type ApiResponse<T> = T & { error?: string };

async function request<T = Record<string, unknown>>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    return { ...data, error: data.error || 'Request failed' };
  }

  return data;
}

export const api = {
  // ── Auth ──
  register(name: string, email: string, password: string) {
    return request<{ user: { id: string; name: string; email: string }; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password }),
    });
  },

  login(email: string, password: string) {
    return request<{ user: { id: string; name: string; email: string }; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  getProfile() {
    return request<{ user: { id: string; name: string; email: string } }>('/auth/profile');
  },

  // ── Websites ──
  getWebsites() {
    return request<{ websites: Array<{ id: string; domain: string; api_key: string; pixel_id: string; name: string; status: string; event_count: number; events_24h: number; visitor_count: number; created_at: string }> }>('/websites');
  },

  createWebsite(domain: string) {
    return request<{ website: { id: string; domain: string; api_key: string } }>('/websites', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  },

  getWebsite(id: string) {
    return request<{ website: Record<string, unknown>; adSummary: Record<string, unknown>; eventNames: Array<Record<string, unknown>> }>(`/websites/${id}`);
  },

  getWebsiteScript(id: string) {
    return request<{ script: string; website: { id: string; domain: string; api_key: string } }>(`/websites/${id}/script`);
  },

  getWebsiteEventReport(id: string, filters: {
    date_from?: string;
    date_to?: string;
    period?: string;
    event_name?: string;
    visitor_id?: string;
    limit?: number;
    offset?: number;
  } = {}) {
    const params = new URLSearchParams();
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    if (filters.period) params.set('period', filters.period);
    if (filters.event_name) params.set('event_name', filters.event_name);
    if (filters.visitor_id) params.set('visitor_id', filters.visitor_id);
    if (filters.limit) params.set('limit', String(filters.limit));
    if (filters.offset) params.set('offset', String(filters.offset));
    const qs = params.toString();
    return request<{
      summary: {
        total_events: number;
        total_visitors: number;
        total_sessions: number;
        event_types: Array<{ name: string; count: number }>;
      };
      timeline: Array<{ date: string; count: number }>;
      visitors: {
        browsers: Array<{ name: string; count: number }>;
        os: Array<{ name: string; count: number }>;
        device_types: Array<{ name: string; count: number }>;
      };
      events: Array<{
        id: string;
        event_name: string;
        event_id: string;
        session_id: string;
        visitor_id: string;
        properties: Record<string, unknown>;
        device_info: Record<string, unknown> | null;
        page_info: Record<string, unknown> | null;
        location_info: Record<string, unknown> | null;
        created_at: string;
      }>;
    }>(`/websites/${id}/event-report${qs ? `?${qs}` : ''}`);
  },
};
