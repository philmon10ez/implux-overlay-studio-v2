/**
 * Resolve shop domain from Shopify orders/create webhook (not app collaborator access).
 * Prefer X-Shopify-Shop-Domain; do not use order source_name (e.g. "web") as the shop.
 */

export function resolveOrderWebhookShopDomain(req, body = {}) {
  const header = String(req.headers['x-shopify-shop-domain'] || req.headers['X-Shopify-Shop-Domain'] || '').trim();
  if (header) {
    return header
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];
  }

  const fromBody = body.shop_domain ?? body.domain ?? body.myshopify_domain;
  if (fromBody) {
    return String(fromBody)
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .split('/')[0];
  }

  return '';
}
