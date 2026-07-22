/**
 * Shopify mandatory GDPR/compliance webhooks — safe logging and deferred processing.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const COMPLIANCE_TOPICS = new Set([
  'customers/data_request',
  'customers/redact',
  'shop/redact',
]);

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
    return true;
  } catch (err) {
    if (err?.code === 'P2002') return false;
    return true;
  }
}

export function isComplianceTopic(topic) {
  return COMPLIANCE_TOPICS.has(topic);
}

function normalizeShopDomain(domain) {
  return String(domain || '')
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/$/, '');
}

function safeComplianceLog(meta) {
  console.log('[shopify-compliance]', JSON.stringify(meta));
}

/**
 * Defer slow privacy work so the webhook response stays fast.
 * @param {string} topic
 * @param {object} payload — parsed JSON; do not log customer fields
 */
export function queueComplianceProcessing(topic, payload) {
  setImmediate(() => {
    processComplianceWebhook(topic, payload).catch((err) => {
      console.error('[shopify-compliance] deferred processing failed', {
        topic,
        shopDomain: normalizeShopDomain(payload?.shop_domain),
        error: err?.message ?? 'unknown',
      });
    });
  });
}

async function processComplianceWebhook(topic, payload) {
  const shopDomain = normalizeShopDomain(payload?.shop_domain);

  switch (topic) {
    case 'customers/data_request':
      // TODO: Connect customer data export workflow (email or secure download to merchant).
      safeComplianceLog({
        action: 'customers_data_request_acknowledged',
        shopDomain,
      });
      break;

    case 'customers/redact':
      await redactCustomerOrders(shopDomain, payload?.orders_to_redact);
      safeComplianceLog({
        action: 'customers_redact_completed',
        shopDomain,
      });
      break;

    case 'shop/redact':
      await redactShopData(shopDomain);
      safeComplianceLog({
        action: 'shop_redact_completed',
        shopDomain,
      });
      break;

    default:
      safeComplianceLog({
        action: 'ignored_unknown_topic',
        topic,
        shopDomain,
      });
  }
}

async function redactCustomerOrders(shopDomain, ordersToRedact) {
  const orderIds = Array.isArray(ordersToRedact)
    ? ordersToRedact.map((id) => String(id)).filter(Boolean)
    : [];
  if (!shopDomain || orderIds.length === 0) return;

  await prisma.campaignEvent.updateMany({
    where: {
      shopDomain,
      orderId: { in: orderIds },
    },
    data: {
      orderId: null,
      orderValue: null,
    },
  });
}

async function redactShopData(shopDomain) {
  if (!shopDomain) return;

  const merchant = await prisma.merchant.findUnique({
    where: { shopifyDomain: shopDomain },
    select: { id: true },
  });
  if (!merchant) return;

  await prisma.$transaction([
    prisma.campaignEvent.deleteMany({ where: { shopDomain } }),
    prisma.campaign.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.recommendationSetProduct.deleteMany({
      where: { recommendationSet: { merchantId: merchant.id } },
    }),
    prisma.recommendationSet.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.product.deleteMany({ where: { merchantId: merchant.id } }),
    prisma.merchant.update({
      where: { id: merchant.id },
      data: {
        status: 'redacted',
        accessToken: '',
        storeName: 'Redacted',
      },
    }),
  ]);
}
