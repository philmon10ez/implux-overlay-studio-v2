/** Labels for overlay creation requests (Shopify app form + email formatting). */

export const OVERLAY_TYPE_OPTIONS = [
  { value: 'banner_strip', label: 'Banner / top strip' },
  { value: 'modal_popup', label: 'Modal / popup' },
  { value: 'sticky_footer', label: 'Sticky footer / bar' },
  { value: 'spin_wheel', label: 'Spin wheel / game' },
  { value: 'product_badge', label: 'Product page badge / sticker' },
  { value: 'cart_upsell', label: 'Cart upsell / cross-sell' },
  { value: 'checkout_message', label: 'Checkout message' },
  { value: 'exit_intent', label: 'Exit-intent' },
  { value: 'other', label: 'Other (describe in notes)' },
];

export const PLACEMENT_OPTIONS = [
  { value: 'product_page', label: 'Product page' },
  { value: 'cart', label: 'Cart' },
  { value: 'checkout', label: 'Checkout' },
  { value: 'collection', label: 'Collection page' },
  { value: 'home', label: 'Homepage' },
  { value: 'site_wide', label: 'Site-wide' },
];

export const URGENCY_OPTIONS = [
  { value: 'standard', label: 'Standard timeline' },
  { value: 'soon', label: 'Needed soon (1–2 weeks)' },
  { value: 'rush', label: 'Rush (under 1 week)' },
];

export function labelByValue(options, value) {
  return options.find((o) => o.value === value)?.label || value || '—';
}
