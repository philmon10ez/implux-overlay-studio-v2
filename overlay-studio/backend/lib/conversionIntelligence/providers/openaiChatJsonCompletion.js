/**
 * OpenAI Chat Completions JSON-mode provider (env-driven).
 * No business logic — only transport.
 */

/** @param {import('./types.js').AiJsonCompletionRequest} req @returns {Promise<import('./types.js').AiJsonCompletionResult>} */
export async function openaiChatJsonComplete(req) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ok: false, providerId: 'openai', error: 'OPENAI_API_KEY is not configured' };
  }

  const model = req.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: req.temperature ?? 0.45,
      response_format: { type: 'json_object' },
      messages: req.messages,
    }),
  });

  const rawText = await res.text();
  if (!res.ok) {
    return {
      ok: false,
      providerId: 'openai',
      error: `OpenAI HTTP ${res.status}`,
      status: res.status,
      rawBody: rawText.slice(0, 2000),
    };
  }

  let data;
  try {
    data = JSON.parse(rawText);
  } catch {
    return { ok: false, providerId: 'openai', error: 'OpenAI response was not JSON', rawBody: rawText.slice(0, 500) };
  }

  const text = data?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    return { ok: false, providerId: 'openai', error: 'Missing choices[0].message.content' };
  }

  return { ok: true, providerId: 'openai', text };
}
