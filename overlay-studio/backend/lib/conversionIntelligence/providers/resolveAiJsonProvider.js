/**
 * Single place to pick JSON-mode chat provider from environment.
 * Add Anthropic / Azure / etc. here without touching routes or orchestration.
 */
import { openaiChatJsonComplete } from './openaiChatJsonCompletion.js';

/** @returns {{ id: string, complete: import('./types.js').AiJsonCompletionFn } | null} */
export function resolveAiJsonProvider(env = process.env) {
  const enabled = ['1', 'true', 'yes', 'on'].includes(
    String(env.AI_FEATURES_ENABLED || '').trim().toLowerCase()
  );
  if (!enabled || !env.OPENAI_API_KEY) return null;
  return { id: 'openai', complete: openaiChatJsonComplete };
}
