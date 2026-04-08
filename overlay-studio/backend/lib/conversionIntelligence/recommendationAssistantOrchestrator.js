/**
 * Orchestrates validation output + catalog + provider + heuristics for the recommendation assistant.
 * No HTTP — used by routes/services only.
 */
import {
  buildRecommendationAssistantSystemPrompt,
  buildRecommendationAssistantUserEnvelope,
  stringifyAssistantUserEnvelope,
} from './prompts/recommendationAssistant/index.js';
import { ASSISTANT_RESPONSE_SCHEMA_VERSION } from './prompts/recommendationAssistant/outputContract.js';
import { parseAssistantJsonResponse } from './parseAssistantModelOutput.js';
import { resolveAiJsonProvider } from './providers/resolveAiJsonProvider.js';
import {
  buildHeuristicRecommendationSuggestions,
  focusSuggestionsByIntent,
  normalizeAssistantIntent,
} from './heuristicRecommendationAssistant.js';

/**
 * @param {object} input
 * @param {string} input.intent
 * @param {string} input.userMessage
 * @param {object} input.context — validated whitelist context
 * @param {Array<{id:number,title:string,sku?:string|null}>} [input.catalog]
 * @param {{ storeName?: string, shopifyDomain?: string } | null} [input.merchantMeta]
 * @returns {Promise<object>}
 */
export async function runRecommendationAssistant(input) {
  const intent = normalizeAssistantIntent(input.intent || 'optimize');
  const userMessage = typeof input.userMessage === 'string' ? input.userMessage.trim() : '';
  const context = input.context && typeof input.context === 'object' ? input.context : {};
  const catalog = Array.isArray(input.catalog) ? input.catalog : [];
  const merchantMeta = input.merchantMeta && typeof input.merchantMeta === 'object' ? input.merchantMeta : null;

  const productCount =
    typeof context.productCount === 'number'
      ? context.productCount
      : Array.isArray(context.selectedProducts)
        ? context.selectedProducts.length
        : 0;

  const productTitles = Array.isArray(context.selectedProducts)
    ? context.selectedProducts.map((p) => (p && p.title ? String(p.title) : '')).filter(Boolean)
    : [];

  const heuristicBase = buildHeuristicRecommendationSuggestions({
    placementType: context.placementType,
    name: context.name,
    presentation: context.presentation,
    frequencyCap: context.frequencyCap,
    triggerJson: context.triggerJson,
    productCount,
    productTitles,
  });

  const catalogLines =
    catalog.length > 0
      ? catalog
          .slice(0, 40)
          .map((p) => {
            const cat = p.category ? ` [${p.category}]` : '';
            return `- id ${p.id}: ${p.title}${p.sku ? ` (SKU ${p.sku})` : ''}${cat}`;
          })
          .join('\n')
      : '(no catalog loaded for this merchant)';

  const editorPayload = {
    placementType: context.placementType,
    pageType: context.placementType,
    setInternalName: context.name,
    presentation: context.presentation,
    frequencyCap: context.frequencyCap,
    triggerConditionsJsonText: context.triggerJson,
    selectedProducts: context.selectedProducts,
    productCount,
    presetKey: context.presetKey,
    designTheme: context.designTheme,
  };

  const merchantForPrompt = merchantMeta
    ? { storeName: merchantMeta.storeName, shopifyDomain: merchantMeta.shopifyDomain }
    : null;

  const userEnvelope = buildRecommendationAssistantUserEnvelope({
    intent,
    userMessage,
    editor: editorPayload,
    merchant: merchantForPrompt,
    catalogSample: catalogLines,
  });
  const userMessageContent = stringifyAssistantUserEnvelope(userEnvelope);

  const provider = resolveAiJsonProvider();

  if (!provider) {
    const focused = focusSuggestionsByIntent(heuristicBase, intent);
    return {
      ok: true,
      schemaVersion: ASSISTANT_RESPONSE_SCHEMA_VERSION,
      source: focused.source,
      summary: focused.summary,
      reasoning: focused.reasoning,
      suggestions: focused.suggestions,
      meta: {
        providerId: null,
        catalogSize: catalog.length,
        usedOpenAI: false,
        intent,
      },
      warning: null,
    };
  }

  try {
    const completion = await provider.complete({
      model: process.env.OPENAI_MODEL,
      temperature: 0.45,
      messages: [
        { role: 'system', content: buildRecommendationAssistantSystemPrompt() },
        { role: 'user', content: userMessageContent },
      ],
    });

    if (!completion.ok) {
      console.warn('[conversionIntelligence] provider error:', completion.error, completion.status ?? '');
      return fallbackFromHeuristic(heuristicBase, intent, catalog.length, provider.id, completion.error);
    }

    const parsed = parseAssistantJsonResponse(completion.text);
    if (!parsed.ok || parsed.value.suggestions.length === 0) {
      return fallbackFromHeuristic(
        heuristicBase,
        intent,
        catalog.length,
        provider.id,
        parsed.ok ? 'Model returned no suggestions' : parsed.error
      );
    }

    return {
      ok: true,
      schemaVersion: ASSISTANT_RESPONSE_SCHEMA_VERSION,
      source: 'openai',
      summary: parsed.value.summary,
      reasoning: parsed.value.reasoning || null,
      suggestions: parsed.value.suggestions,
      meta: {
        providerId: provider.id,
        catalogSize: catalog.length,
        usedOpenAI: true,
        intent,
      },
      warning: null,
    };
  } catch (e) {
    console.warn('[conversionIntelligence] orchestrator failure:', e.message);
    return fallbackFromHeuristic(heuristicBase, intent, catalog.length, provider.id, e.message);
  }
}

function fallbackFromHeuristic(heuristicBase, intent, catalogSize, providerId, technicalHint) {
  const focused = focusSuggestionsByIntent(heuristicBase, intent);
  const userMsg =
    'AI generation was unavailable. Showing rules-based suggestions you can still apply in one click.';
  return {
    ok: true,
    schemaVersion: ASSISTANT_RESPONSE_SCHEMA_VERSION,
    source: 'fallback',
    summary: `${focused.summary} (${userMsg})`,
    reasoning: focused.reasoning,
    suggestions: focused.suggestions,
    meta: {
      providerId,
      catalogSize,
      usedOpenAI: false,
      intent,
    },
    warning: technicalHint ? `Fallback: ${String(technicalHint).slice(0, 240)}` : userMsg,
  };
}
