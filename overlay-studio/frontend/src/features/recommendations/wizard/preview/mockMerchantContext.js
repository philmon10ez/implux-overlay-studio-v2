/**
 * Canonical mock storefront data for the recommendation live preview.
 * Kept in one module so future themes/templates can swap or extend scenarios.
 */

export const MOCK_MERCHANT = {
  storeDomain: 'your-store.myshopify.com',
  brandName: 'Northline Supply Co.',
  /** Product page being “viewed” in the simulator */
  pdp: {
    productTitle: 'Meridian Wool Coat',
    sku: 'MWC-OLIVE-M',
    price: 178,
    compareAt: 220,
    category: 'Outerwear',
    categories: ['Outerwear', 'Wool'],
    tags: ['new-arrival', 'winter'],
    collectionIds: [9100112233, 9100112234],
  },
  cart: {
    subtotal: 89,
    lines: [
      { title: 'Organic Cotton Tee', sku: 'TEE-WHT-S', linePrice: 38, qty: 1 },
      { title: 'Leather Belt', sku: 'BLT-BRN-OS', linePrice: 51, qty: 1 },
    ],
  },
};

/**
 * Build a page context compatible with trigger evaluators (mirrors backend shape).
 * @param {'product_page' | 'cart' | 'checkout'} placementType
 */
export function buildPreviewEvaluationContext(placementType) {
  const { pdp, cart } = MOCK_MERCHANT;
  const cartLineSkus = cart.lines.map((l) => l.sku);
  const base = {
    cartSubtotal: cart.subtotal,
    cartLineSkus,
    productCategory: pdp.category,
    productCategories: pdp.categories,
    resourceTags: pdp.tags,
    collectionIds: pdp.collectionIds,
  };
  if (placementType === 'product_page') {
    return { ...base, currentSku: pdp.sku };
  }
  return { ...base, currentSku: '' };
}

export function mockPdpPath() {
  const slug = MOCK_MERCHANT.pdp.productTitle.toLowerCase().replace(/\s+/g, '-');
  return `/products/${slug}`;
}
