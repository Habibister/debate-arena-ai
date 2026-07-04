import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitError } from "@/lib/api";

// Shared, serverless-compatible rate limiter for AI/generation endpoints. Uses Upstash Redis so limits
// are enforced ACROSS all serverless instances (a process-local Map would not survive Vercel's
// fan-out). Identify requests primarily by authenticated user id, with a secondary per-IP ceiling.
//
// Configure in production with (values set in Vercel, never committed):
//   UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
//
// Local development (no Upstash configured): requests are allowed and a one-time warning is logged.
// This is explicitly NOT production protection.

export type Workload = "light" | "turn" | "heavy";

// Per-USER limits by workload (requests per 60s window).
const USER_RULES: Record<Workload, { limit: number; window: `${number} s` }> = {
  light: { limit: 20, window: "60 s" }, // topic / recommendations / readiness
  turn: { limit: 10, window: "60 s" }, // opponent / side-coach turns
  heavy: { limit: 5, window: "60 s" } // judge / test / lesson generation
};

// Per-IP ceiling across all AI workloads (catches many accounts / shared bots behind one IP).
const IP_RULE = { limit: 60, window: "60 s" as const };
export const AI_RATE_LIMITS = { user: USER_RULES, ip: IP_RULE };

const configured = Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
const isProduction = process.env.NODE_ENV === "production";

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!configured) {
    return null;
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL as string,
      token: process.env.UPSTASH_REDIS_REST_TOKEN as string
    });
  }
  return redis;
}

const limiters = new Map<string, Ratelimit>();
function limiterFor(key: string, limit: number, window: `${number} s`): Ratelimit | null {
  const client = getRedis();
  if (!client) {
    return null;
  }
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({ redis: client, limiter: Ratelimit.slidingWindow(limit, window), prefix: `ratelimit:${key}`, analytics: false })
    );
  }
  return limiters.get(key) ?? null;
}

let warnedNoLimiter = false;
function warnDevOnce() {
  if (!warnedNoLimiter) {
    warnedNoLimiter = true;
    console.warn("[rate-limit] Upstash is not configured — AI rate limiting is DISABLED (local-dev fallback, NOT production protection). Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production.");
  }
}

function retryAfter(reset: number): number {
  // reset is an epoch-ms timestamp; convert to seconds-from-now.
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

function unavailableLimiterError(retryAfterSeconds = 30) {
  return new RateLimitError(retryAfterSeconds, "AI rate limiting is temporarily unavailable. Please retry shortly.");
}

// Throws RateLimitError(429) when a limit is exceeded. Local development may run without Upstash, but
// production never silently pretends a process-local/no-op limiter is protecting serverless AI costs.
export async function enforceRateLimit(opts: { userId: string; ip: string; workload: Workload }): Promise<void> {
  const { userId, ip, workload } = opts;

  if (!configured) {
    if (isProduction) {
      throw unavailableLimiterError(60);
    }
    warnDevOnce();
    return; // local-dev fallback — never claims to be production protection
  }

  const rule = USER_RULES[workload];
  const userLimiter = limiterFor(`user:${workload}`, rule.limit, rule.window);
  const ipLimiter = limiterFor("ip:all", IP_RULE.limit, IP_RULE.window);

  if (!userLimiter || !ipLimiter) {
    if (isProduction || workload === "heavy") {
      throw unavailableLimiterError();
    }
    warnDevOnce();
    return;
  }

  try {
    const userResult = await userLimiter.limit(`u:${userId}`);
    if (!userResult.success) {
      throw new RateLimitError(retryAfter(userResult.reset));
    }
    const ipResult = await ipLimiter.limit(`ip:${ip}`);
    if (!ipResult.success) {
      throw new RateLimitError(retryAfter(ipResult.reset));
    }
  } catch (error) {
    if (error instanceof RateLimitError) {
      throw error;
    }
    // Limiter is configured but unreachable. Fail closed in production and for expensive generation.
    // Never log Redis credentials, URLs, or raw client errors.
    console.error("[rate-limit] limiter unavailable.");
    if (isProduction || workload === "heavy") {
      throw unavailableLimiterError();
    }
  }
}
