/**
 * Shopify compliance webhook endpoint + HMAC verification tests.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../app.js';
import {
  verifyShopifyWebhookHmac,
  signShopifyWebhookBody,
} from '../services/shopifyWebhookHmac.js';

const TEST_SECRET = 'test-shopify-api-secret-for-hmac';
const ENDPOINT = '/api/shopify/webhooks/compliance';

const COMPLIANCE_TOPICS = [
  'customers/data_request',
  'customers/redact',
  'shop/redact',
];

function compliancePayload(topic) {
  const base = {
    shop_id: 12345,
    shop_domain: 'example.myshopify.com',
  };
  if (topic === 'customers/data_request') {
    return {
      ...base,
      customer: { id: 1, email: 'customer@example.com', phone: '+15551234567' },
      orders_requested: [1001],
    };
  }
  if (topic === 'customers/redact') {
    return {
      ...base,
      customer: { id: 1, email: 'customer@example.com', phone: '+15551234567' },
      orders_to_redact: [1001],
    };
  }
  return base;
}

function postCompliance(app, rawBody, headers = {}) {
  return request(app)
    .post(ENDPOINT)
    .set('Content-Type', 'application/json')
    .set(headers)
    .send(rawBody);
}

test('verifyShopifyWebhookHmac unit checks', () => {
  const prev = process.env.SHOPIFY_API_SECRET;
  process.env.SHOPIFY_API_SECRET = TEST_SECRET;
  try {
    const missing = verifyShopifyWebhookHmac('{}', undefined);
    assert.equal(missing.ok, false);
    assert.equal(missing.reason, 'missing');

    const malformed = verifyShopifyWebhookHmac('{}', '!!!');
    assert.equal(malformed.ok, false);
    assert.ok(['malformed', 'mismatch'].includes(malformed.reason));
  } finally {
    process.env.SHOPIFY_API_SECRET = prev;
  }
});

test('compliance webhooks HTTP suite', async (t) => {
  const prev = process.env.SHOPIFY_API_SECRET;
  process.env.SHOPIFY_API_SECRET = TEST_SECRET;
  const app = createApp();

  try {
    await t.test('valid HMAC returns 200', async () => {
      const rawBody = JSON.stringify(compliancePayload('shop/redact'));
      const hmac = signShopifyWebhookBody(rawBody, TEST_SECRET);
      const res = await postCompliance(app, rawBody, {
        'X-Shopify-Hmac-Sha256': hmac,
        'X-Shopify-Topic': 'shop/redact',
        'X-Shopify-Shop-Domain': 'example.myshopify.com',
        'X-Shopify-Webhook-Id': `test-valid-${Date.now()}`,
      });
      assert.equal(res.status, 200);
    });

    await t.test('invalid HMAC returns 401', async () => {
      const rawBody = JSON.stringify(compliancePayload('shop/redact'));
      const res = await postCompliance(app, rawBody, {
        'X-Shopify-Hmac-Sha256': 'invalidsignature==',
        'X-Shopify-Topic': 'shop/redact',
        'X-Shopify-Shop-Domain': 'example.myshopify.com',
      });
      assert.equal(res.status, 401);
    });

    await t.test('missing HMAC returns 401', async () => {
      const rawBody = JSON.stringify(compliancePayload('shop/redact'));
      const res = await postCompliance(app, rawBody, {
        'X-Shopify-Topic': 'shop/redact',
        'X-Shopify-Shop-Domain': 'example.myshopify.com',
      });
      assert.equal(res.status, 401);
    });

    await t.test('all three compliance topics are accepted', async () => {
      for (const topic of COMPLIANCE_TOPICS) {
        const rawBody = JSON.stringify(compliancePayload(topic));
        const hmac = signShopifyWebhookBody(rawBody, TEST_SECRET);
        const res = await postCompliance(app, rawBody, {
          'X-Shopify-Hmac-Sha256': hmac,
          'X-Shopify-Topic': topic,
          'X-Shopify-Shop-Domain': 'example.myshopify.com',
          'X-Shopify-Webhook-Id': `test-topic-${topic}-${Date.now()}`,
        });
        assert.equal(res.status, 200, `expected 200 for topic ${topic}, got ${res.status}`);
      }
    });

    await t.test('HMAC is calculated from raw body, not re-stringified JSON', async () => {
      const canonical = { shop_id: 99, shop_domain: 'raw-body.myshopify.com' };
      const prettyRawBody = `${JSON.stringify(canonical, null, 2)}\n`;
      const compactBody = JSON.stringify(canonical);
      assert.notEqual(prettyRawBody, compactBody);

      const hmacFromRaw = signShopifyWebhookBody(prettyRawBody, TEST_SECRET);
      const hmacFromCompact = signShopifyWebhookBody(compactBody, TEST_SECRET);
      assert.notEqual(hmacFromRaw, hmacFromCompact);

      const ok = await postCompliance(app, prettyRawBody, {
        'X-Shopify-Hmac-Sha256': hmacFromRaw,
        'X-Shopify-Topic': 'shop/redact',
        'X-Shopify-Shop-Domain': 'raw-body.myshopify.com',
        'X-Shopify-Webhook-Id': `test-raw-body-${Date.now()}`,
      });
      assert.equal(ok.status, 200);

      const bad = await postCompliance(app, prettyRawBody, {
        'X-Shopify-Hmac-Sha256': hmacFromCompact,
        'X-Shopify-Topic': 'shop/redact',
        'X-Shopify-Shop-Domain': 'raw-body.myshopify.com',
      });
      assert.equal(bad.status, 401);
    });
  } finally {
    process.env.SHOPIFY_API_SECRET = prev;
  }
});
