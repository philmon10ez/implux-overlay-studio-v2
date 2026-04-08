import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeAssistantIntent,
  buildHeuristicRecommendationSuggestions,
  focusSuggestionsByIntent,
} from './heuristicRecommendationAssistant.js';

test('normalizeAssistantIntent aliases cta/copy/text to copy', () => {
  assert.equal(normalizeAssistantIntent('CTA'), 'copy');
  assert.equal(normalizeAssistantIntent('optimize'), 'optimize');
});

test('buildHeuristicRecommendationSuggestions — empty products', () => {
  const out = buildHeuristicRecommendationSuggestions({
    placementType: 'product_page',
    name: 'N',
    presentation: {},
    triggerJson: '{}',
    productCount: 0,
  });
  assert.ok(out.suggestions.some((s) => s.id === 'ci-products-empty'));
});

test('focusSuggestionsByIntent narrows list', () => {
  const base = buildHeuristicRecommendationSuggestions({
    placementType: 'product_page',
    presentation: {},
    triggerJson: '{}',
    productCount: 0,
  });
  const focused = focusSuggestionsByIntent(base, 'rules');
  assert.ok(focused.suggestions.length <= base.suggestions.length);
});
