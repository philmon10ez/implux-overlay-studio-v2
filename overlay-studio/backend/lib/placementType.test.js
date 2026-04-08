import test from 'node:test';
import assert from 'node:assert/strict';
import { parsePlacementType, isValidPlacementType } from './placementType.js';

test('parsePlacementType accepts common aliases', () => {
  assert.equal(parsePlacementType('product_page'), 'product_page');
  assert.equal(parsePlacementType('Product-Page'), 'product_page');
  assert.equal(parsePlacementType('cart'), 'cart');
  assert.equal(parsePlacementType('checkout'), 'checkout');
  assert.equal(parsePlacementType(null), null);
  assert.equal(parsePlacementType('unknown'), null);
});

test('isValidPlacementType', () => {
  assert.equal(isValidPlacementType('cart'), true);
  assert.equal(isValidPlacementType('bad'), false);
});
