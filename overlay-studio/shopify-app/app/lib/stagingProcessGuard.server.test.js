import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStagingProcessGuard,
  stagingProcessEnvErrors,
  STAGING_BACKEND_ORIGIN,
  STAGING_DB_HOST_MARKER,
  STAGING_FRONTEND_ORIGIN,
  STAGING_SHOPIFY_CLIENT_ID,
} from './stagingProcessGuard.server.js';

function stagingEnv(overrides = {}) {
  return {
    APP_ENV: 'staging',
    DATABASE_ENV_ID: 'staging',
    EXPECTED_DATABASE_HOST_MARKER: STAGING_DB_HOST_MARKER,
    SHOPIFY_API_KEY: STAGING_SHOPIFY_CLIENT_ID,
    SHOPIFY_API_SECRET: 'staging-api-secret',
    MERCHANT_SYNC_SECRET: 'staging-sync-secret',
    IMPLUX_BACKEND_URL: STAGING_BACKEND_ORIGIN,
    FRONTEND_URL: STAGING_FRONTEND_ORIGIN,
    DATABASE_URL: `postgresql://staging_user:staging_pass@db.${STAGING_DB_HOST_MARKER}.supabase.co:5432/postgres`,
    ...overrides,
  };
}

test('complete staging env has no errors', () => {
  assert.deepEqual(stagingProcessEnvErrors(stagingEnv()), []);
});

test('staging env allows an empty app URL and rejects a production app URL', () => {
  assert.deepEqual(stagingProcessEnvErrors(stagingEnv({ APP_URL: '' })), []);
  assert.ok(
    stagingProcessEnvErrors(
      stagingEnv({ SHOPIFY_APP_URL: 'https://stunning-friendship-production.up.railway.app' })
    ).some((error) => error.includes('SHOPIFY_APP_URL'))
  );
});

test('staging env rejects production client, API, and database', () => {
  const errors = stagingProcessEnvErrors(
    stagingEnv({
      SHOPIFY_API_KEY: 'bfcae2d7ecd83eb4fc96749fb543380c',
      IMPLUX_BACKEND_URL: 'https://api.implux.io',
      DATABASE_URL: 'postgresql://user:pass@db.rpggayuuxnzdqybnmxyu.supabase.co:5432/postgres',
    })
  );
  assert.ok(errors.some((error) => error.includes('production client ID')));
  assert.ok(errors.some((error) => error.includes('IMPLUX_BACKEND_URL')));
  assert.ok(errors.some((error) => error.includes('production Supabase')));
});

test('staging guard is inactive unless the sentinel is set', () => {
  const env = { APP_ENV: 'development', IMPLUX_BACKEND_URL: 'https://api.implux.io' };
  applyStagingProcessGuard(env);
  assert.equal(env.APP_ENV, 'development');
});

test('staging guard restores APP_ENV and rejects a production backend', () => {
  const env = stagingEnv({
    POPTEK_STAGING_LOCAL: '1',
    APP_ENV: 'development',
    IMPLUX_BACKEND_URL: 'https://api.implux.io',
  });
  assert.throws(() => applyStagingProcessGuard(env), /IMPLUX_BACKEND_URL/);
  assert.equal(env.APP_ENV, 'staging');
});
