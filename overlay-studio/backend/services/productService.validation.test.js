import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateProductCreateBody,
  validateProductUpdateBody,
} from './productService.js';

test('validateProductCreateBody — required fields and errors', () => {
  assert.equal(validateProductCreateBody({}).ok, false);
  const ok = validateProductCreateBody({
    merchantId: 1,
    title: '  A  ',
    productUrl: 'https://x.com',
    sku: '  ',
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.data.sku, null);
  assert.equal(validateProductCreateBody({ merchantId: 0, title: 'a', productUrl: 'u' }).ok, false);
});

test('validateProductUpdateBody — empty patch rejected', () => {
  assert.equal(validateProductUpdateBody({}).ok, false);
  const u = validateProductUpdateBody({ title: 'B' });
  assert.equal(u.ok, true);
  assert.equal(u.data.title, 'B');
});
