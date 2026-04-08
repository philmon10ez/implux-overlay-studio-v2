/**
 * Fetch wrapper: base URL from VITE_API_URL, credentials: 'include' for cookie auth.
 * Production fallback so admin.implux.io works even if VITE_API_URL is not set in Vercel.
 */
const BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? 'https://api.implux.io' : '');

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
  login: (username, password) =>
    api('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
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

export const products = {
  list: (merchantId) => api(`/api/products?merchantId=${encodeURIComponent(merchantId)}`),
  /** @param {number|string} id @param {number|string} [merchantId] — when set, server enforces tenant scope */
  get: (id, merchantId) =>
    api(
      `/api/products/${id}${
        merchantId != null && merchantId !== '' ? `?merchantId=${encodeURIComponent(merchantId)}` : ''
      }`
    ),
  create: (data) => api('/api/products', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => api(`/api/products/${id}`, { method: 'DELETE' }),
};

export const recommendationSets = {
  list: (merchantId) => api(`/api/recommendation-sets?merchantId=${encodeURIComponent(merchantId)}`),
  /** Catalog summaries for external builders / SaaS (auth). */
  presetsCatalog: () => api('/api/recommendation-sets/presets/catalog'),
  /** @param {number|string} id @param {number|string} [merchantId] — when set, server enforces tenant scope */
  get: (id, merchantId) =>
    api(
      `/api/recommendation-sets/${id}${
        merchantId != null && merchantId !== '' ? `?merchantId=${encodeURIComponent(merchantId)}` : ''
      }`
    ),
  create: (data) => api('/api/recommendation-sets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => api(`/api/recommendation-sets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => api(`/api/recommendation-sets/${id}`, { method: 'DELETE' }),
};

/** Targeting preview (auth) — matches /proxy/recommendations resolution with optional debug. */
export const recommendations = {
  resolvePreview: (body) =>
    api('/api/recommendations/resolve-preview', { method: 'POST', body: JSON.stringify(body) }),
};

/** Conversion Intelligence — AI / heuristic helpers for the admin builder */
export const conversionIntelligence = {
  recommendationAssistant: (body) =>
    api('/api/conversion-intelligence/recommendation-assistant', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
};

/** Single object for api.auth.me(), api.merchants.list(), etc. */
export default {
  api,
  auth,
  merchants,
  campaigns,
  analytics,
  rakuten,
  products,
  recommendationSets,
  recommendations,
  conversionIntelligence,
};
