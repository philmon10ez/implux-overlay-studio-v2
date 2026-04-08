/**
 * Parse and normalize LLM JSON output into the API response suggestion shape.
 */

const PLACEMENTS = new Set(['product_page', 'cart', 'checkout']);

function safeTrim(s) {
  return typeof s === 'string' ? s.trim() : '';
}

export function normalizeAssistantSuggestion(s, i) {
  if (!s || typeof s !== 'object') return null;
  const id = typeof s.id === 'string' && s.id ? s.id : `ai-${i}`;
  const category = ['placement', 'copy', 'frequency', 'products', 'rules', 'general'].includes(s.category)
    ? s.category
    : 'general';
  const title = safeTrim(s.title) || 'Suggestion';
  const reasoning = safeTrim(s.reasoning);
  const detailRaw = safeTrim(s.detail) || safeTrim(s.body) || reasoning;
  const detail = detailRaw || 'See reasoning.';
  let apply = null;
  if (s.apply && typeof s.apply === 'object') {
    apply = {};
    if (PLACEMENTS.has(s.apply.placementType)) apply.placementType = s.apply.placementType;
    if (s.apply.presentation && typeof s.apply.presentation === 'object') {
      apply.presentation = {};
      if (typeof s.apply.presentation.headline === 'string')
        apply.presentation.headline = s.apply.presentation.headline;
      if (typeof s.apply.presentation.subcopy === 'string')
        apply.presentation.subcopy = s.apply.presentation.subcopy;
      if (typeof s.apply.presentation.ctaLabel === 'string')
        apply.presentation.ctaLabel = s.apply.presentation.ctaLabel;
      if (Object.keys(apply.presentation).length === 0) delete apply.presentation;
    }
    if (s.apply.frequencyCap && typeof s.apply.frequencyCap === 'object') {
      apply.frequencyCap = { ...s.apply.frequencyCap };
    }
    if (typeof s.apply.triggerJson === 'string') apply.triggerJson = s.apply.triggerJson;
    if (Array.isArray(s.apply.addProductIds)) {
      apply.addProductIds = s.apply.addProductIds
        .map((x) => parseInt(String(x), 10))
        .filter((n) => !Number.isNaN(n) && n > 0);
      if (apply.addProductIds.length === 0) delete apply.addProductIds;
    }
    if (Object.keys(apply).length === 0) apply = null;
  }
  return { id, category, title, detail, reasoning: reasoning || undefined, apply };
}

/**
 * @param {string} text — raw model content
 * @returns {{ ok: true, value: { summary: string, reasoning: string, suggestions: object[] } } | { ok: false, error: string }}
 */
export function parseAssistantJsonResponse(text) {
  if (!text || typeof text !== 'string') {
    return { ok: false, error: 'Empty model output' };
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Model output is not valid JSON' };
  }
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, error: 'Model JSON root must be an object' };
  }
  const summary = safeTrim(parsed.summary) || 'Suggestions generated.';
  const reasoning = safeTrim(parsed.reasoning);
  const rawList = Array.isArray(parsed.suggestions) ? parsed.suggestions : [];
  const suggestions = rawList.map(normalizeAssistantSuggestion).filter(Boolean);
  return { ok: true, value: { summary, reasoning, suggestions } };
}
