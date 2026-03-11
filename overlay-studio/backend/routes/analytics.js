/**
 * Analytics — overview, timeseries, by merchant, top campaigns. All protected.
 */
import express from 'express';
import { PrismaClient } from '@prisma/client';
import auth from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

router.use(auth);

// GET /api/analytics/overview
router.get('/overview', async (req, res, next) => {
  try {
    const [impressions, clicks, conversions, revenue] = await Promise.all([
      prisma.campaign.aggregate({ _sum: { impressions: true } }),
      prisma.campaign.aggregate({ _sum: { clicks: true } }),
      prisma.campaign.aggregate({ _sum: { conversions: true } }),
      prisma.campaign.aggregate({ _sum: { revenueAttributed: true } }),
    ]);
    res.json({
      impressions: Number(impressions._sum.impressions ?? 0),
      clicks: Number(clicks._sum.clicks ?? 0),
      conversions: Number(conversions._sum.conversions ?? 0),
      revenue: Number(revenue._sum.revenueAttributed ?? 0),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/timeseries?startDate=&endDate=&campaignId=
router.get('/timeseries', async (req, res, next) => {
  try {
    const { startDate, endDate, campaignId } = req.query;
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();
    const cid = campaignId ? parseInt(campaignId, 10) : undefined;
    const where = { timestamp: { gte: start, lte: end } };
    if (!Number.isNaN(cid)) where.campaignId = cid;
    const events = await prisma.campaignEvent.findMany({
      where,
      orderBy: { timestamp: 'asc' },
      select: { timestamp: true, eventType: true, orderValue: true, campaignId: true },
    });
    const byDay = {};
    for (const e of events) {
      const d = e.timestamp.toISOString().slice(0, 10);
      if (!byDay[d]) byDay[d] = { date: d, impressions: 0, clicks: 0, conversions: 0, revenue: 0 };
      if (e.eventType === 'impression') byDay[d].impressions += 1;
      else if (e.eventType === 'click') byDay[d].clicks += 1;
      else if (e.eventType === 'conversion') {
        byDay[d].conversions += 1;
        byDay[d].revenue += Number(e.orderValue ?? 0);
      }
    }
    const series = Object.keys(byDay)
      .sort()
      .map((d) => byDay[d]);
    res.json({ series });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/bymerchant
router.get('/bymerchant', async (req, res, next) => {
  try {
    const merchants = await prisma.merchant.findMany({
      include: {
        campaigns: {
          select: {
            impressions: true,
            clicks: true,
            conversions: true,
            revenueAttributed: true,
          },
        },
      },
    });
    const result = merchants.map((m) => {
      const campaigns = m.campaigns;
      const impressions = campaigns.reduce((s, c) => s + (c.impressions ?? 0), 0);
      const clicks = campaigns.reduce((s, c) => s + (c.clicks ?? 0), 0);
      const conversions = campaigns.reduce((s, c) => s + (c.conversions ?? 0), 0);
      const revenue = campaigns.reduce((s, c) => s + Number(c.revenueAttributed ?? 0), 0);
      return {
        merchantId: m.id,
        storeName: m.storeName,
        shopifyDomain: m.shopifyDomain,
        impressions,
        clicks,
        conversions,
        revenue,
      };
    });
    res.json({ byMerchant: result });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/topcampaigns
router.get('/topcampaigns', async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const campaigns = await prisma.campaign.findMany({
      orderBy: [{ revenueAttributed: 'desc' }, { conversions: 'desc' }],
      take: limit,
      include: { merchant: { select: { storeName: true, shopifyDomain: true } } },
    });
    res.json({
      topCampaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        merchant: c.merchant,
        status: c.status,
        impressions: c.impressions,
        clicks: c.clicks,
        conversions: c.conversions,
        revenueAttributed: Number(c.revenueAttributed ?? 0),
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
