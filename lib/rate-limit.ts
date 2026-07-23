import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { RateLimitError } from "@/lib/api";

export type Workload = "light" | "turn" | "conversation" | "heavy";
export type RateLimitConfigStatus = "missing" | "malformed" | "valid";

const USER_RULES: Record<Workload, { limit: number; window: `${number} s` }> = {
  light: { limit: 20, window: "60 s" },
  turn: { limit: 10, window: "60 s" },
  // Real-time back-and-forth (role-play turns + Side Coach) fires more often than a single graded
  // action, so it gets a higher ceiling while generation routes stay strict.
  conversation: { limit: 20, window: "60 s" },
  heavy: { limit: 5, window: "60 s" }
};

const IP_RULE = { limit: 60, window: "60 s" as const };
export const AI_RATE_LIMITS = { user: USER_RULES, ip: IP_RULE };

export function validateRateLimitConfig(input: { url?: string; token?: string }): RateLimitConfigStatus {
  const url = input.url?.trim();
  const token = input.token?.trim();

  if (!url || !token) {
    return "missing";
  }

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" ? "valid" : "malformed";
  } catch {
    return "malformed";
  }
}

function currentConfigStatus(): RateLimitConfigStatus {
  return validateRateLimitConfig({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });
}

function isProduction() {
  return process.env.NODE_ENV === "production";
}

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (currentConfigStatus() !== "valid") {
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
    console.warn("[rate-limit] Upstash is not configured. AI rate limiting is DISABLED for local development only; this is NOT production protection.");
  }
}

function retryAfter(reset: number): number {
  return Math.max(1, Math.ceil((reset - Date.now()) / 1000));
}

function unavailableLimiterError(retryAfterSeconds = 30) {
  return new RateLimitError(retryAfterSeconds, "AI rate limiting is temporarily unavailable. Please retry shortly.");
}

export async function enforceRateLimit(opts: { userId: string; ip: string; workload: Workload }): Promise<void> {
  const { userId, ip, workload } = opts;

  if (currentConfigStatus() !== "valid") {
    if (isProduction()) {
      throw unavailableLimiterError(60);
    }
    warnDevOnce();
    return;
  }

  const rule = USER_RULES[workload];
  let userLimiter: Ratelimit | null;
  let ipLimiter: Ratelimit | null;

  try {
    userLimiter = limiterFor(`user:${workload}`, rule.limit, rule.window);
    ipLimiter = limiterFor("ip:all", IP_RULE.limit, IP_RULE.window);
  } catch {
    console.error("[rate-limit] limiter initialization failed.");
    if (isProduction() || workload === "heavy") {
      throw unavailableLimiterError();
    }
    warnDevOnce();
    return;
  }

  if (!userLimiter || !ipLimiter) {
    if (isProduction() || workload === "heavy") {
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

    console.error("[rate-limit] limiter unavailable.");
    if (isProduction() || workload === "heavy") {
      throw unavailableLimiterError();
    }
  }
}
