/**
 * Conversion Intelligence API — authenticated admin helpers.
 * Thin route: validate payload, load optional DB context, delegate to orchestrator.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';
import {
  validateRecommendationAssistantRequest,
  runRecommendationAssistant,
  ASSISTANT_RESPONSE_SCHEMA_VERSION,
} from '../lib/conversionIntelligence/index.js';

const router = express.Router();
router.use(auth);

const prisma = new PrismaClient();

router.post('/recommendation-assistant', async (req, res, next) => {
  try {
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
