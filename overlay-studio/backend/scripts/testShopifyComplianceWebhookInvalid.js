/**
 * Production verification: invalid HMAC must be rejected with 401.
 *
 * Usage (PowerShell):
 *   cd overlay-studio/backend
 *   npm run test:shopify-compliance-live-invalid
 */
import { randomUUID } from 'crypto';

const url = process.env.COMPLIANCE_WEBHOOK_URL
  || 'https://api.implux.io/api/shopify/webhooks/compliance';

const body = '{"shop_id":12345,"shop_domain":"test.myshopify.com"}';

const headers = {
  'Content-Type': 'application/json',
  'X-Shopify-Hmac-Sha256': 'invalid-hmac-signature==',
  'X-Shopify-Topic': 'shop/redact',
  'X-Shopify-Shop-Domain': 'test.myshopify.com',
  'X-Shopify-Webhook-Id': randomUUID(),
};

console.log('POST', url);
console.log('Expect: HTTP 401 for invalid HMAC');

const res = await fetch(url, { method: 'POST', headers, body });
const text = await res.text();

console.log('HTTP status:', res.status, res.statusText);
if (text) console.log('Response body:', text);

if (res.status !== 401) {
  console.error(`FAIL — expected HTTP 401, got ${res.status}`);
  process.exit(1);
}

console.log('PASS — live invalid-HMAC compliance webhook returned 401');
