import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateRecommendationTriggers, TRIGGER_RULE_EVALUATORS } from './recommendationRuleEvaluators.js';
import { EXAMPLE_PAGE_CONTEXTS } from './recommendationTargetContext.js';

test('evaluateRecommendationTriggers — smoke cases', () => {
  const cases = [
    { conditions: {}, ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple, expectOk: true },
    { conditions: { minCartSubtotal: 50 }, ctx: EXAMPLE_PAGE_CONTEXTS.cartMidValue, expectOk: true },
    { conditions: { minCartSubtotal: 100 }, ctx: EXAMPLE_PAGE_CONTEXTS.cartMidValue, expectOk: false },
    { conditions: { currentSkusAny: ['tee-blk-m'] }, ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple, expectOk: true },
    { conditions: { cartSkusAny: ['HAT-01'] }, ctx: EXAMPLE_PAGE_CONTEXTS.cartMidValue, expectOk: true },
    { conditions: { productCategory: 'apparel' }, ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple, expectOk: true },
    { conditions: { tagsAny: ['new-arrival'] }, ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple, expectOk: true },
    { conditions: { collectionIdsAny: [1001] }, ctx: EXAMPLE_PAGE_CONTEXTS.productPageSimple, expectOk: true },
    {
      conditions: { requireNonEmptyCart: true },
      ctx: { pageType: 'cart', cartSubtotal: 0, cartLineSkus: [] },
      expectOk: false,
    },
  ];
  for (const c of cases) {
    const { ok, failedRules } = evaluateRecommendationTriggers(c.conditions, c.ctx);
    assert.equal(ok, c.expectOk, `failed for ${JSON.stringify(c.conditions)}: ${failedRules.join(',')}`);
  }
});

test('TRIGGER_RULE_EVALUATORS exposes known rule ids', () => {
  const ids = TRIGGER_RULE_EVALUATORS.map((r) => r.id);
  assert.ok(ids.includes('minCartSubtotal'));
  assert.ok(ids.includes('requireNonEmptyCart'));
});
