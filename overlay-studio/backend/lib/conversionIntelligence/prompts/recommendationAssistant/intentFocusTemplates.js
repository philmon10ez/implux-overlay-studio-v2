/**
 * Per-intent focus blocks appended to the user payload so quick actions steer the model
 * without duplicating the full system prompt.
 *
 * Keys must stay in sync with normalizeAssistantIntent() in heuristicRecommendationAssistant.js
 * and frontend RECOMMENDATION_ASSISTANT_INTENTS.
 */

/** @param {string} intent — normalized (e.g. copy, products, optimize, custom) */
export function getIntentFocusBlock(intent) {
  const t = typeof intent === 'string' ? intent.trim().toLowerCase() : 'optimize';

  const blocks = {
    products: `
PRIMARY FOCUS: Product recommendations for this recommendation set.
- Evaluate whether the selected products fit the current placement (PDP vs cart vs checkout).
- Suggest adds/removals/reordering: complementary vs alternative items, basket-builders, low-friction add-ons.
- When the catalog sample is present, prefer concrete addProductIds for strong complements; never invent ids.
- Call out if the set is too large for checkout or too thin for cart.
`.trim(),

    placement: `
PRIMARY FOCUS: Placement optimization (product_page, cart, checkout).
- Compare current placement to the merchant’s goal implied by set name, products, and copy.
- PDP: discovery and contextual upsell; avoid overcrowding the product story.
- Cart: basket-building and justified add-ons; shopper already showed purchase intent.
- Checkout: minimal, high-confidence suggestions; friction sensitivity is highest.
- When recommending a placement change, set apply.placementType only when clearly better.
`.trim(),

    copy: `
PRIMARY FOCUS: CTA and on-brand copy (headline, supporting line, button label).
- Headlines: short, scannable, mobile-safe (aim ~40 characters or less for primary headline).
- Supporting line: one clear benefit or context (e.g. pairs with cart, ships together).
- CTA: verb-led, placement-appropriate (e.g. Add to cart on PDP/cart; Add to order on checkout).
- Avoid hype, ALL CAPS stacks, and vague labels like Learn more for commerce CTAs unless context demands it.
- Use apply.presentation only for confident, safe text changes.
`.trim(),

    frequency: `
PRIMARY FOCUS: Frequency capping and impression limits.
- Recommend session caps for cart/checkout when repeats would annoy; PDP may differ.
- Suggest per-day caps when merchants want broad reach without hammering returning visitors.
- Cooldowns when the same user might see the block across many pages in one journey.
- frequency_cap_type "none" is valid when the merchant explicitly wants always-on (explain tradeoffs).
- Use apply.frequencyCap with string numeric fields to match admin form conventions.
`.trim(),

    rules: `
PRIMARY FOCUS: Trigger conditions (targeting JSON).
- Align rules with placement: e.g. cart/checkout often benefit from non-empty cart or minimum subtotal when appropriate.
- Mention when empty {} is valid (always on for that placement) vs when targeting improves relevance.
- If suggesting triggerJson, output a single stringified JSON object; keys must match common evaluator fields (minCartSubtotal, maxCartSubtotal, requireNonEmptyCart, cartSkusAny, currentSkusAny, productCategory, tagsAny, collectionIdsAny, priority, etc.).
- Never output invalid JSON inside triggerJson.
`.trim(),

    general: `
PRIMARY FOCUS: General conversion optimization for this recommendation experience.
- Holistic view: product mix, placement fit, copy clarity, frequency, and targeting together.
- Prioritize 3–5 high-impact changes; mention measurement (what to A/B or watch in analytics) when useful.
`.trim(),

    optimize: `
PRIMARY FOCUS: Full optimization pass across products, placement, copy, frequency, and targeting.
- Produce a balanced set of suggestions covering the highest-leverage gaps first.
- Include at least one suggestion each for a different category when the configuration has material gaps.
`.trim(),

    custom: `
PRIMARY FOCUS: Answer the merchant’s specific question in "merchantQuestion".
- Still return the standard JSON schema; tie every suggestion to their question and the current configuration.
- If the question is out of scope, say so in summary and give the closest safe, actionable alternatives.
`.trim(),
  };

  if (t === 'custom' && blocks.custom) return blocks.custom;
  if (blocks[t]) return blocks[t];
  return blocks.optimize;
}
