/**
 * App proxy — HMAC verified (GET) or Shopify webhook (POST), NOT auth. Called from storefront.
 * GET /proxy/campaigns?shop= — active campaigns for shop
 * GET /proxy/track?event=&campaign_id=&shop= — log impression/click
 * POST /proxy/conversion — Shopify orders/create webhook
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import optionalProxyHmac from '../middleware/optionalProxyHmac.js';
import { verifyWebhook } from '../services/shopifyService.js';

const router = express.Router();
const prisma = new PrismaClient();

// GET /proxy/campaigns?shop=
router.get('/campaigns', optionalProxyHmac, async (req, res, next) => {
  try {
    const shop = (req.query.shop ?? '').toString().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
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
        triggerConfig: true,
        designConfig: true,
        promoCode: true,
      },
    });
    res.json({ campaigns });
  } catch (err) {
    next(err);
  }
});

// GET /proxy/track?event=&campaign_id=&shop=
router.get('/track', optionalProxyHmac, async (req, res, next) => {
  try {
    const event = (req.query.event ?? '').toString().toLowerCase();
    const campaignId = parseInt(req.query.campaign_id, 10);
    const shop = (req.query.shop ?? '').toString().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
    if (!event || !['impression', 'click'].includes(event)) {
      return res.status(400).json({ error: 'event must be impression or click' });
    }
    if (Number.isNaN(campaignId) || campaignId < 1) {
      return res.status(400).json({ error: 'campaign_id required' });
    }
    if (!shop) return res.status(400).json({ error: 'shop required' });
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
    const update = event === 'impression' ? { impressions: { increment: 1 } } : { clicks: { increment: 1 } };
    await prisma.campaign.update({
      where: { id: campaignId },
      data: update,
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /proxy/conversion — Shopify orders/create webhook (verified via X-Shopify-Hmac-Sha256)
router.post('/conversion', async (req, res, next) => {
  try {
    const rawBody = req.rawBody;
    const body = rawBody
      ? (Buffer.isBuffer(rawBody) ? JSON.parse(rawBody.toString('utf8')) : JSON.parse(String(rawBody)))
      : req.body ?? {};
    if (!verifyWebhook(req)) {
      return res.status(401).json({ error: 'Invalid webhook HMAC' });
    }
    const orderId = body?.id?.toString() ?? body?.order_id?.toString();
    const total = parseFloat(body?.total_price ?? body?.total_price_set?.shop_money?.amount ?? 0);
    const shopDomain = (body?.source_name ?? req.headers['x-shopify-shop-domain'] ?? '').toString();
    if (!orderId || !shopDomain) {
      return res.status(400).json({ error: 'Missing order id or shop' });
    }
    const merchant = await prisma.merchant.findFirst({
      where: {
        shopifyDomain: { contains: shopDomain.replace(/^https?:\/\//, '').split('/')[0] },
        status: 'active',
      },
    });
    if (!merchant) return res.json({ received: true });
    // Find a campaign for this merchant to attribute (e.g. most recent active or by session — here we pick first active)
    const campaign = await prisma.campaign.findFirst({
      where: { merchantId: merchant.id, status: 'active' },
      orderBy: { updatedAt: 'desc' },
    });
    if (campaign) {
      await prisma.campaignEvent.create({
        data: {
          campaignId: campaign.id,
          eventType: 'conversion',
          shopDomain: merchant.shopifyDomain,
          orderId,
          orderValue: total,
        },
      });
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: {
          conversions: { increment: 1 },
          revenueAttributed: { increment: total },
        },
      });
    }
    res.status(200).json({ received: true });
  } catch (err) {
    next(err);
  }
});

export default router;
