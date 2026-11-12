/**
 * App proxy — HMAC verified (GET) or Shopify webhook (POST), NOT auth. Called from storefront.
 * GET /proxy/campaigns?shop= — active campaigns for shop
 * GET /proxy/recommendations?shop=&placement=&… — active recommendation sets for page context
 * GET /proxy/track?event=&campaign_id=&shop= — log impression/click
 * POST /proxy/conversion — Shopify orders/create webhook
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import storefrontProxyAuth from '../middleware/storefrontProxyAuth.js';
import { verifyWebhook } from '../services/shopifyService.js';
import { attributeOrderConversion } from '../services/orderConversion.js';
import { resolveOrderWebhookShopDomain } from '../lib/orderWebhookShopDomain.js';
import { canonicalCampaignType } from '../lib/campaignType.js';
import { parsePlacementType } from '../lib/placementType.js';
import { buildContextFromProxyQuery } from '../services/recommendationTargetContext.js';
import { resolveRecommendationSetsForShop } from '../services/recommendationResolveService.js';
import {
  parseClientFrequencyState,
  filterCampaignsByFrequencyState,
  filterRecommendationSetsByFrequencyState,
  attachResolvedFrequencyCapToCampaign,
  attachResolvedFrequencyCapToRecommendationSet,
} from '../lib/frequencyCap.js';
import { createRateLimiter } from '../lib/rateLimit.js';
import { claimedShopMatches } from '../../shared/storefrontProxyAuth.js';

const router = express.Router();
const prisma = new PrismaClient();
const trackLimiter = createRateLimiter({ limit: 600, windowMs: 60 * 1000 });

function storefrontShop(req) {
  return req.storefrontShop || '';
}

// GET /proxy/campaigns?shop=
router.get('/campaigns', storefrontProxyAuth, async (req, res, next) => {
  try {
    const shop = storefrontShop(req);
    if (!shop) return res.status(400).json({ error: 'shop required' });
    const merchant = await prisma.merchant.findFirst({
      where: {
        shopifyDomain: { in: [shop, `https://${shop}`, `https://${shop}/`] },
        status: 'active',
      },
    });
    if (!merchant) return res.json({ campaigns: [] });
    const campaigns = await prisma.campaign.findMany({
      where: { merchantId: merchant.id, status: 'active' },
      select: {
        id: true,
        name: true,
        type: true,
        updatedAt: true,
        triggerConfig: true,
        designConfig: true,
        promoCode: true,
        promoConfig: true,
        frequencyCap: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
    });
    const freqState = parseClientFrequencyState(req.query.freq_state ?? req.query.freqState);
    const mapped = campaigns.map((c) =>
      attachResolvedFrequencyCapToCampaign({
        ...c,
        type: canonicalCampaignType(c.type) || c.type,
      })
    );
    const filtered = freqState ? filterCampaignsByFrequencyState(mapped, freqState) : mapped;
    res.json({ campaigns: filtered });
  } catch (err) {
    next(err);
  }
});

// GET /proxy/recommendations?shop=&placement=product_page|cart|checkout&…
// Optional: currentSku, productCategory, cartSubtotal, cartSkus, tags, collectionIds, context=(JSON)
router.get('/recommendations', storefrontProxyAuth, async (req, res, next) => {
  try {
    await sendRecommendations(req, res, req.query);
  } catch (err) {
    next(err);
  }
});

router.post('/recommendations', storefrontProxyAuth, async (req, res, next) => {
  try {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    if (!claimedShopMatches(storefrontShop(req), body.shop)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    await sendRecommendations(req, res, { ...req.query, ...body });
  } catch (err) {
    next(err);
  }
});

async function sendRecommendations(req, res, source) {
  const shop = storefrontShop(req);
  if (!shop) return res.status(400).json({ error: 'shop required' });
  const placement = parsePlacementType(source.placement);
  if (!placement) {
    return res.status(400).json({ error: 'placement required: product_page, cart, or checkout' });
  }
  const pageContext = buildContextFromProxyQuery(source);
  pageContext.pageType = placement;
  const { sets, merchantId } = await resolveRecommendationSetsForShop(shop, placement, pageContext);
  const freqState = parseClientFrequencyState(source.freq_state ?? source.freqState);
  const withCaps = sets.map((s) => attachResolvedFrequencyCapToRecommendationSet(s));
  const filteredSets = freqState ? filterRecommendationSetsByFrequencyState(withCaps, freqState) : withCaps;
  res.json({
    recommendationSets: filteredSets,
    placement,
    merchantId,
    evaluatedAt: new Date().toISOString(),
  });
}

// GET /proxy/track?event=&campaign_id=&shop=
router.get('/track', (_req, res) => {
  res.setHeader('Allow', 'POST');
  res.status(405).json({ error: 'Method not allowed' });
});

router.post('/track', storefrontProxyAuth, async (req, res, next) => {
  try {
    const source = { ...req.query, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    if (!claimedShopMatches(storefrontShop(req), source.shop)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const event = String(source.event ?? '').toLowerCase();
    const campaignId = parseInt(source.campaign_id ?? source.campaignId, 10);
    const shop = storefrontShop(req);
    const allowed = ['impression', 'click', 'exit_stay', 'exit_leave'];
    if (!event || !allowed.includes(event)) {
      return res.status(400).json({ error: 'invalid event' });
    }
    if (Number.isNaN(campaignId) || campaignId < 1) {
      return res.status(400).json({ error: 'campaign_id required' });
    }
    if (!shop) return res.status(400).json({ error: 'shop required' });
    const limit = trackLimiter.check(shop);
    if (!limit.ok) {
      res.setHeader('Retry-After', String(Math.ceil(limit.retryAfterMs / 1000)));
      return res.status(429).json({ error: 'Too many events' });
    }
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { merchant: true },
    });
    if (!campaign || campaign.merchant.shopifyDomain !== shop) {
      return res.status(404).json({ error: 'Campaign not found for this shop' });
    }
    await prisma.campaignEvent.create({
      data: {
        campaignId,
        eventType: event,
        shopDomain: shop,
      },
    });
    if (event === 'impression' || event === 'click') {
      const update =
        event === 'impression' ? { impressions: { increment: 1 } } : { clicks: { increment: 1 } };
      await prisma.campaign.update({
        where: { id: campaignId },
        data: update,
      });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export async function conversionWebhookHandler(req, res, next) {
  try {
    if (!Buffer.isBuffer(req.body)) {
      return res.status(401).json({ error: 'Invalid webhook HMAC' });
    }
    if (!verifyWebhook(req)) {
      return res.status(401).json({ error: 'Invalid webhook HMAC' });
    }
    let body = {};
    try {
      body = JSON.parse(req.body.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    const orderId = body?.id?.toString() ?? body?.order_id?.toString();
    const total = parseFloat(body?.total_price ?? body?.total_price_set?.shop_money?.amount ?? 0);
    const shopDomain = resolveOrderWebhookShopDomain(req, body);
    if (!orderId || !shopDomain) {
      return res.status(400).json({ error: 'Missing order id or shop' });
    }
    if (process.env.POPTEK_DISABLE_COMPLIANCE_SIDE_EFFECTS === '1') {
      return res.status(200).json({ received: true });
    }
    const result = await attributeOrderConversion(prisma, { shopDomain, orderId, total });
    res.status(200).json({ received: true, duplicate: Boolean(result.duplicate) });
  } catch (err) {
    next(err);
  }
}

export default router;
