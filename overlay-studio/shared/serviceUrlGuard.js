/**
 * Cross-service URL safety checks (backend ↔ Shopify app ↔ theme extension).
 */

import {
  PRODUCTION_API_HOST,
  PRODUCTION_SHOPIFY_APP_HOST,
  STAGING_EXPECTED_API_HOST,
  STAGING_PLACEHOLDER_SHOPIFY_APP_URL,
  resolveAppEnv,
  urlHostIncludes,
} from './appEnv.js';

/**
 * Staging/preview must not call the production API host.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function validateImpluxBackendUrl(env = process.env) {
  const appEnv = resolveAppEnv(env);
  const raw = String(env.IMPLUX_BACKEND_URL || env.BACKEND_API_URL || '').trim();

  if (appEnv === 'staging' || appEnv === 'preview') {
    if (!raw) {
      throw new Error(
        `[service-url-guard] IMPLUX_BACKEND_URL is required when APP_ENV=${appEnv}. No production fallback is allowed.`
      );
    }
    if (urlHostIncludes(raw, PRODUCTION_API_HOST)) {
      throw new Error(
        `[service-url-guard] IMPLUX_BACKEND_URL must not target production host "${PRODUCTION_API_HOST}" when APP_ENV=${appEnv}.`
      );
    }
    if (appEnv === 'staging' && !urlHostIncludes(raw, STAGING_EXPECTED_API_HOST)) {
      console.warn(
        `[service-url-guard] Staging IMPLUX_BACKEND_URL does not use expected host "${STAGING_EXPECTED_API_HOST}" yet — configure in Phase 2B.`
      );
    }
  }

  return raw.replace(/\/$/, '');
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function validateShopifyAppPublicUrl(env = process.env) {
  const appEnv = resolveAppEnv(env);
  const raw = String(env.APP_URL || env.SHOPIFY_APP_URL || '').trim();

  if (appEnv === 'staging') {
    if (!raw) {
      throw new Error('[service-url-guard] APP_URL is required when APP_ENV=staging.');
    }
    if (raw === STAGING_PLACEHOLDER_SHOPIFY_APP_URL || raw.includes('NOT-CONFIGURED')) {
      throw new Error(
        '[service-url-guard] APP_URL is still a placeholder. Configure the staging Railway Shopify service URL in Phase 2B.'
      );
    }
    if (urlHostIncludes(raw, PRODUCTION_SHOPIFY_APP_HOST)) {
      throw new Error(
        `[service-url-guard] APP_URL must not target production Shopify host "${PRODUCTION_SHOPIFY_APP_HOST}" when APP_ENV=staging.`
      );
    }
  }

  return raw.replace(/\/$/, '');
}

/**
 * @param {string} proxyUrl full proxy base (…/proxy)
 * @param {'production'|'staging'} target
 */
export function validateThemeExtensionProxyUrl(proxyUrl, target) {
  const url = String(proxyUrl || '').trim();
  if (!url) {
    throw new Error(
      `[theme-extension] POPTEK_PROXY_URL is required for ${target} extension builds. No silent production fallback.`
    );
  }

  if (target === 'staging') {
    if (urlHostIncludes(url, PRODUCTION_API_HOST)) {
      throw new Error(
        `[theme-extension] Staging POPTEK_PROXY_URL must not target production host "${PRODUCTION_API_HOST}".`
      );
    }
    if (!urlHostIncludes(url, STAGING_EXPECTED_API_HOST)) {
      throw new Error(
        `[theme-extension] Staging POPTEK_PROXY_URL must target "${STAGING_EXPECTED_API_HOST}" (got "${url}").`
      );
    }
  }

  if (target === 'production' && !urlHostIncludes(url, PRODUCTION_API_HOST)) {
    throw new Error(
      `[theme-extension] Production POPTEK_PROXY_URL must target "${PRODUCTION_API_HOST}" (got "${url}").`
    );
  }

  if (!url.endsWith('/proxy')) {
    throw new Error('[theme-extension] POPTEK_PROXY_URL must end with /proxy');
  }

  return url;
}
