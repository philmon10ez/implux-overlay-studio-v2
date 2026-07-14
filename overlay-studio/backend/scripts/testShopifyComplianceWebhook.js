/**
 * Production verification: valid HMAC against live compliance webhook.
 *
 * Usage (PowerShell):
 *   cd overlay-studio/backend
 *   $env:SHOPIFY_API_SECRET = "<client secret from Shopify Dev Dashboard>"
 *   npm run test:shopify-compliance-live
 */
import crypto from 'crypto';
import { randomUUID } from 'crypto';

const secret = process.env.SHOPIFY_API_SECRET;
const url = process.env.COMPLIANCE_WEBHOOK_URL
  || 'https://api.implux.io/api/shopify/webhooks/compliance';

if (!secret) {
  console.error('SHOPIFY_API_SECRET is not set.');
  console.error('Set it in the environment, then rerun npm run test:shopify-compliance-live');
  process.exit(1);
}

const body = '{"shop_id":12345,"shop_domain":"test.myshopify.com"}';
const hmac = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
const webhookId = randomUUID();

const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Hmac-Sha256': hmac,
  'X-Shopify-Topic': 'shop/redact',
  'X-Shopify-Shop-Domain': 'test.myshopify.com',
  'X-Shopify-Webhook-Id': webhookId,
};

console.log('POST', url);
console.log('Topic: shop/redact');
console.log('Webhook-Id:', webhookId);

const res = await fetch(url, { method: 'POST', headers, body });
const text = await res.text();

console.log('HTTP status:', res.status, res.statusText);
if (text) console.log('Response body:', text);

if (res.status !== 200) {
  console.error('FAIL — expected HTTP 200 for valid HMAC');
  if (res.status === 401) {
    console.error('Railway SHOPIFY_API_SECRET does not match the Poptek by Implux client secret.');
  }
  process.exit(1);
}

console.log('PASS — live valid-HMAC compliance webhook returned 200');
