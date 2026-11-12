/**
 * Shopify app-proxy signature verification.
 * The storefront does not hold the app secret. Shopify signs the query string
 * when the theme calls /apps/<subpath> on the shop domain.
 *
 * Message: sorted query keys except signature/hmac, concatenated as key=value
 * with an empty separator, HMAC-SHA256 hex using the app secret.
 */
import crypto from 'crypto';

const MYSHOPIFY = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;

/**
 * @param {string | undefined | null} raw
 */
export function normalizeProxyShop(raw) {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '')
    .split('/')[0]
    .split('?')[0];
}

/**
 * @param {string} shop
 */
export function isProxyShopDomain(shop) {
  return MYSHOPIFY.test(shop);
}

/**
 * @param {Record<string, unknown>} query
 */
export function buildAppProxyMessage(query) {
  /** @type {[string, string][]} */
  const entries = [];
  for (const key of Object.keys(query || {})) {
    if (key === 'signature' || key === 'hmac') continue;
    const raw = query[key];
    const value = Array.isArray(raw) ? raw.map((item) => String(item ?? '')).join(',') : String(raw ?? '');
    entries.push([key, value]);
  }
  entries.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return entries.map(([key, value]) => `${key}=${value}`).join('');
}

/**
 * @param {Record<string, unknown>} query
 * @param {string} secret
 */
export function signAppProxyQuery(query, secret) {
  return crypto.createHmac('sha256', secret).update(buildAppProxyMessage(query), 'utf8').digest('hex');
}

/**
 * @param {Record<string, unknown>} query
 * @param {string | undefined} secret
 */
export function verifyAppProxySignature(query, secret) {
  if (!secret) return false;
  const provided = query?.signature ?? query?.hmac;
  if (typeof provided !== 'string' || !provided) return false;
  const expected = signAppProxyQuery(query, secret);
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

/**
 * compat: missing signature is allowed so the currently published theme keeps working.
 * strict: a valid app-proxy signature is required. Invalid signatures are rejected in both modes.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {'compat' | 'strict'}
 */
export function resolveStorefrontAuthMode(env = process.env) {
  const raw = String(env.STOREFRONT_AUTH_MODE || 'compat').trim().toLowerCase();
  return raw === 'strict' ? 'strict' : 'compat';
}

/**
 * @param {{ query?: Record<string, unknown>, env?: NodeJS.ProcessEnv }} input
 * @returns {{ ok: true, shop: string, signed: boolean } | { ok: false, status: number, reason: string }}
 */
export function authorizeStorefrontRequest(input) {
  const query = input?.query || {};
  const env = input?.env || process.env;
  const mode = resolveStorefrontAuthMode(env);
  const hasSignature = Boolean(query.signature || query.hmac);
  const secret = env.SHOPIFY_API_SECRET || env.PROXY_HMAC_SECRET;

  if (hasSignature) {
    if (!secret) return { ok: false, status: 503, reason: 'proxy_auth_unconfigured' };
    if (!verifyAppProxySignature(query, secret)) {
      return { ok: false, status: 401, reason: 'invalid_signature' };
    }
    const shop = normalizeProxyShop(query.shop);
    if (!isProxyShopDomain(shop)) return { ok: false, status: 401, reason: 'invalid_signed_shop' };
    return { ok: true, shop, signed: true };
  }

  if (mode === 'strict') {
    return { ok: false, status: 401, reason: 'signature_required' };
  }

  const shop = normalizeProxyShop(query.shop);
  if (!shop) return { ok: false, status: 400, reason: 'shop_required' };
  if (!isProxyShopDomain(shop)) return { ok: false, status: 400, reason: 'invalid_shop' };
  return { ok: true, shop, signed: false };
}

/**
 * A signed request may only act for the shop inside the signature.
 * @param {string} authorizedShop
 * @param {unknown} claimedShop
 */
export function claimedShopMatches(authorizedShop, claimedShop) {
  if (claimedShop == null || claimedShop === '') return true;
  return normalizeProxyShop(claimedShop) === authorizedShop;
}
