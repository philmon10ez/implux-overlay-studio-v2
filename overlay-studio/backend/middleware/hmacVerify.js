/**
 * Shopify App Proxy HMAC signature verification.
 * Uses PROXY_HMAC_SECRET to verify query/body signature from Shopify storefront.
 */
import crypto from 'crypto';

const PROXY_HMAC_SECRET = process.env.PROXY_HMAC_SECRET;

function getHmacString(req) {
  const query = { ...req.query };
  delete query.signature;
  delete query.hmac;
  const keys = Object.keys(query).sort();
  return keys.map((k) => `${k}=${query[k]}`).join('&');
}

function verifyHmac(hmac, message) {
  if (!PROXY_HMAC_SECRET) return false;
  const expected = crypto
    .createHmac('sha256', PROXY_HMAC_SECRET)
    .update(message)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(hmac, 'utf8'), Buffer.from(expected, 'utf8'));
}

/**
 * Middleware: verify HMAC on query string (GET) or body (POST).
 * GET: hmac in query params, message = sorted query string without hmac/signature.
 * POST: Shopify often sends X-Shopify-Hmac-Sha256 header; body = raw.
 */
export default function hmacVerify(req, res, next) {
  if (!PROXY_HMAC_SECRET) {
    return res.status(503).json({ error: 'Proxy HMAC not configured' });
  }

  if (req.method === 'GET') {
    const hmac = req.query.hmac ?? req.query.signature;
    if (!hmac) return res.status(400).json({ error: 'Missing hmac' });
    const message = getHmacString(req);
    if (!verifyHmac(hmac, message)) {
      return res.status(401).json({ error: 'Invalid HMAC' });
    }
    return next();
  }

  if (req.method === 'POST') {
    const hmac = req.headers['x-shopify-hmac-sha256'];
    if (!hmac) return res.status(400).json({ error: 'Missing X-Shopify-Hmac-Sha256' });
    const rawBody = req.rawBody
      ? (Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : String(req.rawBody))
      : JSON.stringify(req.body ?? {});
    if (!verifyHmac(hmac, rawBody)) {
      return res.status(401).json({ error: 'Invalid HMAC' });
    }
    return next();
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
