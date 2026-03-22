import { redirect } from '@remix-run/node';

/**
 * Shopify loads the App URL at the service root (e.g. https://host/).
 * Our UI lives under /app (routes/app.jsx). Without this route, GET / renders
 * an empty Outlet → blank white embedded app.
 */
export const loader = async ({ request }) => {
  const url = new URL(request.url);
  return redirect(`/app${url.search}`);
};
