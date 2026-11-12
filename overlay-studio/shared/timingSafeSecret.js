/**
 * Constant-time comparison for shared secrets.
 * A length mismatch returns false and does not throw.
 */
import crypto from 'crypto';

/**
 * @param {unknown} provided
 * @param {unknown} expected
 */
export function secretsEqual(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    crypto.timingSafeEqual(right, right);
    return false;
  }
  return crypto.timingSafeEqual(left, right);
}
