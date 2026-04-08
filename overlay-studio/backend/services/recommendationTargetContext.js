/**
 * Normalized page context for recommendation targeting (storefront + tests).
 * Populated from proxy query params, JSON `context`, or programmatically.
 *
 * @typedef {Object} RecommendationPageContext
 * @property {'product_page'|'cart'|'checkout'} pageType
 * @property {string} [currentSku] — primary product variant SKU (product page)
 * @property {string} [productCategory] — single category / product type
 * @property {string[]} [productCategories] — optional multi-category context
 * @property {number|null} [cartSubtotal] — cart total in shop currency (major units, e.g. dollars)
 * @property {string[]} [cartLineSkus] — SKUs currently in cart
 * @property {Array<{ sku?: string, quantity?: number }>} [cartLineItems] — optional line detail for future rules
 * @property {string[]} [resourceTags] — product / resource tags (lowercase recommended)
 * @property {number[]} [collectionIds] — Shopify collection numeric ids
 */

import { parsePlacementType } from '../lib/placementType.js';

/**
 * Example contexts for unit-style checks and documentation.
 * Use with evaluateRecommendationTriggers from recommendationRuleEvaluators.js
 */
export const EXAMPLE_PAGE_CONTEXTS = {
  productPageSimple: {
    pageType: 'product_page',
    currentSku: 'TEE-BLK-M',
    productCategory: 'Apparel',
    resourceTags: ['new-arrival'],
    collectionIds: [1001],
  },
  cartMidValue: {
    pageType: 'cart',
    cartSubtotal: 75.5,
    cartLineSkus: ['TEE-BLK-M', 'HAT-01'],
    cartLineItems: [
      { sku: 'TEE-BLK-M', quantity: 1 },
      { sku: 'HAT-01', quantity: 2 },
    ],
  },
  checkoutHighValue: {
    pageType: 'checkout',
    cartSubtotal: 250,
    cartLineSkus: ['GIFT-BOX'],
    resourceTags: ['vip'],
  },
  productNoMatch: {
    pageType: 'product_page',
    currentSku: 'OTHER-SKU',
    productCategory: 'Home',
  },
};

/**
 * @param {Record<string, string | undefined>} query - Express req.query
 * @returns {RecommendationPageContext}
 */
export function buildContextFromProxyQuery(query) {
  const placementRaw = query.placement ?? query.page ?? '';
  const pageType = parsePlacementType(placementRaw) || parsePlacementType(query.pageType) || 'product_page';

  /** @type {RecommendationPageContext} */
  const ctx = {
    pageType,
  };

  if (query.currentSku != null && String(query.currentSku).trim()) {
    ctx.currentSku = String(query.currentSku).trim();
  }
  if (query.productCategory != null && String(query.productCategory).trim()) {
    ctx.productCategory = String(query.productCategory).trim();
  }
  if (query.cartSubtotal != null && String(query.cartSubtotal).trim() !== '') {
    const n = Number(query.cartSubtotal);
    if (Number.isFinite(n)) ctx.cartSubtotal = n;
  }

  if (query.cartSkus != null && String(query.cartSkus).trim()) {
    ctx.cartLineSkus = splitCommaList(String(query.cartSkus));
  }
  if (query.tags != null && String(query.tags).trim()) {
    ctx.resourceTags = splitCommaList(String(query.tags)).map((t) => t.toLowerCase());
  }
  if (query.collectionIds != null && String(query.collectionIds).trim()) {
    ctx.collectionIds = String(query.collectionIds)
      .split(/[,;]+/)
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n));
  }

  if (query.context != null && String(query.context).trim()) {
    try {
      const parsed = JSON.parse(String(query.context));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        mergeStructuredContext(ctx, parsed);
      }
    } catch {
      /* ignore invalid JSON */
    }
  }

  return ctx;
}

/**
 * Deep-merge known fields from a JSON object (e.g. theme-provided context).
 * @param {RecommendationPageContext} target
 * @param {object} source
 */
export function mergeStructuredContext(target, source) {
  if (source.currentSku != null) target.currentSku = String(source.currentSku).trim();
  if (source.productCategory != null) target.productCategory = String(source.productCategory).trim();
  if (Array.isArray(source.productCategories)) {
    target.productCategories = source.productCategories.map((x) => String(x));
  }
  if (source.cartSubtotal != null && Number.isFinite(Number(source.cartSubtotal))) {
    target.cartSubtotal = Number(source.cartSubtotal);
  }
  if (Array.isArray(source.cartLineSkus)) {
    target.cartLineSkus = source.cartLineSkus.map((s) => String(s).trim()).filter(Boolean);
  }
  if (Array.isArray(source.cartLineItems)) {
    target.cartLineItems = source.cartLineItems.map((it) => ({
      sku: it.sku != null ? String(it.sku) : undefined,
      quantity: it.quantity != null ? Number(it.quantity) : undefined,
    }));
  }
  if (Array.isArray(source.resourceTags)) {
    target.resourceTags = source.resourceTags.map((t) => String(t).toLowerCase());
  }
  if (Array.isArray(source.collectionIds)) {
    target.collectionIds = source.collectionIds.map((n) => parseInt(String(n), 10)).filter((x) => !Number.isNaN(x));
  }
  if (source.pageType != null) {
    const p = parsePlacementType(source.pageType);
    if (p) target.pageType = p;
  }
}

function splitCommaList(s) {
  return s
    .split(/[,;]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}
