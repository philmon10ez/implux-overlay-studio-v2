/**
 * Shopify: webhook HMAC verification; push campaign to store (placeholder).
 */
import { verifyShopifyWebhookHmac } from './shopifyWebhookHmac.js';

/**
 * Validate Shopify webhook HMAC using raw body.
 * @param {object} req - Express request; req.rawBody (Buffer) or req.body used for digest.
 */
export function verifyWebhook(req) {
  const hmac = req.headers['x-shopify-hmac-sha256'];
  const raw =
    req.rawBody != null
      ? (Buffer.isBuffer(req.rawBody) ? req.rawBody : Buffer.from(String(req.rawBody)))
      : Buffer.from(JSON.stringify(req.body ?? {}), 'utf8');
  const result = verifyShopifyWebhookHmac(raw, hmac);
  return result.ok;
}

/**
 * Placeholder: future direct push of campaign config to merchant store (e.g. Theme App Extension or Script).
 */
export async function pushCampaignToStore(merchant, campaign) {
  // TODO: integrate with Shopify Admin API or Theme App Extension to inject overlay config
  // e.g. create/update a metafield or app proxy config for this merchant
  return Promise.resolve();
}
