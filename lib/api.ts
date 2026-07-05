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

export class RateLimitError extends HttpError {
  retryAfterSeconds: number;

  constructor(retryAfterSeconds: number, message = "Too many requests. Please slow down and try again shortly.") {
    super(message, 429);
    this.name = "RateLimitError";
    this.retryAfterSeconds = Math.max(1, Math.ceil(retryAfterSeconds));
  }
}

export async function parseJson<T>(request: Request, schema: ZodSchema<T>) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    throw new HttpError("Invalid JSON body", 400);
  }

  return schema.parse(body);
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden(message = "Forbidden") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function apiError(error: unknown) {
  // RateLimitError extends HttpError, so it must be matched first to keep its Retry-After header.
  if (error instanceof RateLimitError) {
    return NextResponse.json(
      { error: error.message },
      { status: 429, headers: { "Retry-After": String(error.retryAfterSeconds) } }
    );
  }

  // HttpError is thrown only by our own code (auth, validation, explicit route errors), so its
  // status is authoritative. It must be checked BEFORE the OpenAI-likeness sniffing below, which
  // treats any error carrying status 401/403/429 as a provider outage and would turn our own
  // 401 "sign in required" into a misleading 503.
  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details
      },
      { status: error.status }
    );
  }

  if (error instanceof OpenAIUnavailableError || isLikelyOpenAIUnavailableError(error)) {
    return NextResponse.json(
      {
        error: "AI is temporarily unavailable. Please try again in a moment."
      },
      { status: 503 }
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
