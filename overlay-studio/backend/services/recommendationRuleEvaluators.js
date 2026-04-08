/**
 * Extensible trigger evaluation for RecommendationSet.triggerConditions (flat JSON).
 * Add new rules by pushing to TRIGGER_RULE_EVALUATORS (pure functions).
 */

/** @typedef {import('./recommendationTargetContext.js').RecommendationPageContext} RecommendationPageContext */

function normSku(s) {
  return String(s == null ? '' : s)
    .trim()
    .toLowerCase();
}

function asNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function cartSkusLower(ctx) {
  const fromLines = (ctx.cartLineSkus || []).map(normSku).filter(Boolean);
  if (fromLines.length) return fromLines;
  if (Array.isArray(ctx.cartLineItems)) {
    return ctx.cartLineItems.map((it) => normSku(it && it.sku)).filter(Boolean);
  }
  return [];
}

/**
 * Each evaluator: (conditions, ctx) => boolean
 * Return true if this rule is satisfied or not applicable (key absent).
 */
export const TRIGGER_RULE_EVALUATORS = [
  {
    id: 'minCartSubtotal',
    describe: 'Cart subtotal must be >= value',
    test(conditions, ctx) {
      const min = asNumber(conditions.minCartSubtotal);
      if (min == null) return true;
      const sub = asNumber(ctx.cartSubtotal);
      if (sub == null) return false;
      return sub >= min;
    },
  },
  {
    id: 'maxCartSubtotal',
    describe: 'Cart subtotal must be <= value',
    test(conditions, ctx) {
      const max = asNumber(conditions.maxCartSubtotal);
      if (max == null) return true;
      const sub = asNumber(ctx.cartSubtotal);
      if (sub == null) return false;
      return sub <= max;
    },
  },
  {
    id: 'requireNonEmptyCart',
    describe: 'Cart must have at least one line / SKU',
    test(conditions, ctx) {
      if (!truthy(conditions.requireNonEmptyCart)) return true;
      const skus = cartSkusLower(ctx);
      if (skus.length > 0) return true;
      const sub = asNumber(ctx.cartSubtotal);
      return sub != null && sub > 0;
    },
  },
  {
    id: 'cartSkusAny',
    describe: 'At least one listed SKU must appear in cart',
    test(conditions, ctx) {
      const need = normalizeSkuList(conditions.cartSkusAny ?? conditions.skusAny);
      if (!need.length) return true;
      const have = new Set(cartSkusLower(ctx));
      return need.some((s) => have.has(s));
    },
  },
  {
    id: 'cartSkusAll',
    describe: 'All listed SKUs must appear in cart',
    test(conditions, ctx) {
      const need = normalizeSkuList(conditions.cartSkusAll);
      if (!need.length) return true;
      const have = new Set(cartSkusLower(ctx));
      return need.every((s) => have.has(s));
    },
  },
  {
    id: 'currentSkusAny',
    describe: 'Current product SKU must match one of the list (product page)',
    test(conditions, ctx) {
      const need = normalizeSkuList(conditions.currentSkusAny);
      if (!need.length) return true;
      const cur = normSku(ctx.currentSku);
      if (!cur) return false;
      return need.includes(cur);
    },
  },
  {
    id: 'productCategory',
    describe: 'Product category equals (case-insensitive)',
    test(conditions, ctx) {
      if (conditions.productCategory == null || String(conditions.productCategory).trim() === '') return true;
      const want = String(conditions.productCategory).trim().toLowerCase();
      const got = ctx.productCategory ? String(ctx.productCategory).trim().toLowerCase() : '';
      if (!got) return false;
      return got === want;
    },
  },
  {
    id: 'productCategoriesAny',
    describe: 'Product category in list',
    test(conditions, ctx) {
      const list = toLowerStringList(conditions.productCategoriesAny);
      if (!list.length) return true;
      const candidates = [];
      if (ctx.productCategory) candidates.push(String(ctx.productCategory).trim().toLowerCase());
      if (Array.isArray(ctx.productCategories)) {
        for (const c of ctx.productCategories) candidates.push(String(c).trim().toLowerCase());
      }
      if (!candidates.length) return false;
      return list.some((l) => candidates.includes(l));
    },
  },
  {
    id: 'tagsAny',
    describe: 'At least one tag matches resource tags',
    test(conditions, ctx) {
      const need = toLowerStringList(conditions.tagsAny);
      if (!need.length) return true;
      const have = new Set((ctx.resourceTags || []).map((t) => String(t).toLowerCase()));
      return need.some((t) => have.has(t));
    },
  },
  {
    id: 'collectionIdsAny',
    describe: 'At least one collection id present',
    test(conditions, ctx) {
      const need = toNumberList(conditions.collectionIdsAny);
      if (!need.length) return true;
      const have = new Set(ctx.collectionIds || []);
      return need.some((id) => have.has(id));
    },
  },
];

function truthy(v) {
  if (v === true || v === 1) return true;
  if (v === 'true' || v === '1') return true;
  return false;
}

function normalizeSkuList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map(normSku).filter(Boolean);
  return String(raw)
    .split(/[,;\n]+/)
    .map(normSku)
    .filter(Boolean);
}

function toLowerStringList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim().toLowerCase()).filter(Boolean);
  return String(raw)
    .split(/[,;]+/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function toNumberList(raw) {
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.map((x) => parseInt(String(x), 10)).filter((n) => !Number.isNaN(n));
  }
  return String(raw)
    .split(/[,;]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n));
}

/**
 * @param {object} conditions — RecommendationSet.triggerConditions
 * @param {RecommendationPageContext} ctx
 * @returns {{ ok: boolean, failedRules: string[] }}
 */
export function evaluateRecommendationTriggers(conditions, ctx) {
  const c = conditions && typeof conditions === 'object' && !Array.isArray(conditions) ? conditions : {};
  const failedRules = [];
  for (const { id, test } of TRIGGER_RULE_EVALUATORS) {
    try {
      if (!test(c, ctx)) failedRules.push(id);
    } catch {
      failedRules.push(id);
    }
  }
  return { ok: failedRules.length === 0, failedRules };
}

/**
 * Register an extra rule at runtime (e.g. from a plugin).
 * @param {{ id: string, describe?: string, test: (c: object, ctx: RecommendationPageContext) => boolean }} rule
 */
export function registerRecommendationRule(rule) {
  if (!rule || !rule.id || typeof rule.test !== 'function') return;
  const exists = TRIGGER_RULE_EVALUATORS.some((r) => r.id === rule.id);
  if (exists) {
    const idx = TRIGGER_RULE_EVALUATORS.findIndex((r) => r.id === rule.id);
    TRIGGER_RULE_EVALUATORS[idx] = rule;
  } else {
    TRIGGER_RULE_EVALUATORS.push(rule);
  }
}
