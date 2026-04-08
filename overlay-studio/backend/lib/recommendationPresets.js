/**
 * Recommendation set presets — single source for API validation and catalog summaries.
 * Full wizard defaults live in the admin bundle: `frontend/.../presets/recommendationPresets.js`.
 */

/**
 * Public catalog for GET /api/recommendation-sets/presets/catalog (auth).
 * @type {readonly { id: string, title: string, tagline: string, badge?: string, placementType: string }[]}
 */
export const RECOMMENDATION_PRESET_CATALOG = [
  {
    id: 'high_conversion_upsell',
    title: 'High conversion upsell',
    tagline: 'Product page add-ons with balanced frequency caps.',
    badge: 'Popular',
    placementType: 'product_page',
  },
  {
    id: 'cart_booster',
    title: 'Cart booster',
    tagline: 'Recommendations when the cart has meaningful value.',
    placementType: 'cart',
  },
  {
    id: 'checkout_addon',
    title: 'Checkout add-on',
    tagline: 'Light-touch suggestions during checkout.',
    placementType: 'checkout',
  },
];

/** @type {readonly string[]} */
export const VALID_RECOMMENDATION_PRESET_KEYS = Object.freeze(
  RECOMMENDATION_PRESET_CATALOG.map((e) => e.id)
);

/**
 * @param {object} body
 * @returns {{ ok: true, explicit: boolean, value: string | null } | { ok: false, error: string }}
 */
export function parsePresetKeyInput(body) {
  const raw = body?.presetKey ?? body?.preset_key;
  if (raw === undefined) return { ok: true, explicit: false, value: null };
  if (raw === null || raw === '') return { ok: true, explicit: true, value: null };
  const k = String(raw).trim();
  if (!VALID_RECOMMENDATION_PRESET_KEYS.includes(k)) return { ok: false, error: 'invalid presetKey' };
  return { ok: true, explicit: true, value: k };
}

/**
 * @param {object} body
 * @returns {{ ok: true, explicit: boolean, value: object | null | undefined } | { ok: false, error: string }}
 */
export function parsePresetMetadataInput(body) {
  const raw = body?.presetMetadata ?? body?.preset_metadata;
  if (raw === undefined) return { ok: true, explicit: false, value: undefined };
  if (raw === null) return { ok: true, explicit: true, value: null };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'invalid presetMetadata' };
  return { ok: true, explicit: true, value: sanitizePresetMetadata(raw) };
}

export function sanitizePresetMetadata(raw) {
  if (raw === undefined) return undefined;
  if (raw === null) return null;
  if (typeof raw !== 'object' || Array.isArray(raw)) return null;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const out = { ...o };
  if (out.presentation && typeof out.presentation === 'object' && !Array.isArray(out.presentation)) {
    const pr = /** @type {Record<string, unknown>} */ (out.presentation);
    out.presentation = {
      headline: pr.headline != null ? String(pr.headline).slice(0, 500) : '',
      subcopy: pr.subcopy != null ? String(pr.subcopy).slice(0, 1000) : '',
      ctaLabel: pr.ctaLabel != null ? String(pr.ctaLabel).slice(0, 120) : '',
    };
  }
  if (typeof out.schemaVersion === 'number' && Number.isFinite(out.schemaVersion)) {
    out.schemaVersion = Math.floor(out.schemaVersion);
  }
  return out;
}
