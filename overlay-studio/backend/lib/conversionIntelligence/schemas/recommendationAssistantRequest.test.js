import test from 'node:test';
import assert from 'node:assert/strict';
import { validateRecommendationAssistantRequest } from './recommendationAssistantRequest.js';

test('validateRecommendationAssistantRequest — rejects non-object body', () => {
  const r = validateRecommendationAssistantRequest(null);
  assert.equal(r.ok, false);
  assert.equal(r.field, 'body');
});

test('validateRecommendationAssistantRequest — unknown intent', () => {
  const r = validateRecommendationAssistantRequest({
    intent: 'not-a-valid-intent-xyz',
    userMessage: 'hi',
  });
  assert.equal(r.ok, false);
  assert.equal(r.field, 'intent');
});

test('validateRecommendationAssistantRequest — builds safe context', () => {
  const r = validateRecommendationAssistantRequest({
    intent: 'rules',
    userMessage: ' tune ',
    context: {
      placementType: 'cart',
      name: 'My set',
      triggerJson: '{"priority":1}',
      selectedProducts: [{ id: 1, title: 'P' }],
    },
  });
  assert.equal(r.ok, true);
  assert.equal(r.data.intent, 'rules');
  assert.equal(r.data.context.placementType, 'cart');
  assert.equal(r.data.context.selectedProducts[0].id, 1);
});
