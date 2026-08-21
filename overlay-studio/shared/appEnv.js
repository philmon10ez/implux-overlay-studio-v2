/**
 * Central Poptek / Implux application environment resolution.
 * Use APP_ENV — do not rely on NODE_ENV alone (staging and production both use NODE_ENV=production on hosts).
 */

export const APP_ENV_VALUES = ['development', 'preview', 'staging', 'production'];

/** Known production host markers (not secrets — used for cross-environment safety checks). */
export const PRODUCTION_API_HOST = 'api.implux.io';
export const PRODUCTION_ADMIN_HOST = 'admin.implux.io';
export const PRODUCTION_SHOPIFY_APP_HOST = 'stunning-friendship-production.up.railway.app';

export const STAGING_EXPECTED_API_HOST = 'api-staging.implux.io';
export const STAGING_EXPECTED_ADMIN_HOST = 'admin-staging.implux.io';
export const STAGING_PLACEHOLDER_SHOPIFY_APP_URL =
  'https://STAGING-SHOPIFY-APP-URL-NOT-CONFIGURED.invalid';

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {'development'|'preview'|'staging'|'production'}
 */
export function resolveAppEnv(env = process.env) {
  const raw = String(env.APP_ENV || '').trim().toLowerCase();

  if (!raw) {
    if (env.NODE_ENV === 'test') return 'development';
    if (env.NODE_ENV === 'production' || env.RAILWAY_ENVIRONMENT || env.VERCEL) {
      console.warn(
        '[app-env] APP_ENV is not set on a deployed host — defaulting to "production". Set APP_ENV explicitly (recommended).'
      );
      return 'production';
    }
    return 'development';
  }

  if (!APP_ENV_VALUES.includes(raw)) {
    throw new Error(
      `Invalid APP_ENV "${raw}". Expected one of: ${APP_ENV_VALUES.join(', ')}`
    );
  }

  return raw;
}

/** @param {string|boolean|undefined|null} value @param {boolean} defaultValue */
export function parseBooleanEnv(value, defaultValue = false) {
  if (value === undefined || value === null || value === '') return defaultValue;
  const v = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(v)) return true;
  if (['0', 'false', 'no', 'off'].includes(v)) return false;
  return defaultValue;
}

/**
 * Rakuten cron: enabled by default only in production unless RAKUTEN_SYNC_ENABLED is set.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isRakutenSyncEnabled(env = process.env) {
  const appEnv = resolveAppEnv(env);
  const explicit = env.RAKUTEN_SYNC_ENABLED;
  if (explicit !== undefined && explicit !== '') {
    return parseBooleanEnv(explicit, false);
  }
  return appEnv === 'production';
}

/**
 * Outbound email: enabled by default only in production unless EMAIL_ENABLED is set.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function isEmailEnabled(env = process.env) {
  const appEnv = resolveAppEnv(env);
  const explicit = env.EMAIL_ENABLED;
  if (explicit !== undefined && explicit !== '') {
    return parseBooleanEnv(explicit, false);
  }
  return appEnv === 'production';
}

/**
 * @param {'development'|'preview'|'staging'|'production'} appEnv
 */
export function defaultAdminOriginForAppEnv(appEnv) {
  switch (appEnv) {
    case 'production':
      return `https://${PRODUCTION_ADMIN_HOST}`;
    case 'staging':
      return `https://${STAGING_EXPECTED_ADMIN_HOST}`;
    case 'preview':
      return null;
    case 'development':
    default:
      return 'http://localhost:5173';
  }
}

/**
 * @param {string} url
 */
export function normalizeOrigin(url) {
  if (!url || typeof url !== 'string') return '';
  return url.trim().replace(/\/$/, '');
}

/**
 * @param {string} url
 */
export function hostFromUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * @param {string} url
 * @param {string} hostMarker
 */
export function urlHostIncludes(url, hostMarker) {
  if (!url || !hostMarker) return false;
  const host = hostFromUrl(url);
  return host === hostMarker.toLowerCase() || host.endsWith(`.${hostMarker.toLowerCase()}`);
}

/**
 * @param {'development'|'preview'|'staging'|'production'} appEnv
 * @param {string} frontendUrlEnv FRONTEND_URL (comma-separated allowed)
 */
export function resolveAdminCorsOrigins(appEnv, frontendUrlEnv = process.env.FRONTEND_URL) {
  const fromEnv = String(frontendUrlEnv || '')
    .split(',')
    .map((s) => normalizeOrigin(s))
    .filter(Boolean);

  const defaults = [];
  const defaultOrigin = defaultAdminOriginForAppEnv(appEnv);
  if (defaultOrigin) defaults.push(defaultOrigin);

  if (appEnv === 'development') {
    defaults.push('http://localhost:5173', 'http://127.0.0.1:5173');
  }

  return [...new Set([...defaults, ...fromEnv])];
}
