import { authenticate } from '../shopify.server.js';

const COMPLIANCE_TOPICS = new Set([
  'CUSTOMERS_DATA_REQUEST',
  'CUSTOMERS_REDACT',
  'SHOP_REDACT',
]);

const TOPIC_TO_API = {
  CUSTOMERS_DATA_REQUEST: 'customers/data_request',
  CUSTOMERS_REDACT: 'customers/redact',
  SHOP_REDACT: 'shop/redact',
};

function safeComplianceLog(fields) {
  console.log('[shopify-compliance]', JSON.stringify(fields));
}

function forwardToBackend(topic, shop, payload, webhookId) {
  const backendUrl = (process.env.IMPLUX_BACKEND_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');
  const secret = process.env.MERCHANT_SYNC_SECRET;
  const apiTopic = TOPIC_TO_API[topic];
  if (!backendUrl || !secret || !apiTopic) return;

  fetch(`${backendUrl}/api/shopify/webhooks/compliance/internal`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-implux-compliance-forward-secret': secret,
    },
    body: JSON.stringify({
      topic: apiTopic,
      shopDomain: shop,
      webhookId,
      payload,
    }),
  }).catch((err) => {
    console.error('[shopify-compliance] backend forward failed', err?.message || err);
  });
}

/**
 * Mandatory GDPR compliance webhooks — Shopify automated checks POST here
 * (application_url + /webhooks/compliance). HMAC verified by authenticate.webhook.
 */
export const action = async ({ request }) => {
  const { topic, shop, payload, webhookId } = await authenticate.webhook(request);

  if (!COMPLIANCE_TOPICS.has(topic)) {
    safeComplianceLog({
      event: 'ignored_non_compliance_topic',
      topic,
      shopDomain: shop || '(none)',
      webhookId: webhookId || '(none)',
    });
    return new Response(null, { status: 200 });
  }

  safeComplianceLog({
    event: 'hmac_valid',
    routePath: '/webhooks/compliance',
    hmacResult: 'valid',
    topic: topic || '(none)',
    shopDomain: shop || '(none)',
    webhookId: webhookId || '(none)',
    status: 200,
  });

  forwardToBackend(topic, shop, payload, webhookId);

  return new Response(null, { status: 200 });
};
