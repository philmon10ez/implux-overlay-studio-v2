/**
 * Server-to-server: Shopify Remix app registers/updates Merchant after OAuth.
 * Protected by MERCHANT_SYNC_SECRET (same value on backend + shopify-app Railway).
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

function normalizeShopDomain(shop) {
  return String(shop || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

// POST /api/shopify/sync-merchant
router.post('/sync-merchant', async (req, res, next) => {
  try {
    const expected = process.env.MERCHANT_SYNC_SECRET;
    if (!expected || typeof expected !== 'string') {
      console.warn('[Implux] sync-merchant: 503 MERCHANT_SYNC_SECRET not set on backend');
      return res.status(503).json({ error: 'Merchant sync not configured' });
    }
    const sent = req.header('x-implux-merchant-sync-secret') || req.headers['x-implux-merchant-sync-secret'];
    if (sent !== expected) {
      console.warn('[Implux] sync-merchant: 401 secret mismatch');
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const { shop, accessToken, storeName } = req.body ?? {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: 'shop and accessToken required' });
    }
    const shopifyDomain = normalizeShopDomain(shop);
    if (!shopifyDomain.includes('.')) {
      return res.status(400).json({ error: 'Invalid shop domain' });
    }
    const name =
      (storeName && String(storeName).trim()) ||
      shopifyDomain.replace('.myshopify.com', '').replace(/-/g, ' ') ||
      shopifyDomain;

    const merchant = await prisma.merchant.upsert({
      where: { shopifyDomain },
      create: {
        storeName: name.slice(0, 120),
        shopifyDomain,
        accessToken: String(accessToken),
        status: 'active',
      },
      update: {
        accessToken: String(accessToken),
        storeName: name.slice(0, 120),
        status: 'active',
      },
    });

    console.log('[Implux] Merchant synced:', merchant.shopifyDomain, 'id:', merchant.id);
    res.json({
      ok: true,
      merchantId: merchant.id,
      shopifyDomain: merchant.shopifyDomain,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
