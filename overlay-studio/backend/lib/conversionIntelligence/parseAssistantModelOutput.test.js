import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAssistantJsonResponse, normalizeAssistantSuggestion } from './parseAssistantModelOutput.js';

test('parseAssistantJsonResponse — invalid JSON', () => {
  const r = parseAssistantJsonResponse('not json');
  assert.equal(r.ok, false);
});

test('parseAssistantJsonResponse — valid envelope', () => {
  const r = parseAssistantJsonResponse(
    JSON.stringify({
      summary: 'Done',
      reasoning: 'Because',
      suggestions: [
        {
          id: 's1',
          category: 'copy',
          title: 'T',
          detail: 'D',
          apply: { placementType: 'cart', triggerJson: '{}' },
        },
      ],
    })
  );
  assert.equal(r.ok, true);
  assert.equal(r.value.suggestions.length, 1);
  assert.equal(r.value.suggestions[0].apply.placementType, 'cart');
});

test('normalizeAssistantSuggestion — filters apply', () => {
  const s = normalizeAssistantSuggestion(
    {
      apply: {
        placementType: 'bad_place',
        presentation: { headline: 'H' },
        addProductIds: ['1', 'x'],
      },
    },
    0
  );
  assert.equal(s.apply.placementType, undefined);
  assert.equal(s.apply.presentation.headline, 'H');
  assert.deepEqual(s.apply.addProductIds, [1]);
});
