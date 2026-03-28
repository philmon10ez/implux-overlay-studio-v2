/**
 * Canonical campaign.type strings stored in DB and consumed by the storefront engine.
 */
export const CAMPAIGN_TYPES = [
  'exit_intent',
  'time_delay',
  'scroll_depth',
  'welcome_mat',
  'upsell_modal',
  'promo_banner',
  'sticky_footer',
  'spin_wheel',
];

/**
 * Normalize admin/API input to a canonical type (snake_case, known aliases).
 * @param {unknown} raw
 * @returns {string}
 */
export function canonicalCampaignType(raw) {
  if (raw == null) return '';
  let s = String(raw)
    .toLowerCase()
    .trim()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  const aliases = {
    promo_code_banner: 'promo_banner',
    promocode_banner: 'promo_banner',
    promocodebanner: 'promo_banner',
    promobanner: 'promo_banner',
    promo_banner: 'promo_banner',
    sticky_footer_bar: 'sticky_footer',
    stickyfooter: 'sticky_footer',
    sticky_bar: 'sticky_footer',
    footer_bar: 'sticky_footer',
    bottom_bar: 'sticky_footer',
    spin_to_win: 'spin_wheel',
    spin_to_win_wheel: 'spin_wheel',
    spinwheel: 'spin_wheel',
    prize_wheel: 'spin_wheel',
    spin_the_wheel: 'spin_wheel',
  };
  if (aliases[s]) return aliases[s];
  if (CAMPAIGN_TYPES.includes(s)) return s;
  return s;
}

export function isKnownCampaignType(raw) {
  return CAMPAIGN_TYPES.includes(canonicalCampaignType(raw));
}
