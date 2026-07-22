/**
 * Mandatory GDPR compliance webhooks — Shopify automated checks POST here
 * (application_url + /webhooks/compliance). Forwards the raw body and Shopify
 * headers to the Implux backend for HMAC verification (single implementation).
 */
function safeComplianceLog(fields) {
  console.log('[shopify-compliance]', JSON.stringify(fields));
}

export const action = async ({ request }) => {
  if (request.method !== 'POST') {
    return new Response(null, { status: 405 });
  }

  const backendUrl = (process.env.IMPLUX_BACKEND_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');
  if (!backendUrl) {
    console.error('[shopify-compliance] IMPLUX_BACKEND_URL is not configured');
    return new Response(null, { status: 503 });
  }

  const rawBody = await request.arrayBuffer();
  const forwardHeaders = {
    'Content-Type': request.headers.get('Content-Type') || 'application/json',
  };
  for (const name of [
    'X-Shopify-Hmac-Sha256',
    'X-Shopify-Topic',
    'X-Shopify-Shop-Domain',
    'X-Shopify-Webhook-Id',
  ]) {
    const value = request.headers.get(name);
    if (value) forwardHeaders[name] = value;
  }

  safeComplianceLog({
    event: 'proxy_forward',
    routePath: '/webhooks/compliance',
    topic: forwardHeaders['X-Shopify-Topic'] || '(none)',
    shopDomain: forwardHeaders['X-Shopify-Shop-Domain'] || '(none)',
  });

  try {
    const res = await fetch(`${backendUrl}/webhooks/compliance`, {
      method: 'POST',
      headers: forwardHeaders,
      body: rawBody,
    });
    return new Response(null, { status: res.status });
  } catch (err) {
    console.error('[shopify-compliance] backend proxy failed', err?.message || err);
    return new Response(null, { status: 502 });
  }
};
