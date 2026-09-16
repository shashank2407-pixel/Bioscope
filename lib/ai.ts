/**
 * Server-only helpers for calling vision/text models.
 * Gemini is tried first; OpenAI is used if Gemini is missing or fails.
 */

export type Provider = 'gemini' | 'openai';

interface JsonRequest {
  system: string;
  prompt: string;
  /** Data URL, e.g. "data:image/jpeg;base64,..." */
  imageDataUrl?: string;
  /** Gemini responseSchema (OpenAPI subset). OpenAI relies on the prompt describing the shape. */
  schema?: Record<string, unknown>;
  timeoutMs?: number;
}

export class AIError extends Error {
  constructor(message: string, public details: string[] = []) {
    super(message);
  }
}

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
/** Any OpenAI-compatible endpoint (OpenAI itself, a proxy, or a self-hosted gateway). */
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/$/, '');

export function configuredProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.GEMINI_API_KEY) providers.push('gemini');
  if (process.env.OPENAI_API_KEY) providers.push('openai');
  return providers;
}

function parseDataUrl(dataUrl: string) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(dataUrl);
  if (!match) throw new AIError('Image must be a base64 data URL.');
  return { mimeType: match[1], data: match[2] };
}

function parseJson(text: string) {
  const cleaned = text.replace(/```(?:json)?/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON.');
  return JSON.parse(cleaned.slice(start, end + 1));
}

async function callGemini(req: JsonRequest) {
  const parts: Record<string, unknown>[] = [{ text: req.prompt }];
  if (req.imageDataUrl) {
    const { mimeType, data } = parseDataUrl(req.imageDataUrl);
    parts.push({ inline_data: { mime_type: mimeType, data } });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY! },
      signal: AbortSignal.timeout(req.timeoutMs ?? 25_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: 'user', parts }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          ...(req.schema ? { responseSchema: req.schema } : {}),
          // Thinking adds large, unpredictable latency and isn't needed for identification.
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `Gemini returned HTTP ${res.status}`);

  const text = (body?.candidates?.[0]?.content?.parts ?? [])
    .filter((p: { thought?: boolean; text?: string }) => !p.thought && p.text)
    .map((p: { text: string }) => p.text)
    .join('');
  if (!text) {
    const reason = body?.promptFeedback?.blockReason || body?.candidates?.[0]?.finishReason;
    throw new Error(`Gemini returned no content${reason ? ` (${reason})` : ''}.`);
  }
  return parseJson(text);
}

async function callOpenAI(req: JsonRequest) {
  const userContent: Record<string, unknown>[] = [{ type: 'text', text: req.prompt }];
  if (req.imageDataUrl) userContent.push({ type: 'image_url', image_url: { url: req.imageDataUrl, detail: 'high' } });

  const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    signal: AbortSignal.timeout(req.timeoutMs ?? 25_000),
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      max_tokens: 1200,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: userContent },
      ],
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || `OpenAI returned HTTP ${res.status}`);
  const text = body?.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI returned no content.');
  return parseJson(text);
}

/** Runs the request against each configured provider in order until one succeeds. */
export async function generateJson<T = Record<string, unknown>>(req: JsonRequest): Promise<{ data: T; provider: Provider }> {
  const providers = configuredProviders();
  if (providers.length === 0) {
    throw new AIError('No AI provider is configured. Add GEMINI_API_KEY or OPENAI_API_KEY to .env.local.');
  }

  const failures: string[] = [];
  for (const provider of providers) {
    try {
      const call = provider === 'gemini' ? callGemini : callOpenAI;
      // One quick retry: most failures are transient timeouts or 503 overloads.
      const data = await call(req).catch((err) => {
        console.warn(`[ai] ${provider} attempt 1 failed, retrying:`, err instanceof Error ? err.message : err);
        return call(req);
      });
      return { data: data as T, provider };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      failures.push(`${provider}: ${message}`);
      console.error(`[ai] ${provider} failed:`, message);
    }
  }
  throw new AIError('Every AI provider failed.', failures);
}
