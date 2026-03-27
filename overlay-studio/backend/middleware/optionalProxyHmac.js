/**
 * If ?hmac= or ?signature= is present, verify with Shopify app proxy HMAC.
 * Otherwise allow the request (theme extension calls api.implux.io directly; cannot sign).
 */
import hmacVerify from './hmacVerify.js';

export default function optionalProxyHmac(req, res, next) {
  const hasSig = req.query.hmac ?? req.query.signature;
  if (hasSig) {
    return hmacVerify(req, res, next);
  }
  return next();
}
