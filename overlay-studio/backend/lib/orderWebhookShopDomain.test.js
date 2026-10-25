import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveOrderWebhookShopDomain } from './orderWebhookShopDomain.js';

test('resolveOrderWebhookShopDomain prefers X-Shopify-Shop-Domain header', () => {
  const req = { headers: { 'x-shopify-shop-domain': 'store.myshopify.com' } };
  const body = { id: 1, source_name: 'web', shop_domain: 'ignored.myshopify.com' };
  assert.equal(resolveOrderWebhookShopDomain(req, body), 'store.myshopify.com');
});

test('resolveOrderWebhookShopDomain falls back to body.shop_domain', () => {
  const req = { headers: {} };
  assert.equal(
    resolveOrderWebhookShopDomain(req, { shop_domain: 'fallback.myshopify.com' }),
    'fallback.myshopify.com'
  );
});

test('resolveOrderWebhookShopDomain does not use source_name', () => {
  const req = { headers: {} };
  assert.equal(resolveOrderWebhookShopDomain(req, { source_name: 'web', id: 1 }), '');
});
