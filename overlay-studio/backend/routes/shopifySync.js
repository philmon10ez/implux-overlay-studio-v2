/**
 * Server-to-server: Shopify Remix app registers/updates Merchant after OAuth.
 * Protected by MERCHANT_SYNC_SECRET (same value on backend + shopify-app Railway).
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

export function normalizeShopDomain(shop) {
  return String(shop || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

function requireSyncSecret(req, res) {
  const expected = process.env.MERCHANT_SYNC_SECRET;
  if (!expected || typeof expected !== 'string') {
    console.warn('[Implux] shopify sync route: 503 MERCHANT_SYNC_SECRET not set on backend');
    res.status(503).json({ error: 'Merchant sync not configured' });
    return null;
  }
  const sent = req.header('x-implux-merchant-sync-secret') || req.headers['x-implux-merchant-sync-secret'];
  if (sent !== expected) {
    console.warn('[Implux] shopify sync route: 401 secret mismatch');
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return expected;
}

/**
 * Idempotent upsert — same shopifyDomain updates token and reactivates without duplicating rows.
 * @param {import('@prisma/client').PrismaClient} db
 */
export async function upsertMerchantFromSync(db, { shop, accessToken, storeName }) {
  const shopifyDomain = normalizeShopDomain(shop);
  if (!shopifyDomain.includes('.')) {
    const err = new Error('Invalid shop domain');
    err.status = 400;
    throw err;
  }
  const name =
    (storeName && String(storeName).trim()) ||
    shopifyDomain.replace('.myshopify.com', '').replace(/-/g, ' ') ||
    shopifyDomain;

  return db.merchant.upsert({
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
}

/**
 * Preserve merchant row and campaigns; deactivate store for admin UI.
 * @param {import('@prisma/client').PrismaClient} db
 */
export async function markMerchantUninstalled(db, shop) {
  const shopifyDomain = normalizeShopDomain(shop);
  if (!shopifyDomain.includes('.')) {
    const err = new Error('Invalid shop domain');
    err.status = 400;
    throw err;
  }
  const existing = await db.merchant.findUnique({ where: { shopifyDomain } });
  if (!existing) {
    return { found: false, shopifyDomain };
  }
  const merchant = await db.merchant.update({
    where: { id: existing.id },
    data: {
      status: 'inactive',
      accessToken: '',
    },
  });
  return { found: true, merchantId: merchant.id, shopifyDomain: merchant.shopifyDomain };
}

// POST /api/shopify/sync-merchant
router.post('/sync-merchant', async (req, res, next) => {
  try {
    if (!requireSyncSecret(req, res)) return;
    const { shop, accessToken, storeName } = req.body ?? {};
    if (!shop || !accessToken) {
      return res.status(400).json({ error: 'shop and accessToken required' });
    }
    const merchant = await upsertMerchantFromSync(prisma, { shop, accessToken, storeName });
    console.log('[Implux] Merchant synced:', merchant.shopifyDomain, 'id:', merchant.id);
    res.json({
      ok: true,
      merchantId: merchant.id,
      shopifyDomain: merchant.shopifyDomain,
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/shopify/mark-uninstalled
router.post('/mark-uninstalled', async (req, res, next) => {
  try {
    if (!requireSyncSecret(req, res)) return;
    const { shop } = req.body ?? {};
    if (!shop) {
      return res.status(400).json({ error: 'shop required' });
    }
    const result = await markMerchantUninstalled(prisma, shop);
    if (!result.found) {
      return res.json({ ok: true, found: false, shopifyDomain: result.shopifyDomain });
    }
    console.log('[Implux] Merchant uninstalled (inactive):', result.shopifyDomain, 'id:', result.merchantId);
    res.json({
      ok: true,
      found: true,
      merchantId: result.merchantId,
      shopifyDomain: result.shopifyDomain,
    });
  } catch (err) {
    if (err.status === 400) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

export default router;
