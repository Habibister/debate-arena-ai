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
  if (error instanceof OpenAIUnavailableError || isLikelyOpenAIUnavailableError(error)) {
    return NextResponse.json(
      {
        error: "AI service unavailable. Add a valid OpenAI API key or try again later."
      },
      { status: 503 }
    );
  }

  if (error instanceof HttpError) {
    return NextResponse.json(
      {
        error: error.message,
        details: error.details
      },
      { status: error.status }
    );
  }

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Invalid request body",
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
