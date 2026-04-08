/**
 * Single place to pick JSON-mode chat provider from environment.
 * Add Anthropic / Azure / etc. here without touching routes or orchestration.
 */
import { openaiChatJsonComplete } from './openaiChatJsonCompletion.js';

/** @returns {{ id: string, complete: import('./types.js').AiJsonCompletionFn } | null} */
export function resolveAiJsonProvider() {
  if (process.env.OPENAI_API_KEY) {
    return { id: 'openai', complete: openaiChatJsonComplete };
  }
  return null;
}
