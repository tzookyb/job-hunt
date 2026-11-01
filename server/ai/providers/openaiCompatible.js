// OpenAI-style Chat Completions: OpenAI, Gemini, Groq, Mistral, OpenRouter, Ollama, LM Studio…
// Asks for a JSON object (`response_format: json_object`, which all of these accept) and puts the schema in the
// system prompt; a server that refuses response_format gets one retry without it. No max_tokens: newer OpenAI models
// reject it, and the answer is small anyway.
import { AiError, fromResponse, post } from './errors.js';

// The first {...} in a reply, tolerating ```json fences and chatter around it.
export function parseJsonObject(text) {
  const s = String(text ?? '');
  for (const candidate of [s, s.slice(s.indexOf('{'), s.lastIndexOf('}') + 1)]) {
    try { const v = JSON.parse(candidate.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')); if (v && typeof v === 'object' && !Array.isArray(v)) return v; } catch {}
  }
  throw new AiError('The model didn\'t return valid JSON', { code: 'shape' });
}

export async function complete({ key, baseURL, model, system, user, schema, signal, timeout = 90e3, fetch: fetchFn = fetch }) {
  if (!model) throw new AiError('Enter a model name in AI settings', { status: 400, code: 'model' });
  const messages = [
    { role: 'system', content: `${system}\n\nReply with one JSON object only, matching this JSON Schema:\n${JSON.stringify(schema)}` },
    { role: 'user', content: user },
  ];
  const headers = key ? { Authorization: `Bearer ${key}` } : {};
  const send = body => post(fetchFn, `${baseURL}/chat/completions`, { headers, body, signal, timeout });

  let res = await send({ model, messages, response_format: { type: 'json_object' } });
  if (res.status === 400 || res.status === 422) {
    const err = await fromResponse(res, key);
    if (!/response_format|json_object|json mode/i.test(err.message)) throw err;
    res = await send({ model, messages });
  }
  if (!res.ok) throw await fromResponse(res, key);
  const data = await res.json().catch(() => null);
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new AiError('The model returned an empty answer', { code: 'shape' });
  return parseJsonObject(content);
}
