/**
 * Fetch wrapper: base URL from VITE_API_URL, credentials: 'include' for cookie auth.
 */
const BASE = import.meta.env.VITE_API_URL || '';

export async function api(path, options = {}) {
  const url = path.startsWith('http') ? path : `${BASE.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = new Error(res.statusText || 'Request failed');
    err.status = res.status;
    const text = await res.text();
    try {
      err.body = text ? JSON.parse(text) : text;
    } catch {
      err.body = text;
    }
    throw err;
  }
  if (res.status === 204) return null;
  return res.json();
}

export const auth = {
  login: (email, password) => api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => api('/api/auth/logout', { method: 'POST' }),
  me: () => api('/api/auth/me'),
  register: (email, password, role = 'admin') =>
    api('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password, role }) }),
};

export const merchants = {
  list: () => api('/api/merchants'),
  create: (data) => api('/api/merchants', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/api/merchants/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => api(`/api/merchants/${id}`, { method: 'DELETE' }),
};

export const campaigns = {
  list: (params) => {
    const q = new URLSearchParams(params).toString();
    return api(`/api/campaigns${q ? `?${q}` : ''}`);
  },
  get: (id) => api(`/api/campaigns/${id}`),
  create: (data) => api('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/api/campaigns/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => api(`/api/campaigns/${id}`, { method: 'DELETE' }),
  publish: (id) => api(`/api/campaigns/${id}/publish`, { method: 'POST' }),
  duplicate: (id, name) => api(`/api/campaigns/${id}/duplicate`, { method: 'POST', body: JSON.stringify({ name }) }),
};

export const analytics = {
  overview: () => api('/api/analytics/overview'),
  timeseries: (params) => api(`/api/analytics/timeseries?${new URLSearchParams(params)}`),
  byMerchant: () => api('/api/analytics/bymerchant'),
  topCampaigns: (limit = 10) => api(`/api/analytics/topcampaigns?limit=${limit}`),
};

export const rakuten = {
  connect: (data) => api('/api/rakuten/connect', { method: 'POST', body: JSON.stringify(data) }),
  advertisers: () => api('/api/rakuten/advertisers'),
  transactions: (params) => api(`/api/rakuten/transactions?${new URLSearchParams(params)}`),
  sync: () => api('/api/rakuten/sync', { method: 'POST' }),
  credentials: () => api('/api/rakuten/credentials'),
};

/** Single object for api.auth.me(), api.merchants.list(), etc. */
export default { api, auth, merchants, campaigns, analytics, rakuten };
