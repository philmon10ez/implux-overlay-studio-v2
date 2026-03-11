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
