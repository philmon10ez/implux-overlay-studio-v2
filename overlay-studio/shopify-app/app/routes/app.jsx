import { Outlet, useRouteError } from '@remix-run/react';
import { boundary } from '@shopify/shopify-app-remix/server';
import polarisStyles from '@shopify/polaris/build/esm/styles.css?url';
import { authenticate } from '../shopify.server.js';
import prisma from '../db.server.js';

export const links = () => [
  { rel: 'stylesheet', href: polarisStyles },
  { rel: 'stylesheet', href: '/poptek-app.css' },
];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || '';

  // Sync this shop to Implux backend on every app load (layout runs first for all app routes)
  const backendUrl = (process.env.IMPLUX_BACKEND_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');
  const syncSecret = process.env.MERCHANT_SYNC_SECRET;
  let accessToken = session?.accessToken;
  if (!accessToken && shop) {
    const dbSession = await prisma.session.findFirst({
      where: { shop: shop.replace(/^https?:\/\//, '').replace(/\/$/, '') },
    });
    accessToken = dbSession?.accessToken || null;
  }
  // Always log so we see something in Railway when the app loads
  console.log('[Implux] App load:', shop || 'no-shop', '| backendUrl:', !!backendUrl, '| syncSecret:', !!syncSecret, '| token:', !!accessToken);
  if (backendUrl && syncSecret && shop && accessToken) {
    try {
      const shopNormalized = shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
      const res = await fetch(`${backendUrl}/api/shopify/sync-merchant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-implux-merchant-sync-secret': syncSecret,
        },
        body: JSON.stringify({
          shop: shopNormalized,
          accessToken,
          storeName: shopNormalized.replace('.myshopify.com', '').replace(/-/g, ' '),
        }),
      });
      if (res.ok) {
        console.log('[Implux] Merchant sync OK for', shopNormalized);
      } else {
        console.warn('[Implux] Merchant sync failed:', res.status, await res.text());
      }
    } catch (e) {
      console.warn('[Implux] Merchant sync error:', e?.message);
    }
  }

  return {};
};

export default function AppLayout() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
