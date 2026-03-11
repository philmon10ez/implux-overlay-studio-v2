import { authenticate } from '../shopify.server.js';

export const action = async ({ request }) => {
  const { topic, shop, payload } = await authenticate.webhook(request);
  if (!authenticate.webhook.check) throw new Response('Invalid webhook', { status: 401 });
  if (topic === 'APP_UNINSTALLED') {
    // Optional: clean up merchant/session data for this shop
  }
  return new Response(null, { status: 200 });
};
