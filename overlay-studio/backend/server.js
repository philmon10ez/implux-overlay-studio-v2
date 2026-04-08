/**
 * Implux — Backend entry point (Railway)
 * Procfile: web: node server.js
 */
import 'dotenv/config';
import cron from 'node-cron';
import { createApp } from './app.js';
import { syncTransactions } from './services/rakutenService.js';

const PORT = process.env.PORT ?? 3001;
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
