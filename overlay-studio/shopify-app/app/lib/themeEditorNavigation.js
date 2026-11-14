/**
 * Theme Editor destinations for the embedded app.
 * App Bridge opens shopify://admin paths in the top-level admin frame.
 * The https fallback is only for a user-initiated new tab when App Bridge is absent.
 */

const SHOP_DOMAIN = /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/;
const ACTIVATE_APP_ID = /^[a-zA-Z0-9]+\/app-embed$/;

/**
 * @param {string} shopDomain
 */
export function normalizeThemeEditorShop(shopDomain) {
  const shop = String(shopDomain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
  if (!SHOP_DOMAIN.test(shop)) return null;
  return shop;
}

/**
 * @param {string} shopDomain authenticated myshopify.com domain
 * @param {string | null} activateAppId {clientId}/app-embed
 */
export function buildThemeEditorNavigation(shopDomain, activateAppId) {
  const shop = normalizeThemeEditorShop(shopDomain);
  const id = String(activateAppId || '').trim();
  if (!shop || !ACTIVATE_APP_ID.test(id)) return null;
  const handle = shop.slice(0, -'.myshopify.com'.length);
  const params = new URLSearchParams({
    context: 'apps',
    activateAppId: id,
  });
  const query = params.toString();
  return {
    shopDomain: shop,
    adminPath: `shopify://admin/themes/current/editor?${query}`,
    fallbackUrl: `https://admin.shopify.com/store/${handle}/themes/current/editor?${query}`,
  };
}

/**
 * @param {string} value
 */
function isAppBridgeThemeEditorPath(value) {
  if (typeof value !== 'string' || !value.startsWith('shopify://admin/themes/current/editor?')) {
    return false;
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'shopify:' &&
    url.hostname === 'admin' &&
    url.pathname === '/themes/current/editor' &&
    url.searchParams.get('context') === 'apps' &&
    ACTIVATE_APP_ID.test(url.searchParams.get('activateAppId') || '')
  );
}

/**
 * @param {string} value
 * @param {string} shopDomain
 */
function isTrustedThemeEditorFallback(value, shopDomain) {
  const shop = normalizeThemeEditorShop(shopDomain);
  if (!shop || typeof value !== 'string') return false;
  const handle = shop.slice(0, -'.myshopify.com'.length);
  let url;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  return (
    url.protocol === 'https:' &&
    url.hostname === 'admin.shopify.com' &&
    url.pathname === `/store/${handle}/themes/current/editor` &&
    url.searchParams.get('context') === 'apps' &&
    ACTIVATE_APP_ID.test(url.searchParams.get('activateAppId') || '') &&
    url.username === '' &&
    url.password === '' &&
    url.hash === ''
  );
}

/**
 * @param {object | null | undefined} destination
 * @param {{ isAppBridgeReady?: () => boolean, open?: (url: string, target: string, features?: string) => void }} [environment]
 * @returns {'app-bridge' | 'new-tab' | 'rejected'}
 */
export function openThemeEditorNavigation(destination, environment = {}) {
  const shopDomain = destination?.shopDomain;
  const adminPath = destination?.adminPath;
  const fallbackUrl = destination?.fallbackUrl;
  if (!isAppBridgeThemeEditorPath(adminPath) || !isTrustedThemeEditorFallback(fallbackUrl, shopDomain)) {
    return 'rejected';
  }
  const open = environment.open || ((url, target, features) => window.open(url, target, features));
  const bridgeReady =
    environment.isAppBridgeReady?.() ??
    (typeof window !== 'undefined' && Boolean(window.shopify));
  if (bridgeReady) {
    open(adminPath, '_top');
    return 'app-bridge';
  }
  open(fallbackUrl, '_blank', 'noopener,noreferrer');
  return 'new-tab';
}
