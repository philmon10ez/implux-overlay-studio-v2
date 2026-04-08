import test from 'node:test';
import assert from 'node:assert/strict';

test('runRecommendationAssistant works without OpenAI (heuristic path)', async () => {
  const prev = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
  const { runRecommendationAssistant } = await import('./recommendationAssistantOrchestrator.js');
  const result = await runRecommendationAssistant({
    intent: 'optimize',
    userMessage: 'Improve caps',
    context: {
      placementType: 'product_page',
      name: 'Test set',
      triggerJson: '{}',
      presentation: { headline: '', subcopy: '', ctaLabel: '' },
    },
  });
  if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
  assert.equal(result.ok, true);
  assert.ok(Array.isArray(result.suggestions));
  assert.ok(result.schemaVersion);
  assert.equal(result.source, 'heuristic');
});
