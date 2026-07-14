/**
 * POST /api/shopify/webhooks/compliance
 * Shopify mandatory compliance webhooks (GDPR).
 */
import { verifyShopifyWebhookHmac } from '../services/shopifyWebhookHmac.js';
import {
  isComplianceTopic,
  isDuplicateWebhookDelivery,
  recordWebhookDelivery,
  queueComplianceProcessing,
} from '../services/shopifyComplianceService.js';

function normalizeShopDomain(headerValue, bodyShopDomain) {
  const fromHeader = String(headerValue || '').trim();
  const fromBody = String(bodyShopDomain || '').trim();
  const value = fromHeader || fromBody;
  return value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

function safeComplianceRequestLog(fields) {
  console.log('[shopify-compliance]', JSON.stringify(fields));
}

function parsePayload(rawBody) {
  try {
    const text = rawBody.toString('utf8').trim();
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

async function deferComplianceWork(topic, payload, webhookId, shopDomain) {
  if (!topic || !isComplianceTopic(topic)) {
    if (topic) {
      safeComplianceRequestLog({
        event: 'deferred_non_compliance_topic',
        topic,
        shopDomain,
        webhookId,
      });
    }
    return;
  }

  try {
    if (webhookId && (await isDuplicateWebhookDelivery(webhookId))) {
      safeComplianceRequestLog({
        event: 'duplicate_delivery_skipped',
        topic,
        shopDomain,
        webhookId,
      });
      return;
    }

    if (webhookId) {
      const recorded = await recordWebhookDelivery(webhookId, topic, shopDomain);
      if (!recorded) {
        safeComplianceRequestLog({
          event: 'duplicate_delivery_race',
          topic,
          shopDomain,
          webhookId,
        });
        return;
      }
    }

    queueComplianceProcessing(topic, payload);
  } catch (err) {
    console.error('[shopify-compliance] deferred work failed', {
      topic,
      shopDomain,
      webhookId,
      error: err?.message ?? 'unknown',
    });
  }
}

/**
 * Express handler — must be mounted with express.raw({ type: 'application/json' })
 * before express.json() so req.body remains the exact raw bytes.
 */
export async function complianceWebhookHandler(req, res) {
  const routePath = req.originalUrl || req.path;
  const contentType = req.get('content-type') || '';
  const bodyIsBuffer = Buffer.isBuffer(req.body);
  const rawBodyLength = bodyIsBuffer ? req.body.length : 0;
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const topic = String(req.get('X-Shopify-Topic') || '').trim();
  const webhookId = String(req.get('X-Shopify-Webhook-Id') || '').trim();
  const headerShopDomain = String(req.get('X-Shopify-Shop-Domain') || '').trim();

  safeComplianceRequestLog({
    event: 'request_received',
    routePath,
    contentType,
    bodyIsBuffer,
    rawBodyLength,
    hmacHeaderPresent: Boolean(hmacHeader),
    topic: topic || '(none)',
    shopDomain: headerShopDomain || '(none)',
    webhookId: webhookId || '(none)',
  });

  const verification = verifyShopifyWebhookHmac(req.body, hmacHeader);
  if (!verification.ok) {
    safeComplianceRequestLog({
      event: 'hmac_rejected',
      routePath,
      hmacResult: verification.reason,
      status: 401,
    });
    return res.sendStatus(401);
  }

  const payload = parsePayload(req.body);
  const shopDomain = normalizeShopDomain(headerShopDomain, payload?.shop_domain);

  safeComplianceRequestLog({
    event: 'hmac_valid',
    routePath,
    hmacResult: 'valid',
    topic: topic || '(none)',
    shopDomain: shopDomain || '(none)',
    webhookId: webhookId || '(none)',
    status: 200,
  });

  res.sendStatus(200);

  setImmediate(() => {
    deferComplianceWork(topic, payload, webhookId, shopDomain);
  });
}

export default complianceWebhookHandler;
