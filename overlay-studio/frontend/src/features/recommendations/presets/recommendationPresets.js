/**
 * Smart presets for recommendation sets — expand entries in RECOMMENDATION_PRESETS.
 * Allowed keys for API payloads: backend `lib/recommendationPresets.js` (catalog + VALID_RECOMMENDATION_PRESET_KEYS).
 */
import { mergeFrequencyCapFromApi } from '../../../lib/frequencyCapForm';

/** @typedef {'product_page'|'cart'|'checkout'} PlacementValue */

/**
 * @typedef {Object} RecommendationPresetPresentation
 * @property {string} headline
 * @property {string} subcopy
 * @property {string} ctaLabel
 */

/**
 * @typedef {Object} RecommendationPresetDefinition
 * @property {string} id
 * @property {string} title
 * @property {string} tagline
 * @property {string} [badge]
 * @property {PlacementValue} placementType
 * @property {string} suggestedName
 * @property {Record<string, unknown>} triggerConditions
 * @property {Record<string, unknown>} frequencyCap
 * @property {RecommendationPresetPresentation} presentation
 */

/** @type {Record<string, RecommendationPresetDefinition>} */
export const RECOMMENDATION_PRESETS = {
  high_conversion_upsell: {
    id: 'high_conversion_upsell',
    title: 'High conversion upsell',
    tagline: 'Product page add-ons with balanced frequency caps for repeat views.',
    badge: 'Popular',
    placementType: 'product_page',
    suggestedName: 'High-conversion upsell',
    triggerConditions: {
      priority: 20,
      requireNonEmptyCart: false,
    },
    frequencyCap: {
      frequency_cap_type: 'standard',
      max_impressions_per_session: 2,
      max_impressions_per_day: 8,
      cooldown_minutes: 30,
      max_impressions_lifetime: null,
    },
    presentation: {
      headline: 'Goes great with this',
      subcopy: 'Other shoppers paired these picks with what they are viewing.',
      ctaLabel: 'Add to cart',
    },
  },
  cart_booster: {
    id: 'cart_booster',
    title: 'Cart booster',
    tagline: 'Mid-funnel recommendations when the cart has meaningful value.',
    placementType: 'cart',
    suggestedName: 'Cart booster',
    triggerConditions: {
      priority: 18,
      requireNonEmptyCart: true,
      minCartSubtotal: 35,
    },
    frequencyCap: {
      frequency_cap_type: 'standard',
      max_impressions_per_session: 3,
      max_impressions_per_day: 12,
      cooldown_minutes: 20,
      max_impressions_lifetime: null,
    },
    presentation: {
      headline: 'Complete your cart',
      subcopy: 'Popular add-ons for orders like yours.',
      ctaLabel: 'Add to cart',
    },
  },
  checkout_addon: {
    id: 'checkout_addon',
    title: 'Checkout add-on',
    tagline: 'Light-touch, respectful caps during checkout.',
    placementType: 'checkout',
    suggestedName: 'Checkout add-on',
    triggerConditions: {
      priority: 25,
      requireNonEmptyCart: true,
      minCartSubtotal: 25,
    },
    frequencyCap: {
      frequency_cap_type: 'standard',
      max_impressions_per_session: 1,
      max_impressions_per_day: 4,
      cooldown_minutes: 60,
      max_impressions_lifetime: null,
    },
    presentation: {
      headline: 'Before you pay',
      subcopy: 'One last suggestion — easy to skip if it is not for you.',
      ctaLabel: 'Add',
    },
  },
};

export const RECOMMENDATION_PRESET_LIST = Object.values(RECOMMENDATION_PRESETS);

const SCRATCH_ID = 'from_scratch';

/**
 * Apply a preset to wizard state shape (call setters from the editor).
 * @param {string} presetId — key in RECOMMENDATION_PRESETS or SCRATCH_ID
 * @param {{ setPlacementType: Function, setName: Function, setTriggerJson: Function, setFrequencyCap: Function, setPresentation: Function, setPresetKey: Function }} setters
 * @param {{ keepName?: boolean }} [opts]
 */
export function applyRecommendationPreset(presetId, setters, opts = {}) {
  const { setPlacementType, setName, setTriggerJson, setFrequencyCap, setPresentation, setPresetKey } = setters;
  if (presetId === SCRATCH_ID || !RECOMMENDATION_PRESETS[presetId]) {
    setPresetKey(null);
    setPlacementType('product_page');
    setTriggerJson('{}');
    setFrequencyCap({
      frequency_cap_type: 'standard',
      max_impressions_per_session: '1',
      max_impressions_per_day: '',
      cooldown_minutes: '',
      max_impressions_lifetime: '',
    });
    setPresentation({ headline: '', subcopy: '', ctaLabel: '' });
    return;
  }
  const p = RECOMMENDATION_PRESETS[presetId];
  setPresetKey(p.id);
  setPlacementType(p.placementType);
  if (!opts.keepName) setName(p.suggestedName);
  setTriggerJson(JSON.stringify(p.triggerConditions, null, 2));
  setFrequencyCap(mergeFrequencyCapFromApi(p.frequencyCap));
  setPresentation({ ...p.presentation });
}

export { SCRATCH_ID };

export function getPresetLabel(presetKey) {
  if (!presetKey) return null;
  return RECOMMENDATION_PRESETS[presetKey]?.title ?? presetKey;
}
