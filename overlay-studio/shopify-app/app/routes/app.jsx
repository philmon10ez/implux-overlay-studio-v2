import { Outlet, useRouteError } from '@remix-run/react';
import { boundary } from '@shopify/shopify-app-remix/server';
import polarisStyles from '@shopify/polaris/build/esm/styles.css?url';
import { authenticate } from '../shopify.server.js';
import prisma from '../db.server.js';
import { syncMerchantFromSession } from '../lib/merchantSync.server.js';

export const links = () => [
  { rel: 'stylesheet', href: polarisStyles },
  { rel: 'stylesheet', href: '/poptek-app.css' },
];

export const loader = async ({ request }) => {
  const { session } = await authenticate.admin(request);
  const shop = session?.shop || '';

  console.log('[Implux] App layout load:', shop ? shop.replace(/^https?:\/\//, '') : 'no-shop');
  await syncMerchantFromSession(prisma, session, 'app_layout');

  return {};
};

export default function AppLayout() {
  return <Outlet />;
}

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers = (headersArgs) => boundary.headers(headersArgs);
