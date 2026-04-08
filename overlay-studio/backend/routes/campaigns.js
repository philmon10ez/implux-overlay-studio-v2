/**
 * Campaigns CRUD + publish + duplicate — all protected by auth.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';
import { pushCampaignToStore } from '../services/shopifyService.js';
import { canonicalCampaignType, isKnownCampaignType } from '../lib/campaignType.js';
import { sanitizeFrequencyCapPayload } from '../lib/frequencyCap.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

// GET /api/campaigns?merchantId=
router.get('/', async (req, res, next) => {
  try {
    const merchantId = req.query.merchantId ? parseInt(req.query.merchantId, 10) : undefined;
    const where = Number.isNaN(merchantId) ? {} : { merchantId };
    const campaigns = await prisma.campaign.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    res.json({ campaigns: campaigns.map(normalizeCampaign) });
  } catch (err) {
    next(err);
  }
});

// GET /api/campaigns/:id
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    res.json({ campaign: normalizeCampaign(campaign) });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns
router.post('/', async (req, res, next) => {
  try {
    const { name, merchantId, type, triggerConfig, designConfig, promoCode, promoConfig, frequencyCap } =
      req.body ?? {};
    if (!name || !merchantId || !type || triggerConfig === undefined || designConfig === undefined) {
      return res.status(400).json({ error: 'name, merchantId, type, triggerConfig, designConfig required' });
    }
    const mid = parseInt(merchantId, 10);
    if (Number.isNaN(mid)) return res.status(400).json({ error: 'Invalid merchantId' });
    const canonType = canonicalCampaignType(type);
    if (!isKnownCampaignType(canonType)) {
      return res.status(400).json({ error: 'Invalid campaign type' });
    }
    const campaign = await prisma.campaign.create({
      data: {
        name: String(name),
        merchantId: mid,
        type: canonType,
        triggerConfig: triggerConfig,
        designConfig: designConfig,
        promoCode: promoCode != null ? String(promoCode) : null,
        promoConfig: promoConfig === undefined ? null : promoConfig,
        frequencyCap:
          frequencyCap === undefined ? null : frequencyCap === null ? null : sanitizeFrequencyCapPayload(frequencyCap),
      },
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    res.status(201).json({ campaign: normalizeCampaign(campaign) });
  } catch (err) {
    if (err.code === 'P2003') return res.status(400).json({ error: 'Merchant not found' });
    next(err);
  }
});

// PUT /api/campaigns/:id
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const { name, merchantId, type, triggerConfig, designConfig, promoCode, promoConfig, frequencyCap, status } =
      req.body ?? {};
    const data = {};
    if (name !== undefined) data.name = String(name);
    if (merchantId !== undefined) { const mid = parseInt(merchantId, 10); if (!Number.isNaN(mid)) data.merchantId = mid; }
    if (type !== undefined) {
      const canonType = canonicalCampaignType(type);
      if (!isKnownCampaignType(canonType)) {
        return res.status(400).json({ error: 'Invalid campaign type' });
      }
      data.type = canonType;
    }
    if (triggerConfig !== undefined) data.triggerConfig = triggerConfig;
    if (designConfig !== undefined) data.designConfig = designConfig;
    if (promoCode !== undefined) data.promoCode = promoCode === null || promoCode === '' ? null : String(promoCode);
    if (promoConfig !== undefined) data.promoConfig = promoConfig;
    if (frequencyCap !== undefined) {
      data.frequencyCap = frequencyCap === null ? null : sanitizeFrequencyCapPayload(frequencyCap);
    }
    if (status !== undefined) data.status = String(status);
    const campaign = await prisma.campaign.update({
      where: { id },
      data,
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    res.json({ campaign: normalizeCampaign(campaign) });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Campaign not found' });
    if (err.code === 'P2003') return res.status(400).json({ error: 'Merchant not found' });
    next(err);
  }
});

// DELETE /api/campaigns/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    await prisma.campaign.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Campaign not found' });
    next(err);
  }
});

// POST /api/campaigns/:id/publish
router.post('/:id/publish', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const campaign = await prisma.campaign.findUnique({
      where: { id },
      include: { merchant: true },
    });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    await prisma.campaign.update({
      where: { id },
      data: { status: 'active' },
    });
    await pushCampaignToStore(campaign.merchant, campaign);
    const updated = await prisma.campaign.findUnique({
      where: { id },
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    res.json({ campaign: normalizeCampaign(updated), published: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/campaigns/:id/duplicate
router.post('/:id/duplicate', async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) return res.status(400).json({ error: 'Invalid id' });
    const source = await prisma.campaign.findUnique({
      where: { id },
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    if (!source) return res.status(404).json({ error: 'Campaign not found' });
    const { name } = req.body ?? {};
    const newName = name && String(name).trim() ? String(name).trim() : `${source.name} (copy)`;
    const created = await prisma.campaign.create({
      data: {
        name: newName,
        merchantId: source.merchantId,
        type: canonicalCampaignType(source.type) || source.type,
        triggerConfig: source.triggerConfig,
        designConfig: source.designConfig,
        promoCode: source.promoCode,
        promoConfig: source.promoConfig ?? null,
        frequencyCap: source.frequencyCap ?? null,
        status: 'draft',
      },
      include: { merchant: { select: { id: true, storeName: true, shopifyDomain: true } } },
    });
    res.status(201).json({ campaign: normalizeCampaign(created) });
  } catch (err) {
    next(err);
  }
});

function normalizeCampaign(c) {
  if (!c) return null;
  return {
    id: c.id,
    name: c.name,
    merchantId: c.merchantId,
    merchant: c.merchant,
    type: canonicalCampaignType(c.type) || c.type,
    status: c.status,
    triggerConfig: c.triggerConfig,
    designConfig: c.designConfig,
    promoCode: c.promoCode,
    promoConfig: c.promoConfig ?? null,
    frequencyCap: c.frequencyCap ?? null,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    revenueAttributed: c.revenueAttributed != null ? Number(c.revenueAttributed) : 0,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

export default router;
