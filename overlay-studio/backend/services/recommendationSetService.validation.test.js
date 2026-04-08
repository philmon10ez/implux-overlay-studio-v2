import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateRecommendationSetCreateBody,
  validateRecommendationSetUpdateBody,
  parseTriggerConditions,
} from './recommendationSetService.js';

test('parseTriggerConditions', () => {
  assert.deepEqual(parseTriggerConditions(null).value, {});
  assert.equal(parseTriggerConditions('[]').ok, false);
});

test('validateRecommendationSetCreateBody', () => {
  const bad = validateRecommendationSetCreateBody({});
  assert.equal(bad.ok, false);
  const ok = validateRecommendationSetCreateBody({
    merchantId: 1,
    name: 'Set A',
    placementType: 'cart',
    triggerConditions: { priority: 1 },
    status: 'draft',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.placementType, 'cart');
});

test('validateRecommendationSetUpdateBody — patch and productIds', () => {
  const u = validateRecommendationSetUpdateBody({ name: 'X' });
  assert.equal(u.ok, true);
  assert.equal(u.data.patch.name, 'X');
  const empty = validateRecommendationSetUpdateBody({});
  assert.equal(empty.ok, false);
});
