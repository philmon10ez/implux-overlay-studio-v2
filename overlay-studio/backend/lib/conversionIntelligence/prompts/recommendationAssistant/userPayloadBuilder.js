/**
 * Structured user message for the model: clean input envelope, easy to extend.
 */
import { ASSISTANT_RESPONSE_SCHEMA_VERSION } from './outputContract.js';
import { getIntentFocusBlock } from './intentFocusTemplates.js';

/**
 * @param {object} p
 * @param {string} p.intent
 * @param {string} p.userMessage
 * @param {object} p.editor — merchant’s current configuration (placement, copy, triggers, frequency, products…)
 * @param {{ storeName?: string, shopifyDomain?: string } | null} p.merchant
 * @param {string} p.catalogSample — multiline text of catalog lines or placeholder
 * @returns {object} serializable envelope (stringify before sending to the model)
 */
export function buildRecommendationAssistantUserEnvelope({
  intent,
  userMessage,
  editor,
  merchant,
  catalogSample,
}) {
  const focusInstructions = getIntentFocusBlock(intent);

  return {
    schemaVersion: ASSISTANT_RESPONSE_SCHEMA_VERSION,
    task: 'recommendation_set_conversion_intelligence',
    intent: intent || 'optimize',
    merchantQuestion: typeof userMessage === 'string' && userMessage.trim() ? userMessage.trim() : null,
    sessionFocus: focusInstructions,
    merchantContext: merchant && typeof merchant === 'object' ? merchant : null,
    currentConfiguration: editor && typeof editor === 'object' ? editor : {},
    productCatalogSample: typeof catalogSample === 'string' ? catalogSample : '',
    renderingNote:
      'The admin UI will show each suggestion as a card. When apply is non-null, the merchant can merge your values in one click—only include confident, safe patches.',
  };
}

/**
 * @param {object} envelope — from buildRecommendationAssistantUserEnvelope
 * @returns {string}
 */
export function stringifyAssistantUserEnvelope(envelope) {
  return JSON.stringify(envelope);
}
