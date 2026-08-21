/**
 * Shopify Remix app startup validation.
 */
import { resolveAppEnv } from '../../../shared/appEnv.js';
import { validateDatabaseUrl } from '../../../shared/databaseGuard.js';
import {
  validateImpluxBackendUrl,
  validateShopifyAppPublicUrl,
} from '../../../shared/serviceUrlGuard.js';

let validated = false;

export function validateShopifyAppStartup(env = process.env) {
  if (validated) return resolveAppEnv(env);
  const appEnv = resolveAppEnv(env);
  validateDatabaseUrl(env);

  if (appEnv === 'staging' || appEnv === 'preview') {
    validateImpluxBackendUrl(env);
    if (appEnv === 'staging') {
      validateShopifyAppPublicUrl(env);
    }
  }

  console.log(`[startup] Shopify app APP_ENV=${appEnv}`);
  validated = true;
  return appEnv;
}
