/**
 * Shopify: webhook HMAC verification; push campaign to store (placeholder).
 */
import { verifyShopifyWebhookHmac } from './shopifyWebhookHmac.js';

/**
 * Validate Shopify webhook HMAC using the exact raw request bytes.
 * A re-serialized JSON body is not accepted.
 * @param {object} req
 */
export function verifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const raw = Buffer.isBuffer(req.body)
    ? req.body
    : Buffer.isBuffer(req.rawBody)
      ? req.rawBody
      : null;
  if (!raw) return false;
  return verifyShopifyWebhookHmac(raw, hmac).ok;
}

/**
 * Placeholder: future direct push of campaign config to merchant store (e.g. Theme App Extension or Script).
 */
export async function pushCampaignToStore(merchant, campaign) {
  // TODO: integrate with Shopify Admin API or Theme App Extension to inject overlay config
  // e.g. create/update a metafield or app proxy config for this merchant
  return Promise.resolve();
}
