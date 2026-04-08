/**
 * Offline smoke checks for recommendation trigger rules (no database).
 * Run: node scripts/recommendation-targeting-smoke.mjs
 */
import {
  evaluateRecommendationTriggers,
  TRIGGER_RULE_EVALUATORS,
} from '../services/recommendationRuleEvaluators.js';
import { EXAMPLE_PAGE_CONTEXTS } from '../services/recommendationTargetContext.js';

const samples = [
  {
    name: 'empty conditions always pass',
    conditions: {},
    ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple,
    expect: true,
  },
  {
    name: 'minCartSubtotal pass',
    conditions: { minCartSubtotal: 50 },
    ctx: EXAMPLE_PAGE_CONTEXTS.cartMidValue,
    expect: true,
  },
  {
    name: 'minCartSubtotal fail',
    conditions: { minCartSubtotal: 100 },
    ctx: EXAMPLE_PAGE_CONTEXTS.cartMidValue,
    expect: false,
  },
  {
    name: 'currentSkusAny pass',
    conditions: { currentSkusAny: ['tee-blk-m', 'other'] },
    ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple,
    expect: true,
  },
  {
    name: 'cartSkusAny pass',
    conditions: { cartSkusAny: ['HAT-01'] },
    ctx: EXAMPLE_PAGE_CONTEXTS.cartMidValue,
    expect: true,
  },
  {
    name: 'productCategory pass',
    conditions: { productCategory: 'apparel' },
    ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple,
    expect: true,
  },
  {
    name: 'tagsAny pass',
    conditions: { tagsAny: ['sale', 'new-arrival'] },
    ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple,
    expect: true,
  },
  {
    name: 'collectionIdsAny pass',
    conditions: { collectionIdsAny: [1001, 999] },
    ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple,
    expect: true,
  },
  {
    name: 'requireNonEmptyCart on empty',
    conditions: { requireNonEmptyCart: true },
    ctx: { pageType: 'cart', cartSubtotal: 0, cartLineSkus: [] },
    expect: false,
  },
];

let failed = 0;
for (const s of samples) {
  const { ok, failedRules } = evaluateRecommendationTriggers(s.conditions, s.ctx);
  const pass = ok === s.expect;
  if (!pass) {
    failed++;
    console.error('FAIL:', s.name, 'expected', s.expect, 'got', ok, failedRules);
  } else {
    console.log('ok:', s.name);
  }
}

console.log('\nRegistered rule ids:', TRIGGER_RULE_EVALUATORS.map((r) => r.id).join(', '));
process.exit(failed > 0 ? 1 : 0);
