/**
 * Implux — Backend entry point (Railway)
 * Procfile: web: node server.js
 */
import 'dotenv/config';
import cron from 'node-cron';
import { createApp } from './app.js';
import { syncTransactions } from './services/rakutenService.js';
import { isRakutenSyncEnabled } from '../shared/appEnv.js';
import { validateBackendStartup } from './lib/startupValidation.js';

validateBackendStartup();

const PORT = process.env.PORT ?? 3001;

const shopifyApiKey = String(process.env.SHOPIFY_API_KEY || '');
console.log(`[shopify] SHOPIFY_API_KEY ${shopifyApiKey ? 'configured' : 'unset'}`);
if (!process.env.SHOPIFY_API_SECRET) {
  console.warn('[shopify] SHOPIFY_API_SECRET is not set — compliance webhooks will return 401');
} else {
  console.log('[shopify] SHOPIFY_API_SECRET configured');
}

const app = createApp();

if (isRakutenSyncEnabled()) {
  cron.schedule('0 */6 * * *', async () => {
    try {
      await syncTransactions();
      console.log('Rakuten sync completed');
    } catch (e) {
      console.error('Rakuten sync failed:', e.message);
    }
  });
  console.log('[rakuten] Scheduled sync enabled (every 6 hours)');
} else {
  console.log('[rakuten] Scheduled sync disabled (set RAKUTEN_SYNC_ENABLED=true to enable)');
}

app.listen(PORT, () => {
  console.log(`Implux backend listening on port ${PORT}`);
});
