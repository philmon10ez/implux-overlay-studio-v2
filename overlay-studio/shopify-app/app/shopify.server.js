import './crypto-polyfill.server.js';
import '@shopify/shopify-app-remix/adapters/node';
import { ApiVersion, DeliveryMethod, shopifyApp } from '@shopify/shopify-app-remix/server';
import prisma from './db.server.js';
import { validateShopifyAppStartup } from './lib/startupValidation.server.js';
import { syncMerchantFromSession } from './lib/merchantSync.server.js';
import { EncryptingPrismaSessionStorage } from './lib/encryptingSessionStorage.server.js';

validateShopifyAppStartup();

const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || '',
  apiVersion: ApiVersion.January25,
  scopes: (process.env.SCOPES || 'read_orders,read_themes').split(','),
  appUrl: process.env.APP_URL || process.env.SHOPIFY_APP_URL || '',
  authPathPrefix: '/auth',
  sessionStorage: new EncryptingPrismaSessionStorage(prisma),
  isEmbeddedApp: true,
  // Managed install (use_legacy_install_flow = false in TOML) + token exchange for offline tokens.
  future: {
    unstable_newEmbeddedAuthStrategy: true,
  },
  webhooks: {
    APP_UNINSTALLED: {
      deliveryMethod: DeliveryMethod.Http,
      callbackUrl: '/webhooks/app/uninstalled',
    },
  },
  hooks: {
    afterAuth: async ({ session }) => {
      try {
        await shopify.registerWebhooks({ session });
      } catch (e) {
        console.error('[Implux] registerWebhooks failed:', e?.message || e);
      }
      await syncMerchantFromSession(prisma, session, 'afterAuth');
    },
  },
});

export default shopify;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
