/**
 * Test live compliance webhook HMAC against api.implux.io
 *
 * Usage (PowerShell):
 *   cd overlay-studio/backend
 *   node scripts/test-compliance-webhook.mjs YOUR_CLIENT_SECRET
 *
 * Or:
 *   $env:SHOPIFY_API_SECRET="YOUR_CLIENT_SECRET"
 *   node scripts/test-compliance-webhook.mjs
 */
import crypto from 'crypto';

const secret = process.argv[2] || process.env.SHOPIFY_API_SECRET;
const url = process.env.COMPLIANCE_WEBHOOK_URL
  || 'https://api.implux.io/api/shopify/webhooks/compliance';

if (!secret) {
  console.error('Missing secret.');
  console.error('  node scripts/test-compliance-webhook.mjs YOUR_CLIENT_SECRET');
  process.exit(1);
}

const body = JSON.stringify({
  shop_id: 12345,
  shop_domain: 'test.myshopify.com',
});

const hmac = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');

console.log('URL:', url);
console.log('Body:', body);
console.log('HMAC:', hmac);
console.log('---');

async function post(label, headers) {
  const res = await fetch(url, { method: 'POST', headers, body });
  const text = await res.text();
  console.log(`${label}: HTTP ${res.status} ${res.statusText}`);
  if (text) console.log('Response:', text);
  return res.status;
}

console.log('Test 1: missing HMAC (expect 401)');
await post('missing HMAC', { 'Content-Type': 'application/json' });

console.log('\nTest 2: invalid HMAC (expect 401)');
await post('invalid HMAC', {
  'Content-Type': 'application/json',
  'X-Shopify-Hmac-Sha256': 'not-valid==',
  'X-Shopify-Topic': 'shop/redact',
});

console.log('\nTest 3: valid HMAC (expect 200)');
const ok = await post('valid HMAC', {
  'Content-Type': 'application/json',
  'X-Shopify-Hmac-Sha256': hmac,
  'X-Shopify-Topic': 'shop/redact',
  'X-Shopify-Shop-Domain': 'test.myshopify.com',
  'X-Shopify-Webhook-Id': `manual-test-${Date.now()}`,
});

console.log('\n---');
if (ok === 200) {
  console.log('PASS — backend accepts your secret. Press Run in Partner Dashboard.');
} else if (ok === 401) {
  console.log('FAIL — secret on Railway does NOT match Partner Dashboard client secret.');
  console.log('Copy secret from Shopify Dev Dashboard → Settings → Client secret (copy button).');
  console.log('Paste into Railway → implux-overlay-studio → SHOPIFY_API_SECRET → Redeploy.');
} else if (ok === 503) {
  console.log('FAIL — SHOPIFY_API_SECRET is not set on implux-overlay-studio backend.');
} else {
  console.log(`Unexpected status ${ok}. Check Railway deploy logs.`);
}

process.exit(ok === 200 ? 0 : 1);
