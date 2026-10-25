/**
 * Shopify merchant sync API — idempotent upsert, reinstall, uninstall.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import shopifySyncRoutes, {
  upsertMerchantFromSync,
  markMerchantUninstalled,
  normalizeShopDomain,
} from '../routes/shopifySync.js';

const SYNC_SECRET = 'test-merchant-sync-secret-for-unit-tests';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/shopify', shopifySyncRoutes);
  return app;
}

test('normalizeShopDomain', () => {
  assert.equal(normalizeShopDomain('https://Store.myshopify.com/'), 'store.myshopify.com');
});

test('upsertMerchantFromSync is idempotent for same shop (reinstall / repeated open)', async () => {
  const store = new Map();
  let idSeq = 1;
  const db = {
    merchant: {
      upsert: async ({ where, create, update }) => {
        const key = where.shopifyDomain;
        const existing = store.get(key);
        if (!existing) {
          const row = { id: idSeq++, ...create };
          store.set(key, row);
          return row;
        }
        const row = { ...existing, ...update };
        store.set(key, row);
        return row;
      },
    },
  };

  const first = await upsertMerchantFromSync(db, {
    shop: 'fresh.myshopify.com',
    accessToken: 'token-v1',
    storeName: 'Fresh Store',
  });
  const second = await upsertMerchantFromSync(db, {
    shop: 'fresh.myshopify.com',
    accessToken: 'token-v2',
    storeName: 'Fresh Store',
  });

  assert.equal(first.id, second.id);
  assert.equal(store.size, 1);
  assert.equal(second.accessToken, 'token-v2');
  assert.equal(second.status, 'active');
});

test('markMerchantUninstalled preserves row and sets inactive (campaigns remain linked)', async () => {
  const row = {
    id: 7,
    shopifyDomain: 'leave.myshopify.com',
    storeName: 'Leave',
    accessToken: 'shpat_old',
    status: 'active',
  };
  const db = {
    merchant: {
      findUnique: async ({ where }) =>
        where.shopifyDomain === row.shopifyDomain ? { ...row } : null,
      update: async ({ where, data }) => {
        assert.equal(where.id, 7);
        Object.assign(row, data);
        return { ...row };
      },
    },
  };

  const result = await markMerchantUninstalled(db, 'leave.myshopify.com');
  assert.equal(result.found, true);
  assert.equal(result.merchantId, 7);
  assert.equal(row.status, 'inactive');
  assert.equal(row.accessToken, '');
});

test('POST /sync-merchant rejects missing sync secret header', async () => {
  const prev = process.env.MERCHANT_SYNC_SECRET;
  process.env.MERCHANT_SYNC_SECRET = SYNC_SECRET;

  try {
    const app = buildApp();
    const unauthorized = await request(app)
      .post('/api/shopify/sync-merchant')
      .send({ shop: 'api.myshopify.com', accessToken: 'tok' });
    assert.equal(unauthorized.status, 401);

    const badBody = await request(app)
      .post('/api/shopify/sync-merchant')
      .set('x-implux-merchant-sync-secret', SYNC_SECRET)
      .send({});
    assert.equal(badBody.status, 400);
  } finally {
    process.env.MERCHANT_SYNC_SECRET = prev;
  }
});

test('reinstall reactivates inactive merchant via upsert update path', async () => {
  const store = new Map([
    [
      'reinstall.myshopify.com',
      {
        id: 3,
        shopifyDomain: 'reinstall.myshopify.com',
        storeName: 'Re',
        accessToken: '',
        status: 'inactive',
      },
    ],
  ]);
  const db = {
    merchant: {
      upsert: async ({ where, create, update }) => {
        const key = where.shopifyDomain;
        const existing = store.get(key);
        if (!existing) {
          const row = { id: 99, ...create };
          store.set(key, row);
          return row;
        }
        const row = { ...existing, ...update };
        store.set(key, row);
        return row;
      },
    },
  };

  const row = await upsertMerchantFromSync(db, {
    shop: 'reinstall.myshopify.com',
    accessToken: 'new-offline-token',
    storeName: 'Re',
  });
  assert.equal(row.id, 3);
  assert.equal(row.status, 'active');
  assert.equal(row.accessToken, 'new-offline-token');
});
