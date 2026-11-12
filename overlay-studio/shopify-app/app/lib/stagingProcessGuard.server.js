/**
 * Fail-closed checks for a local staging Shopify process.
 * Active only when POPTEK_STAGING_LOCAL=1. Does not read or print secrets.
 */
import {
  PRODUCTION_ADMIN_HOST,
  PRODUCTION_API_HOST,
  PRODUCTION_SHOPIFY_APP_HOST,
} from '../../../shared/appEnv.js';

export const STAGING_LOCAL_SENTINEL = 'POPTEK_STAGING_LOCAL';
export const STAGING_SHOPIFY_CLIENT_ID = '786f52ea5cd6c4e9c95a835dfecd2ecb';
export const PRODUCTION_SHOPIFY_CLIENT_ID = 'bfcae2d7ecd83eb4fc96749fb543380c';
export const STAGING_BACKEND_ORIGIN = 'https://implux-overlay-studio-v2-staging.up.railway.app';
export const STAGING_FRONTEND_ORIGIN = 'https://implux-overlay-studio-staging.vercel.app';
export const STAGING_DB_HOST_MARKER = 'draguoqqidihfxovxfss';
export const PRODUCTION_DB_HOST_MARKER = 'rpggayuuxnzdqybnmxyu';

const PRODUCTION_HOSTS = new Set([
  PRODUCTION_API_HOST,
  PRODUCTION_ADMIN_HOST,
  PRODUCTION_SHOPIFY_APP_HOST,
]);

function hostnameOf(value) {
  try {
    return new URL(String(value)).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function requireExactOrigin(env, name, expected) {
  const raw = String(env[name] || '').trim().replace(/\/$/, '');
  if (!raw) return `${name} is missing`;
  if (raw !== expected) return `${name} is not the staging origin`;
  return '';
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @returns {string[]}
 */
export function stagingProcessEnvErrors(env) {
  const errors = [];
  if (String(env.APP_ENV || '').trim() !== 'staging') {
    errors.push('APP_ENV must be staging');
  }
  if (String(env.DATABASE_ENV_ID || '').trim() !== 'staging') {
    errors.push('DATABASE_ENV_ID must be staging');
  }
  if (String(env.EXPECTED_DATABASE_HOST_MARKER || '').trim() !== STAGING_DB_HOST_MARKER) {
    errors.push('EXPECTED_DATABASE_HOST_MARKER must be the Poptek Staging Supabase ref');
  }

  const apiKey = String(env.SHOPIFY_API_KEY || '').trim();
  if (!apiKey) errors.push('SHOPIFY_API_KEY is missing');
  else if (apiKey === PRODUCTION_SHOPIFY_CLIENT_ID) errors.push('SHOPIFY_API_KEY is the production client ID');
  else if (apiKey !== STAGING_SHOPIFY_CLIENT_ID) errors.push('SHOPIFY_API_KEY is not the staging client ID');

  if (!String(env.SHOPIFY_API_SECRET || '').trim()) {
    errors.push('SHOPIFY_API_SECRET is missing');
  }
  if (!String(env.MERCHANT_SYNC_SECRET || '').trim()) {
    errors.push('MERCHANT_SYNC_SECRET is missing');
  }

  const backendError = requireExactOrigin(env, 'IMPLUX_BACKEND_URL', STAGING_BACKEND_ORIGIN);
  if (backendError) errors.push(backendError);
  const frontendError = requireExactOrigin(env, 'FRONTEND_URL', STAGING_FRONTEND_ORIGIN);
  if (frontendError) errors.push(frontendError);

  const databaseUrl = String(env.DATABASE_URL || '').trim();
  if (!databaseUrl) {
    errors.push('DATABASE_URL is missing');
  } else if (databaseUrl.includes(PRODUCTION_DB_HOST_MARKER)) {
    errors.push('DATABASE_URL contains the production Supabase project ref');
  } else if (!databaseUrl.includes(STAGING_DB_HOST_MARKER)) {
    errors.push('DATABASE_URL does not contain the Poptek Staging Supabase project ref');
  } else if (hostnameOf(databaseUrl) && PRODUCTION_HOSTS.has(hostnameOf(databaseUrl))) {
    errors.push('DATABASE_URL host is a production host');
  }

  for (const name of ['APP_URL', 'SHOPIFY_APP_URL']) {
    const raw = String(env[name] || '').trim();
    if (!raw) continue;
    const host = hostnameOf(raw);
    if (!host || PRODUCTION_HOSTS.has(host)) {
      errors.push(`${name} points at a production host`);
    }
  }

  return errors;
}

/**
 * @param {NodeJS.ProcessEnv} env
 */
export function assertStagingProcessEnv(env) {
  const errors = stagingProcessEnvErrors(env);
  if (errors.length) {
    throw new Error(`[staging-env] Refusing to start.\n- ${errors.join('\n- ')}`);
  }
}

/**
 * Shopify CLI dev sets APP_ENV=development on the Remix process.
 * The sentinel is the only switch that turns these checks on, then restores APP_ENV.
 * @param {NodeJS.ProcessEnv} [env]
 */
export function applyStagingProcessGuard(env = process.env) {
  if (String(env[STAGING_LOCAL_SENTINEL] || '') !== '1') return;
  env.APP_ENV = 'staging';
  assertStagingProcessEnv(env);
}
