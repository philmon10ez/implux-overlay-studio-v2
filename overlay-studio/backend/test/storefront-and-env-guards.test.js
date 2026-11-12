import test from 'node:test';
import assert from 'node:assert/strict';
import {
  authorizeStorefrontRequest,
  signAppProxyQuery,
} from '../../shared/storefrontProxyAuth.js';
import { secretsEqual } from '../../shared/timingSafeSecret.js';
import { validateDatabaseUrl } from '../../shared/databaseGuard.js';
import { resolveAppEnv } from '../../shared/appEnv.js';

const SECRET = 'app-proxy-test-secret';

function signedQuery(shop, extra = {}) {
  const query = {
    shop,
    timestamp: '1710000000',
    path_prefix: '/apps/poptek',
    ...extra,
  };
  query.signature = signAppProxyQuery(query, SECRET);
  return query;
}

test('strict mode rejects an unsigned storefront request', () => {
  const result = authorizeStorefrontRequest({
    query: { shop: 'alpha.myshopify.com' },
    env: { STOREFRONT_AUTH_MODE: 'strict', SHOPIFY_API_SECRET: SECRET },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('compat mode allows the published theme to call without a signature', () => {
  const result = authorizeStorefrontRequest({
    query: { shop: 'alpha.myshopify.com' },
    env: { STOREFRONT_AUTH_MODE: 'compat', SHOPIFY_API_SECRET: SECRET },
  });
  assert.equal(result.ok, true);
  assert.equal(result.signed, false);
  assert.equal(result.shop, 'alpha.myshopify.com');
});

test('a signature for shop A cannot authorize shop B', () => {
  const query = signedQuery('alpha.myshopify.com');
  query.shop = 'beta.myshopify.com';
  const result = authorizeStorefrontRequest({
    query,
    env: { STOREFRONT_AUTH_MODE: 'strict', SHOPIFY_API_SECRET: SECRET },
  });
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
});

test('a valid signature binds the request to the signed shop', () => {
  const result = authorizeStorefrontRequest({
    query: signedQuery('alpha.myshopify.com'),
    env: { STOREFRONT_AUTH_MODE: 'strict', SHOPIFY_API_SECRET: SECRET },
  });
  assert.equal(result.ok, true);
  assert.equal(result.shop, 'alpha.myshopify.com');
  assert.equal(result.signed, true);
});

test('shared secret comparison rejects a different length and different bytes', () => {
  assert.equal(secretsEqual('short', 'much-longer-secret'), false);
  assert.equal(secretsEqual('same-length-aaa', 'same-length-bbb'), false);
  assert.equal(secretsEqual('same-length-aaa', 'same-length-aaa'), true);
  assert.equal(secretsEqual(undefined, 'same-length-aaa'), false);
});

test('deployed hosts refuse to boot without APP_ENV', () => {
  assert.throws(
    () => resolveAppEnv({ RAILWAY_ENVIRONMENT: 'production', NODE_ENV: 'production' }),
    /APP_ENV is required/
  );
});

test('staging refuses the production database project', () => {
  assert.throws(
    () =>
      validateDatabaseUrl({
        APP_ENV: 'staging',
        DATABASE_ENV_ID: 'staging',
        DATABASE_URL: 'postgresql://db.rpggayuuxnzdqybnmxyu.supabase.co/postgres',
      }),
    /production database/
  );
});

test('production refuses the staging database project', () => {
  assert.throws(
    () =>
      validateDatabaseUrl({
        APP_ENV: 'production',
        DATABASE_ENV_ID: 'production',
        DATABASE_URL: 'postgresql://db.draguoqqidihfxovxfss.supabase.co/postgres',
      }),
    /staging database/
  );
});

test('staging accepts its own project ref', () => {
  const url = validateDatabaseUrl({
    APP_ENV: 'staging',
    DATABASE_ENV_ID: 'staging',
    DATABASE_URL: 'postgresql://db.draguoqqidihfxovxfss.supabase.co/postgres',
    EXPECTED_DATABASE_HOST_MARKER: 'draguoqqidihfxovxfss',
  });
  assert.match(url, /draguoqqidihfxovxfss/);
});
