/**
 * Shopify mandatory privacy webhooks.
 * Payloads are not logged. Shop matching is exact after normalization so one shop
 * cannot delete another shop's rows.
 */
import { PrismaClient } from '@prisma/client';
import { normalizeProxyShop } from '../../shared/storefrontProxyAuth.js';

const prisma = new PrismaClient();

const COMPLIANCE_TOPICS = new Set([
  'customers/data_request',
  'customers/redact',
  'shop/redact',
]);

const WEBHOOK_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * @param {unknown} domain
 */
export function canonicalShopDomain(domain) {
  const shop = normalizeProxyShop(domain);
  if (!/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/.test(shop)) return '';
  if (shop.includes('..') || shop.length > 255) return '';
  return shop;
}

/**
 * @param {string} shop
 */
export function shopDomainVariants(shop) {
  return [shop, `https://${shop}`, `https://${shop}/`];
}

export function complianceSideEffectsEnabled(env = process.env) {
  return env.POPTEK_DISABLE_COMPLIANCE_SIDE_EFFECTS !== '1';
}

/**
 * @returns {Promise<boolean>} true when this delivery was already processed
 */
export async function isDuplicateWebhookDelivery(webhookId) {
  if (!webhookId) return false;
  try {
    const existing = await prisma.shopifyWebhookDelivery.findUnique({
      where: { id: webhookId },
      select: { id: true },
    });
    return Boolean(existing);
  } catch {
    return false;
  }
}

/**
 * @returns {Promise<boolean>} true when recorded (first delivery)
 */
export async function recordWebhookDelivery(webhookId, topic, shopDomain) {
  if (!webhookId) return true;
  try {
    await prisma.shopifyWebhookDelivery.create({
      data: {
        id: webhookId,
        topic,
        shopDomain,
      },
    });
    await purgeOldWebhookDeliveries(prisma).catch(() => {});
    return true;
  } catch (err) {
    if (err?.code === 'P2002') return false;
    return true;
  }
}

/**
 * @param {{ shopifyWebhookDelivery: { deleteMany: Function } }} db
 */
export async function purgeOldWebhookDeliveries(db, now = Date.now()) {
  await db.shopifyWebhookDelivery.deleteMany({
    where: { receivedAt: { lt: new Date(now - WEBHOOK_RETENTION_MS) } },
  });
}

export function isComplianceTopic(topic) {
  return COMPLIANCE_TOPICS.has(topic);
}

function safeComplianceLog(meta) {
  console.log('[shopify-compliance]', JSON.stringify(meta));
}

/**
 * @param {string} topic
 * @param {object} payload
 */
export function queueComplianceProcessing(topic, payload) {
  if (!complianceSideEffectsEnabled()) return;
  setImmediate(() => {
    runComplianceWebhook(prisma, topic, payload).catch((err) => {
      console.error('[security] compliance_webhook_failed', {
        topic,
        shopDomain: canonicalShopDomain(payload?.shop_domain),
        error: err?.code || err?.name || 'unknown',
      });
    });
  });
}

/**
 * @param {object} db
 * @param {string} topic
 * @param {object} payload
 */
export async function runComplianceWebhook(db, topic, payload) {
  const shopDomain = canonicalShopDomain(payload?.shop_domain);
  if (!shopDomain) {
    safeComplianceLog({ action: 'ignored_invalid_shop', topic });
    return { ok: false, reason: 'invalid_shop' };
  }

  switch (topic) {
    case 'customers/data_request': {
      const inventory = await buildCustomerDataInventory(db, shopDomain, payload?.orders_requested);
      safeComplianceLog({
        action: 'customers_data_request_recorded',
        shopDomain,
        matchCount: inventory.matchCount,
      });
      return { ok: true, inventory };
    }
    case 'customers/redact': {
      const result = await redactCustomerOrders(db, shopDomain, payload?.orders_to_redact);
      safeComplianceLog({
        action: 'customers_redact_completed',
        shopDomain,
        updated: result.updated,
      });
      return { ok: true, ...result };
    }
    case 'shop/redact': {
      const result = await redactShopData(db, shopDomain);
      safeComplianceLog({
        action: 'shop_redact_completed',
        shopDomain,
        found: result.found,
      });
      return { ok: true, ...result };
    }
    default:
      safeComplianceLog({ action: 'ignored_unknown_topic', topic, shopDomain });
      return { ok: false, reason: 'unknown_topic' };
  }
}

/**
 * Private inventory of order ids this app holds for a data request.
 * Customer email and phone from the webhook are not copied into the result.
 * @param {object} db
 * @param {string} shopDomain
 * @param {unknown} ordersRequested
 */
export async function buildCustomerDataInventory(db, shopDomain, ordersRequested) {
  const shop = canonicalShopDomain(shopDomain);
  const orderIdsRequested = Array.isArray(ordersRequested)
    ? ordersRequested.map((id) => String(id)).filter(Boolean)
    : [];
  if (!shop || orderIdsRequested.length === 0) {
    return { shopDomain: shop, matchCount: 0, orderIds: [], searchedOrderCount: orderIdsRequested.length };
  }
  const rows = await db.campaignEvent.findMany({
    where: {
      shopDomain: { in: shopDomainVariants(shop) },
      orderId: { in: orderIdsRequested },
    },
    select: { orderId: true },
  });
  const orderIds = [...new Set(rows.map((row) => row.orderId).filter(Boolean))];
  return {
    shopDomain: shop,
    matchCount: orderIds.length,
    orderIds,
    searchedOrderCount: orderIdsRequested.length,
  };
}

/**
 * @param {object} db
 * @param {string} shopDomain
 * @param {unknown} ordersToRedact
 */
export async function redactCustomerOrders(db, shopDomain, ordersToRedact) {
  const shop = canonicalShopDomain(shopDomain);
  const orderIds = Array.isArray(ordersToRedact)
    ? ordersToRedact.map((id) => String(id)).filter(Boolean)
    : [];
  if (!shop || orderIds.length === 0) return { updated: 0 };
  const result = await db.campaignEvent.updateMany({
    where: {
      shopDomain: { in: shopDomainVariants(shop) },
      orderId: { in: orderIds },
    },
    data: {
      orderId: null,
      orderValue: null,
    },
  });
  return { updated: result?.count ?? 0 };
}

/**
 * @param {object} db
 * @param {string} shopDomain
 */
export async function redactShopData(db, shopDomain) {
  const shop = canonicalShopDomain(shopDomain);
  if (!shop) return { found: false, reason: 'invalid_shop' };

  const merchant = await db.merchant.findUnique({
    where: { shopifyDomain: shop },
    select: { id: true },
  });

  if (merchant) {
    await db.campaignEvent.deleteMany({ where: { shopDomain: { in: shopDomainVariants(shop) } } });
    await db.campaign.deleteMany({ where: { merchantId: merchant.id } });
    await db.recommendationSetProduct.deleteMany({
      where: { recommendationSet: { merchantId: merchant.id } },
    });
    await db.recommendationSet.deleteMany({ where: { merchantId: merchant.id } });
    await db.product.deleteMany({ where: { merchantId: merchant.id } });
    await db.merchant.update({
      where: { id: merchant.id },
      data: {
        status: 'redacted',
        accessToken: '',
        storeName: 'Redacted',
      },
    });
  }

  await deleteShopSessions(db, shop);
  await deleteShopSubmissions(db, shop);
  return { found: Boolean(merchant), shop };
}

/**
 * @param {object} db
 * @param {string} shop
 */
export async function deleteShopSessions(db, shop) {
  const canonical = canonicalShopDomain(shop);
  if (!canonical || !db.$executeRaw) return 0;
  return db.$executeRaw`
    DELETE FROM "Session"
    WHERE lower(shop) = ${canonical}
       OR lower(shop) = ${`https://${canonical}`}
       OR lower(shop) = ${`https://${canonical}/`}
  `;
}

/**
 * @param {object} db
 * @param {string} shop
 */
export async function deleteShopSubmissions(db, shop) {
  const canonical = canonicalShopDomain(shop);
  if (!canonical || !db.$executeRaw) return 0;
  return db.$executeRaw`
    DELETE FROM "OverlaySubmission"
    WHERE lower("shopDomain") = ${canonical}
       OR lower("shopDomain") = ${`https://${canonical}`}
       OR lower("shopDomain") = ${`https://${canonical}/`}
  `;
}
