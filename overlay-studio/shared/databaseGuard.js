/**
 * DATABASE_URL safety checks — no production credentials are stored here.
 * Phase 2B: set DATABASE_ENV_ID=staging on staging services after the staging DB exists.
 */

import { resolveAppEnv } from './appEnv.js';

const VALID_DATABASE_ENV_IDS = new Set(['production', 'staging', 'preview', 'development']);

/** Public Supabase project refs. These are not passwords. */
export const PRODUCTION_DATABASE_PROJECT_REF = 'rpggayuuxnzdqybnmxyu';
export const STAGING_DATABASE_PROJECT_REF = 'draguoqqidihfxovxfss';

/**
 * @param {NodeJS.ProcessEnv} env
 */
function isDeployedHost(env) {
  return Boolean(env.RAILWAY_ENVIRONMENT || env.RAILWAY_PROJECT_ID || env.RAILWAY_SERVICE_ID || env.VERCEL);
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function validateDatabaseUrl(env = process.env) {
  const appEnv = resolveAppEnv(env);
  const databaseUrl = String(env.DATABASE_URL || '').trim();

  if (!databaseUrl) {
    throw new Error(
      '[database-guard] DATABASE_URL is required and must be set explicitly. No fallback URL is permitted.'
    );
  }

  const dbEnvId = String(env.DATABASE_ENV_ID || '').trim().toLowerCase();

  if (dbEnvId) {
    if (!VALID_DATABASE_ENV_IDS.has(dbEnvId)) {
      throw new Error(
        `[database-guard] Invalid DATABASE_ENV_ID "${dbEnvId}". Expected one of: ${[...VALID_DATABASE_ENV_IDS].join(', ')}`
      );
    }

    const expectedByAppEnv = {
      production: 'production',
      staging: 'staging',
      preview: 'preview',
      development: 'development',
    };

    const expected = expectedByAppEnv[appEnv];
    if (expected && dbEnvId !== expected) {
      throw new Error(
        `[database-guard] DATABASE_ENV_ID="${dbEnvId}" does not match APP_ENV="${appEnv}" (expected "${expected}").`
      );
    }
  } else if (appEnv === 'staging' || appEnv === 'preview' || appEnv === 'production' || isDeployedHost(env)) {
    throw new Error(
      `[database-guard] DATABASE_ENV_ID is required when APP_ENV=${appEnv}. Refusing to start without an environment marker.`
    );
  }

  const hasProductionRef = databaseUrl.includes(PRODUCTION_DATABASE_PROJECT_REF);
  const hasStagingRef = databaseUrl.includes(STAGING_DATABASE_PROJECT_REF);
  if (hasProductionRef && hasStagingRef) {
    throw new Error('[database-guard] DATABASE_URL contains both the production and staging project refs.');
  }
  if (appEnv === 'staging' || appEnv === 'preview') {
    if (hasProductionRef) {
      throw new Error('[database-guard] Staging must not connect to the production database project.');
    }
    if (!hasStagingRef) {
      throw new Error('[database-guard] Staging DATABASE_URL must contain the staging database project ref.');
    }
  }
  if (appEnv === 'production') {
    if (hasStagingRef) {
      throw new Error('[database-guard] Production must not connect to the staging database project.');
    }
    if (!hasProductionRef) {
      throw new Error('[database-guard] Production DATABASE_URL must contain the production database project ref.');
    }
  }

  const hostMarker = String(env.EXPECTED_DATABASE_HOST_MARKER || '').trim();
  if (hostMarker && !databaseUrl.includes(hostMarker)) {
    throw new Error(
      `[database-guard] DATABASE_URL must contain EXPECTED_DATABASE_HOST_MARKER when APP_ENV=${appEnv}.`
    );
  }

  return databaseUrl;
}
