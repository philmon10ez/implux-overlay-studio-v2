/**
 * In-memory sliding-window rate limiter. Suitable for a single Railway replica.
 * Not a cross-replica control. Documented as a first gate, not a global lockout store.
 */

/**
 * @param {{ limit: number, windowMs: number, maxKeys?: number }} options
 */
export function createRateLimiter(options) {
  const limit = options.limit;
  const windowMs = options.windowMs;
  const maxKeys = options.maxKeys ?? 5000;
  /** @type {Map<string, number[]>} */
  const hits = new Map();

  function prune(now) {
    if (hits.size <= maxKeys) return;
    for (const [key, stamps] of hits) {
      const fresh = stamps.filter((stamp) => now - stamp < windowMs);
      if (fresh.length === 0) hits.delete(key);
      else hits.set(key, fresh);
      if (hits.size <= maxKeys) break;
    }
  }

  return {
    /**
     * @param {string} key
     * @param {number} [now]
     */
    check(key, now = Date.now()) {
      const stamps = (hits.get(key) || []).filter((stamp) => now - stamp < windowMs);
      if (stamps.length >= limit) {
        hits.set(key, stamps);
        const retryAfterMs = Math.max(0, windowMs - (now - stamps[0]));
        return { ok: false, retryAfterMs };
      }
      stamps.push(now);
      hits.set(key, stamps);
      prune(now);
      return { ok: true, retryAfterMs: 0 };
    },
    reset() {
      hits.clear();
    },
  };
}

/** @param {import('express').Request} req */
export function clientAddress(req) {
  const socketAddress = req.socket?.remoteAddress || '';
  return String(req.ip || socketAddress || 'unknown');
}
