import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePositiveInt,
  parseRequiredMerchantIdQuery,
  parseRequiredIdParam,
  parseOptionalMerchantIdQuery,
} from './parseApiParams.js';

test('parsePositiveInt', () => {
  assert.equal(parsePositiveInt('5'), 5);
  assert.equal(parsePositiveInt(3), 3);
  assert.equal(parsePositiveInt('0'), null);
  assert.equal(parsePositiveInt('-1'), null);
  assert.equal(parsePositiveInt(''), null);
  assert.equal(parsePositiveInt(null), null);
});

test('parseRequiredMerchantIdQuery', () => {
  const ok = parseRequiredMerchantIdQuery({ query: { merchantId: '2' } });
  assert.equal(ok.ok, true);
  assert.equal(ok.merchantId, 2);
  const bad = parseRequiredMerchantIdQuery({ query: {} });
  assert.equal(bad.ok, false);
});

test('parseRequiredIdParam', () => {
  assert.equal(parseRequiredIdParam('12').ok, true);
  assert.equal(parseRequiredIdParam('12').id, 12);
  assert.equal(parseRequiredIdParam('x').ok, false);
});

test('parseOptionalMerchantIdQuery', () => {
  assert.equal(parseOptionalMerchantIdQuery({ query: { merchantId: '1' } }), 1);
  assert.equal(parseOptionalMerchantIdQuery({ query: {} }), undefined);
});
