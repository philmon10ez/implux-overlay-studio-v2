/**
 * Conversion Intelligence — public surface for routes and integration tests.
 * Internals: prompts/, providers/, schemas/, heuristic + orchestrator.
 */
export { runRecommendationAssistant } from './recommendationAssistantOrchestrator.js';
export { validateRecommendationAssistantRequest } from './schemas/recommendationAssistantRequest.js';
export { ASSISTANT_RESPONSE_SCHEMA_VERSION } from './prompts/recommendationAssistant/outputContract.js';
