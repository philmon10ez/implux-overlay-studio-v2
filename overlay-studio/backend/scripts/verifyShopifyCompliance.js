/**
 * End-to-end Shopify App Store compliance verification.
 *
 * 1. Verifies mandatory compliance_topics in the linked shopify.app.implux.toml
 * 2. POSTs invalid HMAC to live endpoint → expects HTTP 401
 * 3. POSTs valid HMAC to live endpoint → expects HTTP 200
 *
 * Usage (PowerShell):
 *   cd overlay-studio/backend
 *   $env:SHOPIFY_API_SECRET = "<client secret from Dev Dashboard → Credentials>"
 *   npm run verify-shopify-compliance
 */
import crypto from 'crypto';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPLUX_TOML = path.resolve(__dirname, '../../shopify-app/shopify.app.implux.toml');
const FALLBACK_TOML = path.resolve(__dirname, '../../shopify-app/shopify.app.toml');

const REQUIRED_TOPICS = [
  'customers/data_request',
  'customers/redact',
  'shop/redact',
];

const WEBHOOK_URL = process.env.COMPLIANCE_WEBHOOK_URL
  || 'https://api.implux.io/api/shopify/webhooks/compliance';

function fail(message) {
  console.error(`FAIL — ${message}`);
  process.exit(1);
}

function pass(message) {
  console.log(`PASS — ${message}`);
}

function readToml() {
  const tomlPath = fs.existsSync(IMPLUX_TOML) ? IMPLUX_TOML : FALLBACK_TOML;
  if (!fs.existsSync(tomlPath)) {
    fail(`No shopify app TOML found at ${IMPLUX_TOML} or ${FALLBACK_TOML}`);
  }
  return { tomlPath, content: fs.readFileSync(tomlPath, 'utf8') };
}

function verifyTomlComplianceTopics(content, tomlPath) {
  console.log(`\n=== TOML: ${tomlPath} ===`);

  const hasWebhooksSection = /\[webhooks\]/.test(content);
  const hasComplianceBlock = /compliance_topics\s*=/.test(content);
  if (!hasWebhooksSection || !hasComplianceBlock) {
    fail('TOML is missing [webhooks] compliance_topics subscription');
  }
  pass('TOML contains [webhooks] with compliance_topics');

  const topicMatches = [...content.matchAll(/compliance_topics\s*=\s*\[([^\]]*)\]/g)];
  if (topicMatches.length === 0) {
    fail('no [[webhooks.subscriptions]] block with compliance_topics found');
  }

  const declared = new Set();
  for (const match of topicMatches) {
    const inner = match[1];
    for (const raw of inner.split(',')) {
      const topic = raw.replace(/["'\s]/g, '');
      if (topic) declared.add(topic);
    }
  }

  const missing = REQUIRED_TOPICS.filter((t) => !declared.has(t));
  if (missing.length > 0) {
    fail(`compliance_topics missing: ${missing.join(', ')}`);
  }
  pass(`all three compliance_topics declared: ${REQUIRED_TOPICS.join(', ')}`);

  const uriMatch = content.match(/uri\s*=\s*"([^"]+)"/);
  if (!uriMatch) {
    fail('no webhook uri found in TOML');
  }
  const tomlUri = uriMatch[1];
  console.log(`TOML webhook uri: ${tomlUri}`);
  if (tomlUri !== WEBHOOK_URL) {
    console.warn(
      `WARN — COMPLIANCE_WEBHOOK_URL (${WEBHOOK_URL}) differs from TOML uri (${tomlUri})`
    );
  }
}

async function postWebhook(hmac, label) {
  const body = '{"shop_id":12345,"shop_domain":"test.myshopify.com"}';
  const headers = {
    'Content-Type': 'application/json',
    'X-Shopify-Hmac-Sha256': hmac,
    'X-Shopify-Topic': 'shop/redact',
    'X-Shopify-Shop-Domain': 'test.myshopify.com',
    'X-Shopify-Webhook-Id': randomUUID(),
  };

  console.log(`\n=== LIVE: ${label} ===`);
  console.log('POST', WEBHOOK_URL);

  const res = await fetch(WEBHOOK_URL, { method: 'POST', headers, body });
  const text = await res.text();
  console.log('HTTP status:', res.status, res.statusText);
  if (text) console.log('Response body:', text);
  return res.status;
}

async function main() {
  const { content, tomlPath } = readToml();
  verifyTomlComplianceTopics(content, tomlPath);

  const invalidStatus = await postWebhook('invalid-hmac-signature==', 'invalid HMAC (expect 401)');
  if (invalidStatus !== 401) {
    fail(`invalid HMAC expected HTTP 401, got ${invalidStatus}`);
  }
  pass('invalid HMAC returned HTTP 401');

  const secret = process.env.SHOPIFY_API_SECRET;
  if (!secret) {
    fail(
      'SHOPIFY_API_SECRET is not set — cannot run valid-HMAC test. '
      + 'Set it to the Client secret from Dev Dashboard → Settings → Credentials.'
    );
  }

  const body = '{"shop_id":12345,"shop_domain":"test.myshopify.com"}';
  const validHmac = crypto.createHmac('sha256', secret).update(body, 'utf8').digest('base64');
  const validStatus = await postWebhook(validHmac, 'valid HMAC (expect 200)');
  if (validStatus !== 200) {
    if (validStatus === 401) {
      fail(
        'valid HMAC returned HTTP 401 — Railway SHOPIFY_API_SECRET does not match '
        + 'the Poptek by Implux client secret in Dev Dashboard'
      );
    }
    fail(`valid HMAC expected HTTP 200, got ${validStatus}`);
  }
  pass('valid HMAC returned HTTP 200');

  console.log('\nAll Shopify compliance checks passed locally.');
  console.log(
    'Next: run `cd ../shopify-app && npm run deploy` to register webhooks, '
    + 'then click Run on Partner Dashboard → Distribution → Automated checks.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
