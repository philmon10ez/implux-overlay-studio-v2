/**
 * Attribute an orders/create webhook once per shop and order id.
 * Uses the existing ShopifyWebhookDelivery table so no new migration is required to boot.
 */
import { normalizeProxyShop } from '../../shared/storefrontProxyAuth.js';

/**
 * @param {import('@prisma/client').PrismaClient} db
 * @param {{ shopDomain: string, orderId: string, total: number }} input
 */
export async function attributeOrderConversion(db, input) {
  const shopDomain = normalizeProxyShop(input.shopDomain);
  const orderId = String(input.orderId || '').trim();
  const total = Number.isFinite(input.total) ? input.total : 0;
  if (!shopDomain || !orderId) {
    return { ok: false, reason: 'missing' };
  }
  const deliveryId = `order:${shopDomain}:${orderId}`.slice(0, 180);
  try {
    await db.shopifyWebhookDelivery.create({
      data: {
        id: deliveryId,
        topic: 'orders/create',
        shopDomain,
      },
    });
  } catch (err) {
    if (err?.code === 'P2002') return { ok: true, duplicate: true };
    throw err;
  }

  const merchant = await db.merchant.findFirst({
    where: {
      OR: [{ shopifyDomain: shopDomain }, { shopifyDomain: `https://${shopDomain}` }],
      status: 'active',
    },
  });
  if (!merchant) return { ok: true, duplicate: false, attributed: false };

  const campaign = await db.campaign.findFirst({
    where: { merchantId: merchant.id, status: 'active' },
    orderBy: { updatedAt: 'desc' },
  });
  if (!campaign) return { ok: true, duplicate: false, attributed: false };

  await db.campaignEvent.create({
    data: {
      campaignId: campaign.id,
      eventType: 'conversion',
      shopDomain: merchant.shopifyDomain,
      orderId,
      orderValue: total,
    },
  });
  await db.campaign.update({
    where: { id: campaign.id },
    data: {
      conversions: { increment: 1 },
      revenueAttributed: { increment: total },
    },
  });
  return { ok: true, duplicate: false, attributed: true };
}
