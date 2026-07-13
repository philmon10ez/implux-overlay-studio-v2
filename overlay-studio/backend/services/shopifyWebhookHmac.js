/**
 * Shopify webhook HMAC-SHA256 verification (raw body + X-Shopify-Hmac-Sha256).
 */
import crypto from 'crypto';

function getShopifyApiSecret() {
  return process.env.SHOPIFY_API_SECRET;
}

/**
 * @param {Buffer|string|null|undefined} rawBody
 * @param {string|undefined|null} hmacHeader
 * @returns {{ ok: true } | { ok: false, reason: 'missing' | 'malformed' | 'mismatch' | 'misconfigured' }}
 */
export function verifyShopifyWebhookHmac(rawBody, hmacHeader) {
  const secret = getShopifyApiSecret();
  if (!secret) {
    return { ok: false, reason: 'misconfigured' };
  }
  if (hmacHeader == null || typeof hmacHeader !== 'string' || !hmacHeader.trim()) {
    return { ok: false, reason: 'missing' };
  }

  const raw = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(rawBody == null ? '' : String(rawBody), 'utf8');

  let received;
  try {
    received = Buffer.from(hmacHeader.trim(), 'base64');
    if (received.length === 0) {
      return { ok: false, reason: 'malformed' };
    }
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  const expected = crypto.createHmac('sha256', secret).update(raw).digest();

  if (received.length !== expected.length) {
    return { ok: false, reason: 'mismatch' };
  }

  try {
    if (!crypto.timingSafeEqual(received, expected)) {
      return { ok: false, reason: 'mismatch' };
    }
  } catch {
    return { ok: false, reason: 'malformed' };
  }

  return { ok: true };
}

/** @param {Buffer|string} rawBody */
export function signShopifyWebhookBody(rawBody, secret = getShopifyApiSecret()) {
  const key = secret ?? getShopifyApiSecret();
  const raw = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(String(rawBody), 'utf8');
  return crypto.createHmac('sha256', key).update(raw).digest('base64');
}
