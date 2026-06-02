const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

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

  getWebsites() {
    return request<{ websites: Array<{ id: string; domain: string; api_key: string; pixel_id: string; event_count: number; created_at: string }> }>('/websites');
  },

  createWebsite(domain: string) {
    return request<{ website: { id: string; domain: string; api_key: string } }>('/websites', {
      method: 'POST',
      body: JSON.stringify({ domain }),
    });
  },

  getWebsiteScript(id: string) {
    return request<{ script: string; website: { id: string; domain: string; api_key: string } }>(`/websites/${id}/script`);
  },

  getEvents(limit = 50, offset = 0) {
    return request<{ events: Array<{
      id: string;
      event_name: string;
      event_id: string;
      session_id: string;
      visitor_id: string;
      website_domain: string;
      properties: Record<string, unknown>;
      device_info: Record<string, unknown> | null;
      page_info: Record<string, unknown> | null;
      performance_info: Record<string, unknown> | null;
      network_info: Record<string, unknown> | null;
      location_info: Record<string, unknown> | null;
      payload: Record<string, unknown> | null;
      created_at: string;
    }> }>(`/events?limit=${limit}&offset=${offset}`);
  },

  getEventStats() {
    return request<{ stats: { total_events: number; total_sessions: number; total_visitors: number; total_websites: number } }>('/events/stats');
  },
};
