/**
 * API responses are not documents. CSP here does not apply to the Shopify embedded app
 * or the Vercel dashboard; those hosts set their own document policies.
 */
export function securityHeaders(_req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
}

export function privateCache(_req, res, next) {
  res.setHeader('Cache-Control', 'no-store');
  next();
}
