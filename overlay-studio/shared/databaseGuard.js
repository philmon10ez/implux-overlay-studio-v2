/**
 * DATABASE_URL safety checks — no production credentials are stored here.
 * Phase 2B: set DATABASE_ENV_ID=staging on staging services after the staging DB exists.
 */

import { resolveAppEnv } from './appEnv.js';

const VALID_DATABASE_ENV_IDS = new Set(['production', 'staging', 'preview', 'development']);

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
  } else if (appEnv === 'staging' || appEnv === 'preview') {
    console.warn(
      `[database-guard] APP_ENV=${appEnv} but DATABASE_ENV_ID is not set. ` +
        'Set DATABASE_ENV_ID=staging (Phase 2B) after creating the staging PostgreSQL database.'
    );
  }

  const hostMarker = String(env.EXPECTED_DATABASE_HOST_MARKER || '').trim();
  if (hostMarker && appEnv !== 'production') {
    if (!databaseUrl.includes(hostMarker)) {
      throw new Error(
        `[database-guard] DATABASE_URL must contain EXPECTED_DATABASE_HOST_MARKER="${hostMarker}" when APP_ENV=${appEnv}.`
      );
    }
  }

  return databaseUrl;
}
