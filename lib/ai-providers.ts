/**
 * Multi-provider AI layer.
 *
 * DebateArena AI does not require paid OpenAI. It tries free/cheap cloud providers first and only
 * falls back to deterministic local content when every configured provider fails.
 *
 * Priority (when AI_PROVIDER=auto): Gemini -> Groq -> OpenRouter (:free) -> OpenAI.
 * Cost mode (AI_COST_MODE): "free_only" (default) never calls the paid OpenAI provider; "allow_paid"
 * lets OpenAI participate. A specific AI_PROVIDER value pins to that one provider.
 *
 * Every decision is logged: "[ai] Using <Provider> <label>." on success, and
 * "[ai] <Provider> <label> failed because: <reason>." when a provider is skipped.
 */
import { describeOpenAIError, getOpenAIClient, openAIModel } from "@/lib/openai";

export type ProviderName = "gemini" | "groq" | "openrouter" | "openai" | "fallback";
export type CostMode = "free_only" | "allow_paid";

export type CompletionRequest = { system: string; prompt: string; temperature?: number };
export type CompletionResult = { content: string; provider: ProviderName };

const PROVIDER_LABEL: Record<ProviderName, string> = {
  gemini: "Gemini",
  groq: "Groq",
  openrouter: "OpenRouter",
  openai: "OpenAI",
  fallback: "fallback"
};

// Banner text shown in the UI when a given provider produced the response (null = no banner).
export const PROVIDER_BANNER: Record<ProviderName, string | null> = {
  gemini: "Gemini AI is active.",
  groq: "Groq AI is active.",
  openrouter: "OpenRouter free model is active. Quality may vary.",
  openai: null,
  fallback: "Fallback AI is active. Opponent quality is limited."
};

export function providerBanner(provider: ProviderName): string | null {
  return PROVIDER_BANNER[provider] ?? null;
}

export class AllProvidersUnavailableError extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "AllProvidersUnavailableError";
  }
}

class HttpStatusError extends Error {
  status: number;
  constructor(status: number, body: string) {
    super(`HTTP ${status}${body ? ` · ${body.slice(0, 200)}` : ""}`);
    this.status = status;
    this.name = "HttpStatusError";
  }
}

const PLACEHOLDER_PARTS = ["replace-me", "placeholder", "your-", "your_", "example", "test-key", "changeme", "xxxx"];

function usableKey(name: string): string | null {
  const key = process.env[name]?.trim();
  if (!key) {
    return null;
  }
  const lower = key.toLowerCase();
  return PLACEHOLDER_PARTS.some((part) => lower.includes(part)) ? null : key;
}

export function getCostMode(): CostMode {
  return process.env.AI_COST_MODE === "allow_paid" ? "allow_paid" : "free_only";
}

type Provider = {
  name: ProviderName;
  paid: boolean;
  apiKey: string | null;
  run: (apiKey: string, req: CompletionRequest) => Promise<string>;
};

function allProviders(): Provider[] {
  return [
    { name: "gemini", paid: false, apiKey: usableKey("GEMINI_API_KEY"), run: callGemini },
    { name: "groq", paid: false, apiKey: usableKey("GROQ_API_KEY"), run: callGroq },
    { name: "openrouter", paid: false, apiKey: usableKey("OPENROUTER_API_KEY"), run: callOpenRouter },
    { name: "openai", paid: true, apiKey: usableKey("OPENAI_API_KEY"), run: callOpenAI }
  ];
}

// The ordered list of providers that will actually be attempted, after applying cost mode + selection.
function providerChain(): Provider[] {
  const costMode = getCostMode();
  const selected = (process.env.AI_PROVIDER ?? "auto").toLowerCase();

  return allProviders().filter((provider) => {
    if (!provider.apiKey) {
      return false;
    }
    // free_only never calls the paid provider (OpenAI), even if a key is present.
    if (costMode === "free_only" && provider.paid) {
      return false;
    }
    if (selected !== "auto" && provider.name !== selected) {
      return false;
    }
    return true;
  });
}

// Exposed for tests/diagnostics: which providers would be tried, in order.
export function getProviderOrder(): ProviderName[] {
  return providerChain().map((provider) => provider.name);
}

function describeProviderError(error: unknown): string {
  if (error instanceof HttpStatusError) {
    return error.message;
  }
  if (error && typeof error === "object" && "status" in error) {
    return describeOpenAIError(error);
  }
  if (error instanceof Error && error.name === "TimeoutError") {
    return "request timed out";
  }
  return error instanceof Error ? error.message : String(error);
}

export async function runProviderCompletion(req: CompletionRequest, label: string): Promise<CompletionResult> {
  const chain = providerChain();

  if (chain.length === 0) {
    const costMode = getCostMode();
    throw new AllProvidersUnavailableError(
      `no AI provider configured${costMode === "free_only" ? " for free_only mode (set GEMINI_API_KEY, GROQ_API_KEY, or OPENROUTER_API_KEY)" : ""}`
    );
  }

  let lastReason = "no provider produced a response";
  for (const provider of chain) {
    try {
      const content = await provider.run(provider.apiKey as string, req);
      if (!content || !content.trim()) {
        throw new Error("the model returned an empty response");
      }
      console.info(`[ai] Using ${PROVIDER_LABEL[provider.name]} ${label}.`);
      return { content, provider: provider.name };
    } catch (error) {
      lastReason = describeProviderError(error);
      console.warn(`[ai] ${PROVIDER_LABEL[provider.name]} ${label} failed because: ${lastReason}.`);
    }
  }

  throw new AllProvidersUnavailableError(lastReason);
}

// Models sometimes wrap JSON in code fences or add prose; recover the JSON object.
export function extractJson<T>(text: string): T {
  const cleaned = text
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as T;
    }
    throw new Error("the model did not return valid JSON");
  }
}

async function safeBody(res: Response): Promise<string> {
  try {
    return (await res.text()).replace(/\s+/g, " ").trim();
  } catch {
    return "";
  }
}

const REQUEST_TIMEOUT_MS = 30_000;

async function callGemini(apiKey: string, req: CompletionRequest): Promise<string> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: req.system }] },
      contents: [{ role: "user", parts: [{ text: req.prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: req.temperature ?? 0.7 }
    })
  });

  if (!res.ok) {
    throw new HttpStatusError(res.status, await safeBody(res));
  }

  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
}

async function callOpenAICompatible(
  baseUrl: string,
  apiKey: string,
  model: string,
  req: CompletionRequest,
  options: { jsonMode: boolean; extraHeaders?: Record<string, string> }
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, ...(options.extraHeaders ?? {}) },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    body: JSON.stringify({
      model,
      temperature: req.temperature ?? 0.7,
      ...(options.jsonMode ? { response_format: { type: "json_object" } } : {}),
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.prompt }
      ]
    })
  });

  if (!res.ok) {
    throw new HttpStatusError(res.status, await safeBody(res));
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? "";
}

function callGroq(apiKey: string, req: CompletionRequest): Promise<string> {
  const model = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";
  return callOpenAICompatible("https://api.groq.com/openai/v1", apiKey, model, req, { jsonMode: true });
}

function callOpenRouter(apiKey: string, req: CompletionRequest): Promise<string> {
  const model = process.env.OPENROUTER_MODEL || "meta-llama/llama-3.3-70b-instruct:free";
  // Many free OpenRouter models don't support response_format; we rely on the prompt + extractJson.
  return callOpenAICompatible("https://openrouter.ai/api/v1", apiKey, model, req, {
    jsonMode: false,
    extraHeaders: { "HTTP-Referer": "https://debatearena.ai", "X-Title": "DebateArena AI" }
  });
}

async function callOpenAI(_apiKey: string, req: CompletionRequest): Promise<string> {
  const client = getOpenAIClient();
  const response = await client.chat.completions.create({
    model: openAIModel,
    temperature: req.temperature ?? 0.7,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: req.system },
      { role: "user", content: req.prompt }
    ]
  });
  return response.choices[0]?.message?.content ?? "";
}
