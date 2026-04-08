/**
 * Conversion Intelligence — prompt templates (central entry).
 */
export { buildRecommendationAssistantSystemPrompt } from './systemPromptTemplate.js';
export {
  buildRecommendationAssistantUserEnvelope,
  stringifyAssistantUserEnvelope,
} from './userPayloadBuilder.js';
export {
  OUTPUT_ROOT_SPEC,
  OUTPUT_SUGGESTION_SPEC,
  OUTPUT_JSON_EXAMPLE,
  ASSISTANT_RESPONSE_SCHEMA_VERSION,
} from './outputContract.js';
export { getIntentFocusBlock } from './intentFocusTemplates.js';
