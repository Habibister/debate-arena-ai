import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { ZodError, type ZodSchema } from "zod";
import { OpenAIUnavailableError, isLikelyOpenAIUnavailableError } from "@/lib/openai";

export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.details = details;
  }
}

// Thrown by the shared rate limiter. Carries the Retry-After hint so apiError can set the header.
export class RateLimitError extends HttpError {
  retryAfterSeconds: number;
  constructor(retryAfterSeconds: number, message = "Too many requests. Please slow down and try again shortly.") {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

// Thrown when a provider blocks generation for safety. Never carries the raw provider body, and never
// triggers a cross-provider fallback (see runProviderCompletion).
export class SafetyBlockedError extends HttpError {
  constructor() {
    super("This request was blocked by the content-safety filter. Please rephrase and try again.", 422);
    this.name = "SafetyBlockedError";
  }
}

// Hard ceiling on the serialized request body (defense-in-depth on top of per-field Zod limits) so an
// oversized payload is rejected before any provider is invoked.
export const MAX_REQUEST_BODY_BYTES = 100_000;

export async function parseJson<T>(request: Request, schema: ZodSchema<T>, options?: { maxBytes?: number }) {
  const maxBytes = options?.maxBytes ?? MAX_REQUEST_BODY_BYTES;
  let raw: string;

  try {
    raw = await request.text();
  } catch {
    throw new HttpError("Invalid request body", 400);
  }

  if (Buffer.byteLength(raw, "utf8") > maxBytes) {
    throw new HttpError(`Request body is too large (limit ${Math.floor(maxBytes / 1000)}KB).`, 413);
  }

  let body: unknown;
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }

  return schema.parse(body);
}

export function shouldBypassAiFallback(error: unknown) {
  return (
    error instanceof RateLimitError ||
    error instanceof SafetyBlockedError ||
    error instanceof ZodError ||
    (error instanceof HttpError && [400, 401, 403, 413, 422, 429].includes(error.status))
  );
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function apiError(error: unknown) {
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
    );
  }

  if (error instanceof SafetyBlockedError) {
    // Safe, user-friendly message only; never the raw provider response.
    return NextResponse.json({ error: error.message }, { status: 422 });
  }

  if (error instanceof OpenAIUnavailableError || isLikelyOpenAIUnavailableError(error)) {
    return NextResponse.json(
      {
        error: "AI is temporarily unavailable. Please try again in a moment."
      },
      { status: 503 }
    );
  }

  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(process.env.NODE_ENV === "development" && error.details ? { details: error.details } : {})
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    // Surface the first field-level problem (e.g. "dueDate: Enter a valid due date.") instead of a
    // generic "Invalid request body", so the form can show the user what to fix.
    const first = error.issues[0];
    const field = first?.path.filter((segment) => typeof segment === "string").join(".");
    const message = first ? (field ? `${field}: ${first.message}` : first.message) : "Invalid request body";
    return NextResponse.json(
      {
        error: message,
        issues: error.issues
      },
      { status: 400 }
    );
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A record with those unique fields already exists" }, { status: 409 });
    }

    if (error.code === "P2025") {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }
  }

  const message = error instanceof Error ? error.message : "Unknown server issue";

  return NextResponse.json(
    {
      error: "Something went wrong. Please try again in a moment.",
      ...(process.env.NODE_ENV === "development" ? { details: message } : {})
    },
    { status: 500 }
  );
}
