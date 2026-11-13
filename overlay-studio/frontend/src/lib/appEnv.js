/**
 * Frontend environment resolution (Vite exposes only VITE_* variables to the client).
 */

export const APP_ENV_VALUES = ['development', 'preview', 'staging', 'production'];

const PRODUCTION_API_HOST = 'api.implux.io';

/**
 * @returns {'development'|'preview'|'staging'|'production'}
 */
export function resolveAppEnv() {
  const raw = String(import.meta.env.VITE_APP_ENV || '').trim().toLowerCase();

  if (!raw) {
    if (import.meta.env.DEV) return 'development';
    // The live admin project was built before VITE_APP_ENV existed. A production
    // Vite build with no explicit env keeps calling https://api.implux.io.
    // Staging and preview must set VITE_APP_ENV so they cannot take this path.
    if (import.meta.env.PROD) return 'production';
    throw new Error(
      'VITE_APP_ENV is required for production, staging, and preview builds. ' +
        'Set VITE_APP_ENV to development | preview | staging | production.'
    );
  }

  if (!APP_ENV_VALUES.includes(raw)) {
    throw new Error(
      `Invalid VITE_APP_ENV "${raw}". Expected one of: ${APP_ENV_VALUES.join(', ')}`
    );
  }

  return raw;
}

export function resolveApiBaseUrl() {
  const appEnv = resolveAppEnv();
  const url = String(import.meta.env.VITE_API_URL || '').trim();

  // Staging/preview call same-origin /api. Deploy that mode only with the staging
  // Vercel project. This production file rewrites /api to https://api.implux.io.
  if (appEnv === 'staging' || appEnv === 'preview') {
    if (url.includes(PRODUCTION_API_HOST)) {
      throw new Error(
        `VITE_API_URL must not target production host "${PRODUCTION_API_HOST}" when VITE_APP_ENV=${appEnv}.`
      );
    }
    return '';
  }

  if (appEnv === 'production') {
    if (!url) return `https://${PRODUCTION_API_HOST}`;
    if (!url.includes(PRODUCTION_API_HOST)) {
      throw new Error(
        `VITE_API_URL must target "${PRODUCTION_API_HOST}" when VITE_APP_ENV=production.`
      );
    }
    return url.replace(/\/$/, '');
  }

  if (!url) {
    throw new Error(
      `VITE_API_URL is required when VITE_APP_ENV=${appEnv}. ` +
        'No silent fallback to the production API is permitted.'
    );
  }

  return url.replace(/\/$/, '');
}

export function isStagingEnvironment() {
  return resolveAppEnv() === 'staging';
}

export function isPreviewEnvironment() {
  return resolveAppEnv() === 'preview';
}

export function shouldNoIndex() {
  const env = resolveAppEnv();
  return env === 'staging' || env === 'preview';
}

/** Call once at startup — throws if configuration is unsafe or incomplete. */
export function validateFrontendEnvironment() {
  resolveApiBaseUrl();
}
