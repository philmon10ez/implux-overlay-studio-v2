export const PLACEMENT_OPTIONS = [
  { value: 'product_page', label: 'Product page', hint: 'Shown alongside product detail content' },
  { value: 'cart', label: 'Cart', hint: 'When the shopper views their cart' },
  { value: 'checkout', label: 'Checkout', hint: 'During checkout flow' },
];

export const TRIGGER_JSON_PLACEHOLDER = `{
  "priority": 10,
  "minCartSubtotal": 50,
  "maxCartSubtotal": null,
  "requireNonEmptyCart": false,
  "cartSkusAny": ["SKU-A", "SKU-B"],
  "cartSkusAll": [],
  "currentSkusAny": ["VARIANT-SKU"],
  "productCategory": "Apparel",
  "productCategoriesAny": ["Shirts", "Accessories"],
  "tagsAny": ["sale"],
  "collectionIdsAny": [123456789]
}`;

export function placementLabel(value) {
  return PLACEMENT_OPTIONS.find((p) => p.value === value)?.label ?? value;
}
