/**
 * Shopify: webhook HMAC verification; push campaign to store (placeholder).
 */
import crypto from 'crypto';

const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET;

/**
 * Validate Shopify webhook HMAC using raw body.
 * @param {object} req - Express request; req.rawBody (Buffer) or req.body used for digest.
 */
export function verifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  if (!hmac || !SHOPIFY_API_SECRET) return false;
  const raw =
    req.rawBody != null
      ? (Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody)))
      : Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
  const expected = crypto.createHmac('sha256', SHOPIFY_API_SECRET).update(raw).digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hmac, 'base64'), expected);
}

/**
 * Placeholder: future direct push of campaign config to merchant store (e.g. Theme App Extension or Script).
 */
export async function pushCampaignToStore(merchant, campaign) {
  // TODO: integrate with Shopify Admin API or Theme App Extension to inject overlay config
  // e.g. create/update a metafield or app proxy config for this merchant
  return Promise.resolve();
}
