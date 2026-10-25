/**
 * Server-only merchant sync to Implux backend (never import from client components).
 */
import { PRODUCTION_API_HOST, resolveAppEnv } from '../../../shared/appEnv.js';

const RETRYABLE_STATUS = new Set([408, 429, 500, 502, 503, 504]);
const DEFAULT_MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [0, 400, 1200];

export function normalizeShopDomain(shop) {
  return String(shop || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

export function defaultStoreNameFromShop(shopNorm) {
  return shopNorm.replace('.myshopify.com', '').replace(/-/g, ' ') || shopNorm;
}

/**
 * Prefer offline Admin API token (required for backend persistence).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ shop?: string, accessToken?: string, isOnline?: boolean } | null | undefined} session
 */
export async function resolveOfflineAccessToken(prisma, session) {
  if (!session?.shop) return null;

  if (session.accessToken && session.isOnline === false) {
    return session.accessToken;
  }

  const shopNorm = normalizeShopDomain(session.shop);
  const offlineId = `offline_${shopNorm}`;
  const byId = await prisma.session.findUnique({ where: { id: offlineId } });
  if (byId?.accessToken) {
    return byId.accessToken;
  }

  const offlineRow = await prisma.session.findFirst({
    where: { shop: shopNorm, isOnline: false },
    orderBy: { id: 'asc' },
  });
  if (offlineRow?.accessToken) {
    return offlineRow.accessToken;
  }

  return session.accessToken || null;
}

export function getMerchantSyncConfig(env = process.env) {
  const backendUrl = String(env.IMPLUX_BACKEND_URL || env.BACKEND_API_URL || '')
    .trim()
    .replace(/\/$/, '');
  const syncSecret = String(env.MERCHANT_SYNC_SECRET || '').trim();
  return { backendUrl, syncSecret };
}

export function assertSafeBackendUrlForSync(backendUrl, env = process.env) {
  const appEnv = resolveAppEnv(env);
  if ((appEnv === 'staging' || appEnv === 'preview') && backendUrl.includes(PRODUCTION_API_HOST)) {
    throw new Error(
      `[Implux] Refusing merchant sync: IMPLUX_BACKEND_URL targets production host ${PRODUCTION_API_HOST} while APP_ENV=${appEnv}`
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * @param {object} opts
 * @param {string} opts.shop
 * @param {string} opts.accessToken
 * @param {string} [opts.storeName]
 * @param {string} [opts.reason]
 * @param {number} [opts.maxAttempts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {NodeJS.ProcessEnv} [opts.env]
 */
export async function syncMerchantToBackend(opts, env = process.env) {
  const {
    shop,
    accessToken,
    storeName,
    reason = 'app_load',
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    fetchImpl = fetch,
  } = opts;

  const shopNorm = normalizeShopDomain(shop);
  if (!shopNorm || !accessToken) {
    return { ok: false, skipped: true, reason: 'missing_shop_or_token' };
  }

  const { backendUrl, syncSecret } = getMerchantSyncConfig(env);
  if (!backendUrl || !syncSecret) {
    console.warn('[Implux] Merchant sync skipped:', {
      reason,
      hasBackendUrl: !!backendUrl,
      hasSyncSecret: !!syncSecret,
      shop: shopNorm,
    });
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  try {
    assertSafeBackendUrlForSync(backendUrl, env);
  } catch (err) {
    console.error('[Implux] Merchant sync blocked:', err?.message || err);
    return { ok: false, skipped: true, reason: 'unsafe_backend_url' };
  }

  const body = JSON.stringify({
    shop: shopNorm,
    accessToken,
    storeName: (storeName && String(storeName).trim()) || defaultStoreNameFromShop(shopNorm),
  });

  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const delay = RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)];
    if (delay > 0) {
      await sleep(delay);
    }

    try {
      const res = await fetchImpl(`${backendUrl}/api/shopify/sync-merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-implux-merchant-sync-secret': syncSecret,
        },
        body,
      });
      const text = await res.text();
      if (res.ok) {
        let merchantId;
        try {
          const parsed = JSON.parse(text);
          merchantId = parsed?.merchantId;
        } catch {
          /* ignore */
        }
        console.log('[Implux] Merchant sync OK for', shopNorm, `(reason=${reason}, attempt=${attempt})`);
        return { ok: true, merchantId, shop: shopNorm };
      }

      lastError = { status: res.status, text };
      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts) {
        console.warn('[Implux] Merchant sync failed:', res.status, text, `(reason=${reason})`);
        return { ok: false, status: res.status, error: text };
      }
      console.warn(
        '[Implux] Merchant sync retry:',
        res.status,
        `(reason=${reason}, attempt=${attempt}/${maxAttempts})`
      );
    } catch (err) {
      lastError = err;
      if (attempt === maxAttempts) {
        console.warn('[Implux] Merchant sync error:', err?.message || err, `(reason=${reason})`);
        return { ok: false, error: err?.message || String(err) };
      }
      console.warn(
        '[Implux] Merchant sync network retry:',
        err?.message || err,
        `(reason=${reason}, attempt=${attempt}/${maxAttempts})`
      );
    }
  }

  return { ok: false, error: lastError?.message || lastError?.text || 'sync_failed' };
}

/**
 * @param {string} shop
 * @param {object} [opts]
 * @param {typeof fetch} [opts.fetchImpl]
 * @param {NodeJS.ProcessEnv} [opts.env]
 */
export async function markMerchantUninstalledOnBackend(shop, opts = {}) {
  const { fetchImpl = fetch, env = process.env } = opts;
  const shopNorm = normalizeShopDomain(shop);
  if (!shopNorm) {
    return { ok: false, skipped: true, reason: 'missing_shop' };
  }

  const { backendUrl, syncSecret } = getMerchantSyncConfig(env);
  if (!backendUrl || !syncSecret) {
    return { ok: false, skipped: true, reason: 'not_configured' };
  }

  try {
    assertSafeBackendUrlForSync(backendUrl, env);
  } catch (err) {
    console.error('[Implux] mark-uninstalled blocked:', err?.message || err);
    return { ok: false, skipped: true, reason: 'unsafe_backend_url' };
  }

  try {
    const res = await fetchImpl(`${backendUrl}/api/shopify/mark-uninstalled`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-implux-merchant-sync-secret': syncSecret,
      },
      body: JSON.stringify({ shop: shopNorm }),
    });
    const text = await res.text();
    if (res.ok) {
      console.log('[Implux] Merchant marked uninstalled:', shopNorm);
      return { ok: true, shop: shopNorm };
    }
    console.warn('[Implux] mark-uninstalled failed:', res.status, text);
    return { ok: false, status: res.status, error: text };
  } catch (err) {
    console.warn('[Implux] mark-uninstalled error:', err?.message || err);
    return { ok: false, error: err?.message || String(err) };
  }
}

/**
 * Run sync after admin auth (layout loader / afterAuth when it fires).
 * @param {import('@prisma/client').PrismaClient} prisma
 * @param {{ shop?: string, accessToken?: string, isOnline?: boolean } | null | undefined} session
 * @param {string} reason
 */
export async function syncMerchantFromSession(prisma, session, reason = 'app_load') {
  const shop = session?.shop;
  const accessToken = await resolveOfflineAccessToken(prisma, session);
  if (!shop || !accessToken) {
    console.warn('[Implux] Merchant sync skipped (no offline token):', {
      reason,
      shop: shop ? normalizeShopDomain(shop) : '(none)',
      hasToken: !!accessToken,
    });
    return { ok: false, skipped: true, reason: 'no_offline_token' };
  }
  return syncMerchantToBackend({
    shop,
    accessToken,
    reason,
  });
}
