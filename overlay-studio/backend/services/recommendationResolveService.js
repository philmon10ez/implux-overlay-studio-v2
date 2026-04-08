/**
 * Resolves active recommendation sets for a merchant + placement + page context.
 * Used by GET /proxy/recommendations (storefront) and optional admin tooling.
 */
import { PrismaClient } from '@prisma/client';
import { parsePlacementType } from '../lib/placementType.js';
import { serializeProductStorefront } from './productService.js';
import { evaluateRecommendationTriggers } from './recommendationRuleEvaluators.js';

const prisma = new PrismaClient();

const storefrontInclude = {
  productLinks: {
    orderBy: { sortOrder: 'asc' },
    include: { product: true },
  },
};

function priorityFromConditions(conditions) {
  if (!conditions || typeof conditions !== 'object') return 0;
  const p = Number(conditions.priority);
  return Number.isFinite(p) ? p : 0;
}

function serializeSetRow(row) {
  const products = (row.productLinks || []).map((link) => ({
    sortOrder: link.sortOrder,
    product: serializeProductStorefront(link.product),
  }));
  return {
    id: row.id,
    name: row.name,
    placementType: row.placementType,
    triggerConditions: row.triggerConditions ?? {},
    frequencyCap: row.frequencyCap ?? null,
    presetKey: row.presetKey ?? null,
    presetMetadata: row.presetMetadata ?? null,
    status: row.status,
    updatedAt: row.updatedAt,
    products,
  };
}

/**
 * @param {number} merchantId
 * @param {string} placement — product_page | cart | checkout
 * @param {import('./recommendationTargetContext.js').RecommendationPageContext} pageContext
 * @returns {Promise<{ sets: object[], debug?: object[] }>}
 */
export async function resolveRecommendationSetsForMerchant(merchantId, placement, pageContext, options = {}) {
  const placementEnum = parsePlacementType(placement);
  if (!placementEnum) {
    return { sets: [], debug: options.includeDebug ? [{ error: 'invalid placement' }] : undefined };
  }

  const ctx = { ...pageContext, pageType: placementEnum };

  const rows = await prisma.recommendationSet.findMany({
    where: {
      merchantId,
      status: 'active',
      placementType: placementEnum,
    },
    include: storefrontInclude,
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });

  /** @type {object[]} */
  const matched = [];
  /** @type {object[]} */
  const debug = options.includeDebug ? [] : null;

  for (const row of rows) {
    const conditions = row.triggerConditions ?? {};
    const { ok, failedRules } = evaluateRecommendationTriggers(conditions, ctx);
    if (debug) {
      debug.push({
        setId: row.id,
        name: row.name,
        matched: ok,
        failedRules: ok ? [] : failedRules,
        priority: priorityFromConditions(conditions),
      });
    }
    if (ok) matched.push(row);
  }

  matched.sort((a, b) => {
    const pa = priorityFromConditions(a.triggerConditions);
    const pb = priorityFromConditions(b.triggerConditions);
    if (pb !== pa) return pb - pa;
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  });

  return {
    sets: matched.map(serializeSetRow),
    debug: debug || undefined,
  };
}

/**
 * @param {string} shop — normalized shop domain
 * @param {string} placement
 * @param {import('./recommendationTargetContext.js').RecommendationPageContext} pageContext
 */
export async function resolveRecommendationSetsForShop(shop, placement, pageContext, options = {}) {
  const normalized = shop.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const merchant = await prisma.merchant.findFirst({
    where: {
      shopifyDomain: { in: [normalized, `https://${normalized}`, `https://${normalized}/`] },
      status: 'active',
    },
    select: { id: true },
  });
  if (!merchant) {
    return { sets: [], merchantId: null, debug: options.includeDebug ? [{ note: 'merchant not found' }] : undefined };
  }
  const result = await resolveRecommendationSetsForMerchant(merchant.id, placement, pageContext, options);
  return { ...result, merchantId: merchant.id };
}
