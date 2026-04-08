/**
 * Shared Express request parsing for tenant-scoped admin APIs.
 * Keeps routes thin and validation consistent.
 */

/**
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parsePositiveInt(raw) {
  if (raw == null || raw === '') return null;
  const n = parseInt(String(raw), 10);
  if (Number.isNaN(n) || n < 1) return null;
  return n;
}

/**
 * @param {import('express').Request} req
 * @returns {{ ok: true, merchantId: number } | { ok: false, error: string }}
 */
export function parseRequiredMerchantIdQuery(req) {
  const merchantId = parsePositiveInt(req.query?.merchantId);
  if (merchantId == null) {
    return { ok: false, error: 'merchantId query parameter is required' };
  }
  return { ok: true, merchantId };
}

/**
 * @param {string} [param]
 * @returns {{ ok: true, id: number } | { ok: false, error: string }}
 */
export function parseRequiredIdParam(param) {
  const id = parsePositiveInt(param);
  if (id == null) return { ok: false, error: 'Invalid id' };
  return { ok: true, id };
}

/**
 * Optional tenant scope for GET /resource/:id (reduces cross-merchant IDOR when clients pass it).
 * @param {import('express').Request} req
 * @returns {number | undefined}
 */
export function parseOptionalMerchantIdQuery(req) {
  const mid = parsePositiveInt(req.query?.merchantId);
  return mid ?? undefined;
}
