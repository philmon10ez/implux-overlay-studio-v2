/** Plain-text liveness probe — no DB, no Shopify auth (for Railway / load balancers). */
export function loader() {
  return new Response('ok', {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
