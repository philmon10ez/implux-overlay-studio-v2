/**
 * Merchants CRUD — all protected by auth.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

// GET /api/merchants
router.get('/', async (req, res, next) => {
  try {
    const list = await prisma.merchant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { campaigns: true } } },
    });
    const safe = list.map((m) => ({
      id: m.id,
      storeName: m.storeName,
      shopifyDomain: m.shopifyDomain,
      rakutenMid: m.rakutenMid,
      status: m.status,
      createdAt: m.createdAt,
      campaignCount: m._count.campaigns,
    }));
    res.json({ merchants: safe });
  } catch (err) {
    next(err);
  }
});

// POST /api/merchants
router.post('/', async (req, res, next) => {
  try {
    const { storeName, shopifyDomain, accessToken, rakutenMid, status } = req.body ?? {};
    if (!storeName || !shopifyDomain || !accessToken) {
      return res.status(400).json({ error: 'storeName, shopifyDomain, and accessToken required' });
    }
    const merchant = await prisma.merchant.create({
      data: {
        storeName: String(storeName),
        shopifyDomain: String(shopifyDomain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, ''),
        accessToken: String(accessToken),
        rakutenMid: rakutenMid != null ? String(rakutenMid) : null,
        status: status ?? 'active',
      },
    });
    res.status(201).json({ merchant: sanitizeMerchant(merchant) });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Shopify domain already exists' });
    next(err);
  }
});

// PUT /api/merchants/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { storeName, shopifyDomain, accessToken, rakutenMid, status } = req.body ?? {};
    const data = {};
    if (storeName !== undefined) data.storeName = String(storeName);
    if (shopifyDomain !== undefined) data.shopifyDomain = String(shopifyDomain).toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (accessToken !== undefined) data.accessToken = String(accessToken);
    if (rakutenMid !== undefined) data.rakutenMid = rakutenMid === null || rakutenMid === '' ? null : String(rakutenMid);
    if (status !== undefined) data.status = String(status);
    const merchant = await prisma.merchant.update({
      where: { id },
      data,
    });
    res.json({ merchant: sanitizeMerchant(merchant) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Merchant not found' });
    if (err.code === 'P2002') return res.status(409).json({ error: 'Shopify domain already exists' });
    next(err);
  }
});

// DELETE /api/merchants/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.merchant.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Merchant not found' });
    next(err);
  }
});

function sanitizeMerchant(m) {
  return {
    id: m.id,
    storeName: m.storeName,
    shopifyDomain: m.shopifyDomain,
    rakutenMid: m.rakutenMid,
    status: m.status,
    createdAt: m.createdAt,
  };
}

export default router;
