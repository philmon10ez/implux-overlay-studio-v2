/**
 * Storefront trust boundary.
 * A valid Shopify app-proxy signature binds the request to the signed shop.
 * Missing signatures are allowed only while STOREFRONT_AUTH_MODE=compat (the default),
 * so the theme extension that is already published keeps rendering.
 * An invalid signature is rejected in every mode.
 */
import {
  authorizeStorefrontRequest,
  claimedShopMatches,
} from '../../shared/storefrontProxyAuth.js';

export default function storefrontProxyAuth(req, res, next) {
  const decision = authorizeStorefrontRequest({ query: req.query, env: process.env });
  if (!decision.ok) {
    const error =
      decision.status === 400
        ? 'shop required'
        : decision.status === 503
          ? 'Storefront authentication is not configured'
          : 'Unauthorized';
    return res.status(decision.status).json({ error });
  }
  const claimed = req.body?.shop;
  if (decision.signed && !claimedShopMatches(decision.shop, claimed)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.storefrontShop = decision.shop;
  req.storefrontSigned = decision.signed;
  return next();
}
