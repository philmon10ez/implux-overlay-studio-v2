/**
 * Conversion Intelligence API — authenticated admin helpers.
 * Thin route: validate payload, load optional DB context, delegate to orchestrator.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import { createRateLimiter } from '../lib/rateLimit.js';
import auth from '../middleware/auth.js';
import {
  validateRecommendationAssistantRequest,
  runRecommendationAssistant,
  ASSISTANT_RESPONSE_SCHEMA_VERSION,
} from '../lib/conversionIntelligence/index.js';

const router = express.Router();
router.use(auth);

const prisma = new PrismaClient();
const assistantLimiter = createRateLimiter({ limit: 30, windowMs: 60 * 60 * 1000 });

router.post('/recommendation-assistant', async (req, res, next) => {
  try {
    const limit = assistantLimiter.check(String(req.user?.id || 'staff'));
    if (!limit.ok) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }
    const validated = validateRecommendationAssistantRequest(req.body);
    if (!validated.ok) {
      return res.status(400).json({
        ok: false,
        schemaVersion: ASSISTANT_RESPONSE_SCHEMA_VERSION,
        error: validated.error,
        field: validated.field ?? null,
      });
    }

    const { merchantId, ...rest } = validated.data;
    let catalog = [];
    let merchantMeta = null;

    if (merchantId != null) {
      const merchant = await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: { id: true, storeName: true, shopifyDomain: true },
      });
      if (merchant) {
        merchantMeta = {
          storeName: merchant.storeName,
          shopifyDomain: merchant.shopifyDomain,
        };
      }

      catalog = await prisma.product.findMany({
        where: { merchantId },
        take: 40,
        orderBy: { updatedAt: 'desc' },
        select: { id: true, title: true, sku: true, category: true },
      });
    }

    const result = await runRecommendationAssistant({
      ...rest,
      catalog,
      merchantMeta,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
