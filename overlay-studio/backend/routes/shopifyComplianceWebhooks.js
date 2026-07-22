/**
 * POST /webhooks/compliance
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

function complianceDebugEnabled() {
  const v = String(process.env.COMPLIANCE_WEBHOOK_DEBUG || '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Temporary diagnostics — enable with COMPLIANCE_WEBHOOK_DEBUG=true on Railway. Never logs secrets. */
function logComplianceDebug(req, res, extra = {}) {
  if (!complianceDebugEnabled()) return;
  const bodyPreview = Buffer.isBuffer(req.body)
    ? req.body.toString('utf8').slice(0, 500)
    : String(req.body ?? '').slice(0, 500);
  safeComplianceRequestLog({
    event: 'debug_trace',
    method: req.method,
    url: req.originalUrl || req.url,
    headers: {
      'content-type': req.get('content-type') || '',
      'x-shopify-topic': req.get('X-Shopify-Topic') || '',
      'x-shopify-shop-domain': req.get('X-Shopify-Shop-Domain') || '',
      'x-shopify-webhook-id': req.get('X-Shopify-Webhook-Id') || '',
      'x-shopify-hmac-sha256-present': Boolean(req.get('X-Shopify-Hmac-Sha256')),
      'user-agent': req.get('user-agent') || '',
    },
    bodyPreview,
    bodyIsBuffer: Buffer.isBuffer(req.body),
    bodyLength: Buffer.isBuffer(req.body) ? req.body.length : 0,
    ...extra,
  });
}

function parsePayload(rawBody) {
  const text = rawBody.toString('utf8').trim();
  if (!text) return { ok: true, payload: {} };
  try {
    return { ok: true, payload: JSON.parse(text) };
  } catch {
    return { ok: false, payload: null };
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
  if (req.method !== 'POST') {
    return res.sendStatus(405);
  }

  const routePath = req.originalUrl || req.path;
  const contentType = req.get('content-type') || '';
  const bodyIsBuffer = Buffer.isBuffer(req.body);
  const rawBodyLength = bodyIsBuffer ? req.body.length : 0;
  const hmacHeader = req.get('X-Shopify-Hmac-Sha256');
  const topic = String(req.get('X-Shopify-Topic') || '').trim();
  const webhookId = String(req.get('X-Shopify-Webhook-Id') || '').trim();
  const headerShopDomain = String(req.get('X-Shopify-Shop-Domain') || '').trim();

  logComplianceDebug(req, res, { phase: 'request_start' });

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
    logComplianceDebug(req, res, { phase: 'response', httpStatus: 401, hmacResult: verification.reason });
    return res.sendStatus(401);
  }

  const parsed = parsePayload(req.body);
  if (!parsed.ok) {
    safeComplianceRequestLog({
      event: 'invalid_json',
      routePath,
      topic: topic || '(none)',
      status: 400,
    });
    return res.sendStatus(400);
  }

  const payload = parsed.payload;
  const shopDomain = normalizeShopDomain(headerShopDomain, payload?.shop_domain);

  safeComplianceRequestLog({
    event: 'webhook_accepted',
    routePath,
    topic: topic || '(none)',
    shopDomain: shopDomain || '(none)',
    webhookId: webhookId || '(none)',
    status: 200,
  });

  logComplianceDebug(req, res, { phase: 'response', httpStatus: 200, hmacResult: 'valid' });
  res.sendStatus(200);

  setImmediate(() => {
    deferComplianceWork(topic, payload, webhookId, shopDomain);
  });
}

/**
 * Trusted forward from shopify-app after Remix HMAC verification.
 * POST /api/shopify/webhooks/compliance/internal
 */
export async function complianceInternalForwardHandler(req, res) {
  const expected = process.env.MERCHANT_SYNC_SECRET;
  if (!expected) {
    return res.sendStatus(503);
  }
  const sent = req.get('x-implux-compliance-forward-secret') || '';
  if (sent !== expected) {
    return res.sendStatus(401);
  }

  const topic = String(req.body?.topic || '').trim();
  const webhookId = String(req.body?.webhookId || '').trim();
  const shopDomain = normalizeShopDomain(req.body?.shopDomain, req.body?.payload?.shop_domain);
  const payload = req.body?.payload && typeof req.body.payload === 'object' ? req.body.payload : {};

  if (!isComplianceTopic(topic)) {
    return res.sendStatus(400);
  }

  safeComplianceRequestLog({
    event: 'internal_forward_received',
    topic,
    shopDomain: shopDomain || '(none)',
    webhookId: webhookId || '(none)',
  });

  res.sendStatus(200);
  setImmediate(() => {
    deferComplianceWork(topic, payload, webhookId, shopDomain);
  });
}

export default complianceWebhookHandler;
