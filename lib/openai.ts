import OpenAI from "openai";

let cachedClient: OpenAI | null = null;

export class OpenAIUnavailableError extends Error {
  constructor(message = "AI service unavailable. Add a valid OpenAI API key or try again later.") {
    super(message);
    this.name = "OpenAIUnavailableError";
  }
}

const PLACEHOLDER_KEY_PARTS = ["replace-me", "placeholder", "your-openai", "your_openai", "example", "test-key"];

export function hasUsableOpenAIKey() {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    return false;
  }

  const normalizedKey = key.toLowerCase();
  return !PLACEHOLDER_KEY_PARTS.some((part) => normalizedKey.includes(part));
}

// Why is OpenAI unusable right now? Returns null when the key is usable, otherwise a short reason
// suitable for server logs and for choosing the fallback path.
export function unusableKeyReason(): string | null {
  const key = process.env.OPENAI_API_KEY?.trim();

  if (!key) {
    return "OPENAI_API_KEY is not set";
  }

  if (PLACEHOLDER_KEY_PARTS.some((part) => key.toLowerCase().includes(part))) {
    return "OPENAI_API_KEY looks like a placeholder";
  }

  return null;
}

// Turn an OpenAI/SDK error into a concise, log-friendly reason (status + message).
export function describeOpenAIError(error: unknown): string {
  if (error instanceof OpenAIUnavailableError) {
    return error.message;
  }

  const status =
    typeof error === "object" && error && "status" in error ? Number((error as { status?: unknown }).status) : undefined;
  const code =
    typeof error === "object" && error && "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = error instanceof Error ? error.message : String(error);
  const statusLabel = status ? `HTTP ${status}` : "";
  const codeLabel = code ? `${code}` : "";

  return [statusLabel, codeLabel, message].filter(Boolean).join(" · ") || "unknown OpenAI error";
}

export function isLikelyOpenAIUnavailableError(error: unknown) {
  if (error instanceof OpenAIUnavailableError) {
    return true;
  }

  const status = typeof error === "object" && error && "status" in error ? Number(error.status) : undefined;
  const message = error instanceof Error ? error.message.toLowerCase() : "";

  return (
    status === 401 ||
    status === 403 ||
    status === 429 ||
    message.includes("openai_api_key") ||
    message.includes("api key") ||
    message.includes("unauthorized") ||
    message.includes("invalid_api_key") ||
    message.includes("rate limit")
  );
}

export function getOpenAIClient() {
  if (!hasUsableOpenAIKey()) {
    throw new OpenAIUnavailableError();
  }

  if (!cachedClient) {
    cachedClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  return cachedClient;
}

export const openAIModel = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
