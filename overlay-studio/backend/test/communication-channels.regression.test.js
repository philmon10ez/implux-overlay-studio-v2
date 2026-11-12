/**
 * Regression checks for Poptek communication channels (no live SMTP/webhooks/production DB).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import { createApp } from '../app.js';
import { signShopifyWebhookBody } from '../services/shopifyWebhookHmac.js';
import shopifySyncRoutes from '../routes/shopifySync.js';
import { resolveOrderWebhookShopDomain } from '../lib/orderWebhookShopDomain.js';
import { PRODUCTION_API_HOST } from '../../shared/appEnv.js';
import { assertSafeBackendUrlForSync } from '../../shopify-app/app/lib/merchantSync.server.js';

process.env.POPTEK_DISABLE_COMPLIANCE_SIDE_EFFECTS = '1';

const TEST_SECRET = 'regression-test-merchant-sync-secret';

test('merchant sync: staging refuses production API host (cross-env guard)', () => {
  assert.throws(
    () =>
      assertSafeBackendUrlForSync(`https://${PRODUCTION_API_HOST}`, {
        APP_ENV: 'staging',
        NODE_ENV: 'production',
      }),
    /Refusing merchant sync/
  );
});

test('merchant sync: mark-uninstalled route requires same secret as sync-merchant', async () => {
  const prev = process.env.MERCHANT_SYNC_SECRET;
  process.env.MERCHANT_SYNC_SECRET = TEST_SECRET;
  const app = express();
  app.use(express.json());
  app.use('/api/shopify', shopifySyncRoutes);

  try {
    const noSecret = await request(app).post('/api/shopify/mark-uninstalled').send({ shop: 'x.myshopify.com' });
    assert.equal(noSecret.status, 401);
  } finally {
    process.env.MERCHANT_SYNC_SECRET = prev;
  }
});

test('orders/conversion: shop domain resolution does not depend on collaborator or source_name', () => {
  const domain = resolveOrderWebhookShopDomain(
    { headers: { 'x-shopify-shop-domain': 'orders.myshopify.com' } },
    { source_name: 'web', id: 999 }
  );
  assert.equal(domain, 'orders.myshopify.com');
});

test('compliance webhooks: POST /webhooks/compliance rejects missing HMAC', async () => {
  const prev = process.env.SHOPIFY_API_SECRET;
  process.env.SHOPIFY_API_SECRET = 'compliance-test-secret';
  const app = createApp();
  try {
    const res = await request(app)
      .post('/webhooks/compliance')
      .set('Content-Type', 'application/json')
      .send('{"shop_domain":"example.myshopify.com"}');
    assert.equal(res.status, 401);
  } finally {
    process.env.SHOPIFY_API_SECRET = prev;
  }
});

test('compliance webhooks: valid HMAC accepted on /webhooks/compliance', async () => {
  const secret = 'compliance-test-secret-valid';
  const prev = process.env.SHOPIFY_API_SECRET;
  process.env.SHOPIFY_API_SECRET = secret;
  const app = createApp();
  const body = JSON.stringify({ shop_id: 1, shop_domain: 'example.myshopify.com' });
  const hmac = signShopifyWebhookBody(body, secret);

  try {
    const res = await request(app)
      .post('/webhooks/compliance')
      .set('Content-Type', 'application/json')
      .set('X-Shopify-Hmac-Sha256', hmac)
      .set('X-Shopify-Topic', 'shop/redact')
      .set('X-Shopify-Shop-Domain', 'example.myshopify.com')
      .send(body);
    assert.equal(res.status, 200);
  } finally {
    process.env.SHOPIFY_API_SECRET = prev;
  }
});

test('orders/conversion: POST /proxy/conversion rejects missing HMAC', async () => {
  const app = createApp();
  const res = await request(app)
    .post('/proxy/conversion')
    .set('Content-Type', 'application/json')
    .send(JSON.stringify({ id: 1, total_price: '10.00' }));
  assert.equal(res.status, 401);
});

test('storefront proxy GET /proxy/campaigns allows unsigned shop query (theme extension direct API)', async () => {
  const app = createApp();
  const res = await request(app).get('/proxy/campaigns?shop=unknown.myshopify.com');
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.campaigns));
});

test('admin merchants API: no Shopify collaborator — uses JWT auth middleware', async () => {
  const app = createApp();
  const res = await request(app).get('/api/merchants');
  assert.equal(res.status, 401);
});
