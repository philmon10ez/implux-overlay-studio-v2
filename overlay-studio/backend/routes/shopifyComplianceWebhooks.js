/**
 * POST /api/shopify/webhooks/compliance
 * Shopify mandatory compliance webhooks (GDPR).
 */
import express from 'express';
import { verifyShopifyWebhookHmac } from '../services/shopifyWebhookHmac.js';
import {
  isComplianceTopic,
  isDuplicateWebhookDelivery,
  recordWebhookDelivery,
  queueComplianceProcessing,
} from '../services/shopifyComplianceService.js';

const router = express.Router();

function normalizeShopDomain(headerValue, bodyShopDomain) {
  const fromHeader = String(headerValue || '').trim();
  const fromBody = String(bodyShopDomain || '').trim();
  const value = fromHeader || fromBody;
  return value.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}

router.post('/', async (req, res) => {
  const rawBody = req.rawBody ?? req.body;
  const hmacHeader = req.headers['x-shopify-hmac-sha256'];
  const verification = verifyShopifyWebhookHmac(rawBody, hmacHeader);

  if (!verification.ok) {
    if (verification.reason === 'misconfigured') {
      console.error('[shopify-compliance] SHOPIFY_API_SECRET is not configured');
      return res.sendStatus(503);
    }
    return res.sendStatus(401);
  }

  let payload = {};
  try {
    const text = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : String(rawBody ?? '');
    payload = text.trim() ? JSON.parse(text) : {};
  } catch {
    return res.sendStatus(400);
  }

  const topic = String(req.headers['x-shopify-topic'] || '').trim();
  const webhookId = String(req.headers['x-shopify-webhook-id'] || '').trim();
  const shopDomain = normalizeShopDomain(req.headers['x-shopify-shop-domain'], payload?.shop_domain);

  console.log('[shopify-compliance]', JSON.stringify({ topic: topic || '(none)', shopDomain, webhookId }));

  if (topic && isComplianceTopic(topic)) {
    if (webhookId && (await isDuplicateWebhookDelivery(webhookId))) {
      return res.sendStatus(200);
    }

    if (webhookId) {
      const recorded = await recordWebhookDelivery(webhookId, topic, shopDomain);
      if (!recorded) {
        return res.sendStatus(200);
      }
    }

    queueComplianceProcessing(topic, payload);
  } else if (topic) {
    console.warn('[shopify-compliance]', JSON.stringify({ topic, shopDomain, webhookId, note: 'non_compliance_topic_acknowledged' }));
  }

  return res.sendStatus(200);
});

export default router;
