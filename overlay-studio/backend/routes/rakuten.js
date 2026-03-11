/**
 * Rakuten: connect (save credentials), advertisers, transactions, sync, credentials (masked). All protected.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';
import {
  authenticate,
  getAdvertisers,
  getTransactions,
  syncTransactions,
} from '../services/rakutenService.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

// POST /api/rakuten/connect — save credentials and test auth
router.post('/connect', async (req, res, next) => {
  try {
    const { clientId, clientSecret, publisherId, securityToken } = req.body ?? {};
    if (!clientId || !clientSecret || !publisherId || !securityToken) {
      return res.status(400).json({
        error: 'clientId, clientSecret, publisherId, securityToken required',
      });
    }
    const existing = await prisma.rakutenCredentials.findFirst();
    if (existing) {
      await prisma.rakutenCredentials.update({
        where: { id: existing.id },
        data: {
          clientId: String(clientId),
          clientSecret: String(clientSecret),
          publisherId: String(publisherId),
          securityToken: String(securityToken),
        },
      });
    } else {
      await prisma.rakutenCredentials.create({
        data: {
          clientId: String(clientId),
          clientSecret: String(clientSecret),
          publisherId: String(publisherId),
          securityToken: String(securityToken),
        },
      });
    }
    const ok = await authenticate();
    if (!ok) {
      return res.status(400).json({
        error: 'Credentials saved but authentication test failed. Check Rakuten credentials.',
        saved: true,
      });
    }
    res.json({ ok: true, message: 'Connected and verified' });
  } catch (err) {
    next(err);
  }
});

// GET /api/rakuten/advertisers
router.get('/advertisers', async (req, res, next) => {
  try {
    const list = await getAdvertisers();
    res.json({ advertisers: list });
  } catch (err) {
    res.status(err.statusCode ?? 502).json({
      error: err.message ?? 'Failed to fetch advertisers',
    });
  }
});

// GET /api/rakuten/transactions?startDate=&endDate=
router.get('/transactions', async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const list = await getTransactions(start, end);
    res.json({ transactions: list });
  } catch (err) {
    res.status(err.statusCode ?? 502).json({
      error: err.message ?? 'Failed to fetch transactions',
    });
  }
});

// POST /api/rakuten/sync — manual sync
router.post('/sync', async (req, res, next) => {
  try {
    await syncTransactions();
    res.json({ ok: true, message: 'Sync completed' });
  } catch (err) {
    res.status(err.statusCode ?? 502).json({
      error: err.message ?? 'Sync failed',
    });
  }
});

// GET /api/rakuten/credentials — masked
router.get('/credentials', async (req, res, next) => {
  try {
    const c = await prisma.rakutenCredentials.findFirst();
    if (!c) return res.json({ credentials: null });
    res.json({
      credentials: {
        id: c.id,
        clientId: mask(c.clientId),
        clientSecret: mask(c.clientSecret),
        publisherId: c.publisherId,
        securityToken: mask(c.securityToken),
        updatedAt: c.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

function mask(s) {
  if (!s || s.length <= 4) return '****';
  return s.slice(0, 2) + '****' + s.slice(-2);
}

export default router;
