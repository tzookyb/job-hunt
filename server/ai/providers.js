// The AI providers the settings screen offers: **only ones with a free API tier** (owner's decision, 2026-10-28),
// so anyone using the app can get a key without paying or adding a card. Each entry carries a short "how to get a
// free key" guide that the ⚙ AI settings dialog shows. Checked against the providers' own pages on 2026-10-28;
// free tiers change, so re-check before relying on the limits below.
//
// `kind` picks the adapter in server/ai/providers/ ('openai' = OpenAI-style Chat Completions at `baseURL`).
// `model` is the default when the user leaves the model empty. Links are ours (never from a page or the model)
// and open in a new tab.
export const PROVIDERS = [
  {
    id: 'gemini', label: 'Google Gemini', kind: 'openai', needsKey: true,
    baseURL: 'https://generativelanguage.googleapis.com/v1beta/openai', model: 'gemini-3.5-flash-lite',
    free: 'Free tier with a Google account, no card. Daily limits depend on the model (Flash-Lite allows the most).',
    privacy: 'On the free tier, Google may use prompts to improve its products (outside the EU/UK).',
    keyUrl: 'https://aistudio.google.com/apikey', keyLink: 'Open Google AI Studio',
    steps: ['Sign in to Google AI Studio with your Google account and accept the terms.', 'Click “Get API key”, then “Create API key”.', 'Copy the key and paste it below.'],
  },
  {
    id: 'groq', label: 'Groq', kind: 'openai', needsKey: true,
    baseURL: 'https://api.groq.com/openai/v1', model: 'openai/gpt-oss-120b',
    free: 'Free plan, no card: about 1,000 requests a day. Very fast.',
    keyUrl: 'https://console.groq.com/keys', keyLink: 'Open the Groq console',
    steps: ['Sign up at the Groq console (Google or GitHub sign-in works).', 'Go to API Keys → “Create API Key”, give it a name.', 'Copy the key right away (it’s shown once) and paste it below.'],
  },
  {
    id: 'openrouter', label: 'OpenRouter (free models)', kind: 'openai', needsKey: true,
    baseURL: 'https://openrouter.ai/api/v1', model: 'openrouter/free',
    free: 'Free account, no card: 50 requests a day on free models. The default, openrouter/free, only ever picks free models, so it can’t cost money.',
    privacy: 'Some free models’ hosts may log prompts.',
    keyUrl: 'https://openrouter.ai/settings/keys', keyLink: 'Open OpenRouter keys',
    steps: ['Sign up at openrouter.ai.', 'Go to Settings → Keys → “Create Key”.', 'Copy the key and paste it below. Keep the model as openrouter/free, or pick a model whose name ends in “:free”.'],
  },
  {
    id: 'mistral', label: 'Mistral (Experiment plan)', kind: 'openai', needsKey: true,
    baseURL: 'https://api.mistral.ai/v1', model: 'mistral-small-latest',
    free: 'Free “Experiment” plan, no card, but needs a verified phone number.',
    privacy: 'Requests on the free plan may be used to train Mistral’s models.',
    keyUrl: 'https://docs.mistral.ai/getting-started/quickstarts/studio/activate-and-generate-api-key', keyLink: 'Mistral’s guide',
    steps: ['Sign up at Mistral AI Studio (console.mistral.ai).', 'Under Subscription, choose “Experiment for free” and verify your phone number.', 'Go to API Keys → “Create new key”, copy it and paste it below.'],
  },
  {
    id: 'ollama', label: 'Ollama (runs on this Mac)', kind: 'openai', needsKey: false,
    baseURL: 'http://localhost:11434/v1', model: '',
    free: 'Free and private: the model runs on your computer, nothing leaves it. Needs a few GB of disk and memory; slower and weaker than the hosted ones.',
    keyUrl: 'https://ollama.com/download', keyLink: 'Download Ollama',
    steps: ['Install Ollama and open it.', 'In Terminal, download a model, e.g. ollama pull llama3.1:8b', 'Type that model name (llama3.1:8b) in Model below. No key needed.'],
  },
];

export const provider = id => PROVIDERS.find(p => p.id === id);

// What the page gets about each provider (everything above; no secrets live here).
export const publicView = list => list.map(({ id, label, needsKey, model, free, privacy = '', keyUrl, keyLink, steps }) =>
  ({ id, label, needsKey, model, free, privacy, keyUrl, keyLink, steps }));
