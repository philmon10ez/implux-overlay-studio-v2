import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCustomerDataInventory,
  canonicalShopDomain,
  redactCustomerOrders,
  redactShopData,
} from '../services/shopifyComplianceService.js';
import { attributeOrderConversion } from '../services/orderConversion.js';
import { verifyWebhook } from '../services/shopifyService.js';
import { signShopifyWebhookBody } from '../services/shopifyWebhookHmac.js';

function shopDb() {
  const events = [
    { id: 1, shopDomain: 'alpha.myshopify.com', orderId: '1001', orderValue: 10, campaignId: 1 },
    { id: 2, shopDomain: 'https://alpha.myshopify.com', orderId: '1002', orderValue: 12, campaignId: 1 },
    { id: 3, shopDomain: 'beta.myshopify.com', orderId: '1001', orderValue: 40, campaignId: 2 },
  ];
  const merchants = [
    { id: 1, shopifyDomain: 'alpha.myshopify.com', accessToken: 'alpha-token', storeName: 'Alpha' },
    { id: 2, shopifyDomain: 'beta.myshopify.com', accessToken: 'beta-token', storeName: 'Beta' },
  ];
  const sql = [];
  return {
    events,
    merchants,
    sql,
    db: {
      campaignEvent: {
        findMany: async ({ where }) =>
          events.filter(
            (event) =>
              where.shopDomain.in.includes(event.shopDomain) &&
              (!where.orderId || where.orderId.in.includes(event.orderId))
          ),
        updateMany: async ({ where, data }) => {
          let count = 0;
          for (const event of events) {
            if (!where.shopDomain.in.includes(event.shopDomain)) continue;
            if (!where.orderId.in.includes(event.orderId)) continue;
            Object.assign(event, data);
            count += 1;
          }
          return { count };
        },
        deleteMany: async ({ where }) => {
          const before = events.length;
          for (let i = events.length - 1; i >= 0; i -= 1) {
            if (where.shopDomain.in.includes(events[i].shopDomain)) events.splice(i, 1);
          }
          return { count: before - events.length };
        },
        create: async ({ data }) => {
          events.push(data);
          return data;
        },
      },
      campaign: {
        deleteMany: async () => ({ count: 0 }),
        findFirst: async () => ({ id: 9, merchantId: 1, status: 'active' }),
        update: async () => ({}),
      },
      recommendationSetProduct: { deleteMany: async () => ({ count: 0 }) },
      recommendationSet: { deleteMany: async () => ({ count: 0 }) },
      product: { deleteMany: async () => ({ count: 0 }) },
      merchant: {
        findUnique: async ({ where }) =>
          merchants.find((merchant) => merchant.shopifyDomain === where.shopifyDomain) || null,
        findFirst: async () => merchants[0],
        update: async ({ where, data }) => {
          const merchant = merchants.find((item) => item.id === where.id);
          Object.assign(merchant, data);
          return merchant;
        },
      },
      shopifyWebhookDelivery: {
        create: async ({ data }) => {
          if (sql.includes(data.id)) {
            const error = new Error('duplicate');
            error.code = 'P2002';
            throw error;
          }
          sql.push(data.id);
          return data;
        },
      },
      $executeRaw: async (strings) => {
        sql.push(String(strings[0]));
        return 1;
      },
    },
  };
}

test('customer redact clears only the named shop and order', async () => {
  const { db, events } = shopDb();
  const result = await redactCustomerOrders(db, 'https://Alpha.myshopify.com/', ['1001']);
  assert.equal(result.updated, 1);
  assert.equal(events.find((event) => event.id === 1).orderId, null);
  assert.equal(events.find((event) => event.id === 3).orderId, '1001');
});

test('shop redact does not blank another merchant token', async () => {
  const { db, merchants, sql } = shopDb();
  const result = await redactShopData(db, 'alpha.myshopify.com');
  assert.equal(result.found, true);
  assert.equal(merchants[0].accessToken, '');
  assert.equal(merchants[0].storeName, 'Redacted');
  assert.equal(merchants[1].accessToken, 'beta-token');
  assert.ok(sql.some((statement) => statement.includes('Session')));
  assert.ok(sql.some((statement) => statement.includes('OverlaySubmission')));
});

test('invalid shop redact does not run deletes', async () => {
  const { db, sql, merchants } = shopDb();
  const result = await redactShopData(db, 'not a shop');
  assert.equal(result.found, false);
  assert.equal(sql.length, 0);
  assert.equal(merchants[0].accessToken, 'alpha-token');
  assert.equal(canonicalShopDomain('not a shop'), '');
});

test('data request inventory omits customer contact fields and stays shop scoped', async () => {
  const { db } = shopDb();
  const inventory = await buildCustomerDataInventory(db, 'alpha.myshopify.com', [1001, 1002]);
  assert.deepEqual(inventory.orderIds.sort(), ['1001', '1002']);
  assert.equal(inventory.shopDomain, 'alpha.myshopify.com');
  assert.equal('email' in inventory, false);
});

test('order conversion is idempotent for the same shop and order', async () => {
  const { db } = shopDb();
  const first = await attributeOrderConversion(db, {
    shopDomain: 'alpha.myshopify.com',
    orderId: '55',
    total: 12,
  });
  const second = await attributeOrderConversion(db, {
    shopDomain: 'alpha.myshopify.com',
    orderId: '55',
    total: 12,
  });
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);
});

test('order webhook rejects a re-serialized body and accepts the raw body', () => {
  const secret = 'order-webhook-secret';
  const previous = process.env.SHOPIFY_API_SECRET;
  process.env.SHOPIFY_API_SECRET = secret;
  const raw = Buffer.from('{"id":55,"total_price":"12.00"}', 'utf8');
  const hmac = signShopifyWebhookBody(raw, secret);
  try {
    assert.equal(verifyWebhook({ headers: { 'x-shopify-hmac-sha256': hmac }, body: raw }), true);
    assert.equal(
      verifyWebhook({
        headers: { 'x-shopify-hmac-sha256': hmac },
        body: { id: 55, total_price: '12.00' },
      }),
      false
    );
  } finally {
    if (previous === undefined) delete process.env.SHOPIFY_API_SECRET;
    else process.env.SHOPIFY_API_SECRET = previous;
  }
});
