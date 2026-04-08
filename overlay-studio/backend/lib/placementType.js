/** @typedef {'product_page' | 'cart' | 'checkout'} PlacementType */

const CANON = {
  product_page: 'product_page',
  productpage: 'product_page',
  'product-page': 'product_page',
  cart: 'cart',
  checkout: 'checkout',
};

/**
 * @param {unknown} raw
 * @returns {PlacementType | null}
 */
export function parsePlacementType(raw) {
  if (raw == null || raw === '') return null;
  const k = String(raw)
    .toLowerCase()
    .trim()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_');
  return CANON[k] ?? null;
}

/**
 * @param {unknown} raw
 * @returns {boolean}
 */
export function isValidPlacementType(raw) {
  return parsePlacementType(raw) != null;
}
