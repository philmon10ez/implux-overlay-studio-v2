/**
 * Implux — Backend entry point (Railway)
 * Procfile: web: node server.js
 */
import 'dotenv/config';
import cron from 'node-cron';
import { createApp } from './app.js';
import { syncTransactions } from './services/rakutenService.js';

const PORT = process.env.PORT ?? 3001;

const shopifyApiKey = String(process.env.SHOPIFY_API_KEY || '');
const shopifyKeySuffix = shopifyApiKey.length >= 4 ? shopifyApiKey.slice(-4) : '(unset)';
console.log(`[shopify] SHOPIFY_API_KEY configured (…${shopifyKeySuffix})`);
if (!process.env.SHOPIFY_API_SECRET) {
  console.warn('[shopify] SHOPIFY_API_SECRET is not set — compliance webhooks will return 401');
} else {
  console.log('[shopify] SHOPIFY_API_SECRET configured');
}

const app = createApp();

cron.schedule('0 */6 * * *', async () => {
  try {
    await syncTransactions();
    console.log('Rakuten sync completed');
  } catch (e) {
    console.error('Rakuten sync failed:', e.message);
  }
});

app.listen(PORT, () => {
  console.log(`Implux backend listening on port ${PORT}`);
});
