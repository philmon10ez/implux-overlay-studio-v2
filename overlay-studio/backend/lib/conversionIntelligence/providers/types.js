/**
 * @typedef {object} AiChatMessage
 * @property {'system'|'user'|'assistant'} role
 * @property {string} content
 */

/**
 * @typedef {object} AiJsonCompletionRequest
 * @property {string} [model]
 * @property {AiChatMessage[]} messages
 * @property {number} [temperature]
 */

/**
 * @typedef {object} AiJsonCompletionResult
 * @property {boolean} ok
 * @property {string} [text] — assistant message content (expected JSON object as string)
 * @property {string} [providerId]
 * @property {string} [error] — human-readable
 * @property {number} [status]
 * @property {string} [rawBody] — optional debug
 */

/**
 * @typedef {(req: AiJsonCompletionRequest) => Promise<AiJsonCompletionResult>} AiJsonCompletionFn
 */

export {};
