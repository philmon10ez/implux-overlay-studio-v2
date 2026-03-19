import '@shopify/shopify-app-remix/adapters/node';
import { ApiVersion, shopifyApp } from '@shopify/shopify-app-remix/server';
import { PrismaSessionStorage } from '@shopify/shopify-app-session-storage-prisma';
import prisma from './db.server.js';

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  apiVersion: ApiVersion.January25,
  scopes: (process.env.SCOPES || 'read_products,write_script_tags,read_orders,write_themes,read_themes').split(','),
  appUrl: process.env.APP_URL || process.env.SHOPIFY_APP_URL || '',
  authPathPrefix: '/auth',
  sessionStorage: new PrismaSessionStorage(prisma),
  hooks: {
    afterAuth: async ({ session, registerWebhooks }) => {
      if (registerWebhooks) await registerWebhooks({ session });
      const backendUrl = (process.env.IMPLUX_BACKEND_URL || process.env.BACKEND_API_URL || '').replace(/\/$/, '');
      const syncSecret = process.env.MERCHANT_SYNC_SECRET;
      const hasSession = session?.shop && session?.accessToken;
      if (!backendUrl || !syncSecret || !hasSession) {
        console.warn('[Implux] Merchant sync skipped:', {
          hasBackendUrl: !!backendUrl,
          hasSyncSecret: !!syncSecret,
          hasShop: !!session?.shop,
          hasAccessToken: !!session?.accessToken,
        });
      } else {
        try {
          const shop = session.shop.replace(/^https?:\/\//, '').replace(/\/$/, '');
          const url = `${backendUrl}/api/shopify/sync-merchant`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-implux-merchant-sync-secret': syncSecret,
            },
            body: JSON.stringify({
              shop,
              accessToken: session.accessToken,
              storeName: shop.replace('.myshopify.com', '').replace(/-/g, ' '),
            }),
          });
          const text = await res.text();
          if (res.ok) {
            console.log('[Implux] Merchant sync OK for', shop);
          } else {
            console.error('[Implux] Merchant sync failed:', res.status, text);
          }
        } catch (e) {
          console.error('[Implux] Merchant sync error:', e?.message || e);
        }
      }
      const themeExtensionId = process.env.THEME_EXTENSION_ID;
      if (themeExtensionId && session?.shop) {
        const shop = session.shop.replace(/^https?:\/\//, '');
        return { redirectUrl: `https://${shop}/admin/themes/current/editor?context=apps&activateAppId=${themeExtensionId}` };
      }
    },
  },
});

export default shopify;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
