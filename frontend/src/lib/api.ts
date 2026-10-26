const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:4000/api';

export async function request(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  register: (name: string, email: string, password: string, business_type?: string, category?: string) =>
    request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password, business_type, category }) }),
  login: (email: string, password: string) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  verifyOtp: (email: string, code: string) =>
    request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, code }) }),
  resendOtp: (email: string) =>
    request('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email }) }),
  forgotPassword: (email: string) =>
    request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (token: string, password: string) =>
    request('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, password }) }),
  updateProfile: (data: { name?: string; business_type?: string; category?: string }) =>
    request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  getProfile: () => request('/auth/profile'),
  getWebsites: () => request('/websites'),
  createWebsite: (domain: string) =>
    request('/websites', { method: 'POST', body: JSON.stringify({ domain }) }),
  createWebsites: (domains: string[], name: string, website_type: string, country: string, currency: string) =>
    request('/websites', { method: 'POST', body: JSON.stringify({ domains, name, website_type, country, currency }) }),
  getCountries: () => request('/websites/countries'),
  disconnectWebsite: (id: string) => request(`/websites/${encodeURIComponent(id)}/disconnect`, { method: 'POST' }),
  getWebsite: (id: string) => request(`/websites/${encodeURIComponent(id)}`),
  updateWebsite: (id: string, data: { name?: string; website_type?: string; country?: string; currency?: string }) =>
    request(`/websites/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(data) }),
  getWebsiteScript: (id: string) => request(`/websites/${encodeURIComponent(id)}/script`),
  getEvents: (websiteId?: string, limit = 200, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (websiteId) params.set('website_id', websiteId);
    return request(`/events?${params}`);
  },
  getEventOverview: (params: { websiteId?: string; eventName?: string; from: Date; to: Date; interval: 'day' | 'week' | 'month' }) => {
    const query = new URLSearchParams({ from: params.from.toISOString(), to: params.to.toISOString(), interval: params.interval });
    if (params.websiteId) query.set('website_id', params.websiteId);
    if (params.eventName) query.set('event_name', params.eventName);
    return request(`/events/overview?${query}`);
  },
  getIdentitySettings: () => request('/workspace/identity-settings'),
  updateIdentitySettings: (settings: { email_keys: string[]; phone_keys: string[]; user_id_keys: string[]; default_country: string }) =>
    request('/workspace/identity-settings', { method: 'PUT', body: JSON.stringify(settings) }),
  getEcommerceStatus: (websiteId: string) => request(`/websites/${encodeURIComponent(websiteId)}/ecommerce-status`),
  getWebsiteEventReport: (id: string) => request(`/websites/${id}/event-report`),
  searchVisitors: (websiteId?: string, q?: string) =>
    request(`/journey/visitors?${new URLSearchParams({ ...(websiteId ? { website_id: websiteId } : {}), ...(q ? { q } : {}) })}`),
};
