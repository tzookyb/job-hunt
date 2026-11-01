// One entry point for every provider: complete({ kind, ... }) → the model's JSON object, or throws AiError.
import * as openai from './openaiCompatible.js';
import { AiError } from './errors.js';

const ADAPTERS = { openai };   // every listed provider speaks OpenAI-style Chat Completions

export async function complete({ kind, ...opts }) {
  const adapter = ADAPTERS[kind];
  if (!adapter) throw new AiError('Unknown provider type', { status: 400 });
  return adapter.complete(opts);
}

// The smallest useful request: proves the endpoint, the key and the model all work.
export async function ping(opts) {
  const started = Date.now();
  const answer = await complete({
    ...opts,
    system: 'You are a connectivity check. Answer with JSON only.',
    user: 'Reply with {"ok": true}.',
    schema: { type: 'object', properties: { ok: { type: 'boolean' } }, required: ['ok'] },
    timeout: 30e3,
  });
  return { ok: true, ms: Date.now() - started, answer };
}

export { AiError };
