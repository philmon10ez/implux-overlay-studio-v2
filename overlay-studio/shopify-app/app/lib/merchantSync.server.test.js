/**
 * Merchant sync helpers — token resolution, retries, staging safety.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeShopDomain,
  resolveOfflineAccessToken,
  syncMerchantToBackend,
  markMerchantUninstalledOnBackend,
} from './merchantSync.server.js';

test('normalizeShopDomain lowercases and strips protocol', () => {
  assert.equal(normalizeShopDomain('HTTPS://Demo.SHOP.myshopify.com/'), 'demo.shop.myshopify.com');
});

test('resolveOfflineAccessToken prefers offline session row (fresh install / token exchange)', async () => {
  const prisma = {
    session: {
      findUnique: async ({ where }) => {
        if (where.id === 'offline_demo.myshopify.com') {
          return { accessToken: 'offline-token-abc', isOnline: false };
        }
        return null;
      },
      findFirst: async () => null,
    },
  };
  const token = await resolveOfflineAccessToken(prisma, {
    shop: 'demo.myshopify.com',
    accessToken: 'online-token',
    isOnline: true,
  });
  assert.equal(token, 'offline-token-abc');
});

test('resolveOfflineAccessToken uses session when already offline', async () => {
  const prisma = {
    session: {
      findUnique: async () => null,
      findFirst: async () => null,
    },
  };
  const token = await resolveOfflineAccessToken(prisma, {
    shop: 'demo.myshopify.com',
    accessToken: 'offline-direct',
    isOnline: false,
  });
  assert.equal(token, 'offline-direct');
});

test('syncMerchantToBackend retries on 503 then succeeds (recovery flow)', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    if (calls === 1) {
      return { ok: false, status: 503, text: async () => 'busy' };
    }
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, merchantId: 42 }),
    };
  };

  const prev = {
    IMPLUX_BACKEND_URL: process.env.IMPLUX_BACKEND_URL,
    MERCHANT_SYNC_SECRET: process.env.MERCHANT_SYNC_SECRET,
    APP_ENV: process.env.APP_ENV,
  };
  process.env.IMPLUX_BACKEND_URL = 'https://api-staging.example.test';
  process.env.MERCHANT_SYNC_SECRET = 'test-sync-secret';
  process.env.APP_ENV = 'staging';

  try {
    const result = await syncMerchantToBackend(
      {
        shop: 'demo.myshopify.com',
        accessToken: 'shpat_test',
        reason: 'test_retry',
        maxAttempts: 3,
        fetchImpl,
      },
      process.env
    );
    assert.equal(result.ok, true);
    assert.equal(result.merchantId, 42);
    assert.equal(calls, 2);
  } finally {
    process.env.IMPLUX_BACKEND_URL = prev.IMPLUX_BACKEND_URL;
    process.env.MERCHANT_SYNC_SECRET = prev.MERCHANT_SYNC_SECRET;
    process.env.APP_ENV = prev.APP_ENV;
  }
});

test('syncMerchantToBackend refuses production API host when APP_ENV=staging', async () => {
  const prev = {
    IMPLUX_BACKEND_URL: process.env.IMPLUX_BACKEND_URL,
    MERCHANT_SYNC_SECRET: process.env.MERCHANT_SYNC_SECRET,
    APP_ENV: process.env.APP_ENV,
  };
  process.env.IMPLUX_BACKEND_URL = 'https://api.implux.io';
  process.env.MERCHANT_SYNC_SECRET = 'test-sync-secret';
  process.env.APP_ENV = 'staging';

  try {
    const result = await syncMerchantToBackend(
      {
        shop: 'demo.myshopify.com',
        accessToken: 'shpat_test',
        fetchImpl: async () => {
          throw new Error('fetch should not run');
        },
      },
      process.env
    );
    assert.equal(result.ok, false);
    assert.equal(result.skipped, true);
    assert.equal(result.reason, 'unsafe_backend_url');
  } finally {
    process.env.IMPLUX_BACKEND_URL = prev.IMPLUX_BACKEND_URL;
    process.env.MERCHANT_SYNC_SECRET = prev.MERCHANT_SYNC_SECRET;
    process.env.APP_ENV = prev.APP_ENV;
  }
});

test('repeated sync calls use same shop key (idempotent backend contract)', async () => {
  const bodies = [];
  const fetchImpl = async (_url, init) => {
    bodies.push(JSON.parse(init.body));
    return {
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ ok: true, merchantId: 1 }),
    };
  };

  const env = {
    ...process.env,
    IMPLUX_BACKEND_URL: 'https://api-staging.example.test',
    MERCHANT_SYNC_SECRET: 'secret',
    APP_ENV: 'staging',
  };

  await syncMerchantToBackend(
    { shop: 'demo.myshopify.com', accessToken: 'token-a', fetchImpl },
    env
  );
  await syncMerchantToBackend(
    { shop: 'demo.myshopify.com', accessToken: 'token-b', fetchImpl },
    env
  );

  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].shop, 'demo.myshopify.com');
  assert.equal(bodies[1].shop, 'demo.myshopify.com');
  assert.equal(bodies[1].accessToken, 'token-b');
});

test('syncMerchantToBackend does not retry on 401 (failed sync)', async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls += 1;
    return { ok: false, status: 401, text: async () => 'Unauthorized' };
  };

  const env = {
    ...process.env,
    IMPLUX_BACKEND_URL: 'https://api-staging.example.test',
    MERCHANT_SYNC_SECRET: 'secret',
    APP_ENV: 'staging',
  };

  const result = await syncMerchantToBackend(
    { shop: 'demo.myshopify.com', accessToken: 'bad', fetchImpl, maxAttempts: 3 },
    env
  );
  assert.equal(result.ok, false);
  assert.equal(result.status, 401);
  assert.equal(calls, 1);
});

test('markMerchantUninstalledOnBackend calls mark-uninstalled endpoint', async () => {
  let url;
  const fetchImpl = async (u, init) => {
    url = u;
    assert.equal(init.method, 'POST');
    const body = JSON.parse(init.body);
    assert.equal(body.shop, 'uninstall.myshopify.com');
    return { ok: true, status: 200, text: async () => '{"ok":true,"found":true}' };
  };

  const env = {
    ...process.env,
    IMPLUX_BACKEND_URL: 'https://api-staging.example.test',
    MERCHANT_SYNC_SECRET: 'secret',
    APP_ENV: 'staging',
  };

  const result = await markMerchantUninstalledOnBackend('uninstall.myshopify.com', {
    fetchImpl,
    env,
  });
  assert.equal(result.ok, true);
  assert.match(url, /\/api\/shopify\/mark-uninstalled$/);
});
