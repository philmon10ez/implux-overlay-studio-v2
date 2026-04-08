/**
 * Deterministic recommendation suggestions (fallback and no-AI mode).
 */

const PLACEMENTS = new Set(['product_page', 'cart', 'checkout']);

/** @param {string} raw */
export function normalizeAssistantIntent(raw) {
  const t = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (t === 'cta' || t === 'copy' || t === 'text') return 'copy';
  if (['products', 'placement', 'frequency', 'rules', 'optimize', 'custom', 'general'].includes(t)) return t;
  return t || 'optimize';
}

function safeTrim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

function parseTriggerJson(raw) {
  const t = safeTrim(raw);
  if (!t) return { ok: true, value: {} };
  try {
    const v = JSON.parse(t);
    if (v === null || typeof v !== 'object' || Array.isArray(v)) return { ok: false, value: {} };
    return { ok: true, value: v };
  } catch {
    return { ok: false, value: {} };
  }
}

function isEmptyTrigger(obj) {
  return Object.keys(obj).length === 0;
}

/**
 * @param {object} ctx
 * @returns {{ source: 'heuristic', summary: string, reasoning: string, suggestions: object[] }}
 */
export function buildHeuristicRecommendationSuggestions(ctx) {
  const {
    placementType,
    name,
    presentation = {},
    frequencyCap = {},
    triggerJson = '',
    productCount = 0,
    productTitles = [],
  } = ctx;

  const pt = PLACEMENTS.has(placementType) ? placementType : 'product_page';
  const headline = safeTrim(presentation.headline);
  const subcopy = safeTrim(presentation.subcopy);
  const cta = safeTrim(presentation.ctaLabel);
  const trig = parseTriggerJson(triggerJson);
  const triggerEmpty = trig.ok && isEmptyTrigger(trig.value);

  const suggestions = [];

  if (productCount === 0) {
    suggestions.push({
      id: 'ci-products-empty',
      category: 'products',
      title: 'Add products before you publish',
      detail:
        'Shoppers only see SKUs you attach to this set. Start with 1–3 strong complements (accessories, consumables, or upgrades) that fit the placement context.',
      reasoning: 'Empty product lists cannot drive add-to-cart events.',
      apply: null,
    });
  }

  if (pt === 'checkout' && productCount > 3) {
    suggestions.push({
      id: 'ci-checkout-focus',
      category: 'products',
      title: 'Tighten checkout add-ons',
      detail:
        'At payment, keep recommendations to a small set (often 1–3). Too many options increases abandonment; reorder so the best fits appear first.',
      reasoning: 'Checkout cognitive load correlates with fewer, sharper choices.',
      apply: null,
    });
  }

  if (pt === 'cart' && productCount > 0 && productCount < 3) {
    suggestions.push({
      id: 'ci-cart-basket',
      category: 'products',
      title: 'Cart placements convert with clear complements',
      detail:
        'Try adding one more item that pairs with common cart contents (same collection, “complete the look,” or low-friction add-on).',
      reasoning: 'Cart context supports multi-item narratives when the set stays small.',
      apply: null,
    });
  }

  if (!cta) {
    const label = pt === 'checkout' ? 'Add to order' : 'Add to cart';
    suggestions.push({
      id: 'ci-cta-specific',
      category: 'copy',
      title: 'Use an explicit button label',
      detail:
        'Generic or empty CTAs underperform. Match the shopper mindset: cart/checkout often respond well to short, transactional labels.',
      reasoning: 'Explicit verbs reduce ambiguity at the moment of commitment.',
      apply: { presentation: { ctaLabel: label } },
    });
  }

  if (headline.length > 52) {
    suggestions.push({
      id: 'ci-headline-shorten',
      category: 'copy',
      title: 'Shorten the headline',
      detail:
        'Long headlines truncate on mobile. Aim for ~40 characters or less; move nuance to the supporting line.',
      reasoning: 'Truncation hides value props on small viewports.',
      apply: {
        presentation: {
          headline: headline.slice(0, 44).replace(/\s+\S*$/, '').trim() || headline.slice(0, 40),
        },
      },
    });
  }

  if (!headline && !subcopy && productCount > 0) {
    suggestions.push({
      id: 'ci-add-copy',
      category: 'copy',
      title: 'Add headline or supporting copy',
      detail:
        'Even one line of context (“Pairs with your cart”) improves clarity and perceived relevance vs. a bare product strip.',
      reasoning: 'Framing increases perceived relevance without changing SKU logic.',
      apply: {
        presentation: {
          headline:
            pt === 'cart' ? 'Complete your cart' : pt === 'checkout' ? 'Add before you check out' : 'You may also like',
          subcopy: '',
        },
      },
    });
  }

  const fcType = frequencyCap.frequency_cap_type || 'standard';
  const perSess = safeTrim(frequencyCap.max_impressions_per_session);
  const perDay = safeTrim(frequencyCap.max_impressions_per_day);
  const cooldown = safeTrim(frequencyCap.cooldown_minutes);

  if (pt !== 'product_page' && fcType !== 'none' && !perSess && !perDay && !cooldown) {
    suggestions.push({
      id: 'ci-freq-session',
      category: 'frequency',
      title: 'Cap impressions on cart/checkout',
      detail:
        'Without limits, the same block may repeat as the shopper navigates. Start with 1 impression per session and adjust from analytics.',
      reasoning: 'Session caps reduce annoyance during multi-step flows.',
      apply: {
        frequencyCap: {
          frequency_cap_type: 'standard',
          max_impressions_per_session: '1',
        },
      },
    });
  }

  if (triggerEmpty && (pt === 'cart' || pt === 'checkout')) {
    suggestions.push({
      id: 'ci-rules-intent',
      category: 'rules',
      title: 'Optionally target non-empty carts or minimum totals',
      detail:
        'Empty rules mean “always eligible on this placement.” For cart/checkout, consider requireNonEmptyCart or minCartSubtotal so you only nudge when it makes sense.',
      reasoning: 'Targeting reduces wasted impressions when the cart is empty or too small.',
      apply: {
        triggerJson: JSON.stringify(
          {
            requireNonEmptyCart: true,
            minCartSubtotal: 35,
          },
          null,
          2
        ),
      },
    });
  }

  if (!trig.ok) {
    suggestions.push({
      id: 'ci-trigger-json',
      category: 'rules',
      title: 'Fix trigger JSON',
      detail: 'Invalid JSON in trigger conditions will block saves. Use an empty object {} to match all eligible visits.',
      reasoning: 'The editor and API require valid JSON objects for trigger conditions.',
      apply: { triggerJson: '{}' },
    });
  }

  if (pt === 'product_page' && productCount >= 4) {
    suggestions.push({
      id: 'ci-placement-pdp-many',
      category: 'placement',
      title: 'Consider cart for long product lists',
      detail:
        'PDP widgets work well for focused upsells. If you are surfacing many SKUs, cart placement often gives more room without crowding the product story.',
      reasoning: 'PDP layout competition increases with carousel length.',
      apply: null,
    });
  }

  const summary =
    suggestions.length === 0
      ? `Configuration "${safeTrim(name) || 'this set'}" looks balanced for ${pt.replace('_', ' ')}. Try a custom question for deeper ideas.`
      : `Here are ${suggestions.length} focused improvements based on your current setup and common conversion patterns.`;

  const reasoning =
    suggestions.length === 0
      ? 'No high-priority rule hits; configuration appears within typical guardrails.'
      : 'Generated from placement, copy length, frequency caps, trigger JSON validity, and product count heuristics.';

  return {
    source: 'heuristic',
    summary,
    reasoning,
    suggestions,
  };
}

/**
 * @param {object} base
 * @param {string} intent — normalized
 */
export function focusSuggestionsByIntent(base, intent) {
  if (!intent || intent === 'optimize' || intent === 'custom') return base;
  const filtered = base.suggestions.filter((s) => s.category === intent || s.category === 'general');
  if (filtered.length === 0) return base;
  return {
    ...base,
    suggestions: filtered,
    summary: `Ideas focused on ${intent}: ${filtered.length} suggestion(s).`,
    reasoning: `${base.reasoning} Filtered to intent "${intent}".`,
  };
}
