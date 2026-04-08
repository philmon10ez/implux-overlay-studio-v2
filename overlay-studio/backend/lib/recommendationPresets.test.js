import test from 'node:test';
import assert from 'node:assert/strict';
import {
  RECOMMENDATION_PRESET_CATALOG,
  VALID_RECOMMENDATION_PRESET_KEYS,
  parsePresetKeyInput,
  parsePresetMetadataInput,
  sanitizePresetMetadata,
} from './recommendationPresets.js';

test('catalog ids match valid keys', () => {
  const ids = RECOMMENDATION_PRESET_CATALOG.map((p) => p.id);
  assert.deepEqual([...VALID_RECOMMENDATION_PRESET_KEYS], ids);
});

test('parsePresetKeyInput', () => {
  assert.equal(parsePresetKeyInput({}).explicit, false);
  assert.equal(parsePresetKeyInput({ presetKey: null }).value, null);
  assert.equal(parsePresetKeyInput({ presetKey: 'high_conversion_upsell' }).value, 'high_conversion_upsell');
  assert.equal(parsePresetKeyInput({ presetKey: 'nope' }).ok, false);
});

test('parsePresetMetadataInput and sanitizePresetMetadata', () => {
  assert.equal(parsePresetMetadataInput({}).explicit, false);
  const pm = parsePresetMetadataInput({
    presetMetadata: { presentation: { headline: 'x'.repeat(600), subcopy: '', ctaLabel: '' } },
  });
  assert.equal(pm.ok, true);
  assert.ok(pm.value && pm.value.presentation);
  assert.ok(String(pm.value.presentation.headline).length <= 500);
  assert.equal(sanitizePresetMetadata(null), null);
});
