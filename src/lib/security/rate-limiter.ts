const requestCounts = new Map<string, { count: number; resetAt: number }>();

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  windowMs: 60_000,
  maxRequests: 60,
};

const ENDPOINT_LIMITS: Record<string, RateLimitConfig> = {
  "/api/auth/register": { windowMs: 3600_000, maxRequests: 5 },
  "/api/webhooks/razorpay": { windowMs: 1000, maxRequests: 30 },
  "/api/checkout": { windowMs: 60_000, maxRequests: 20 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

export function checkRateLimit(key: string, endpoint?: string): RateLimitResult {
  const config = endpoint ? ENDPOINT_LIMITS[endpoint] : DEFAULT_CONFIG;
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: now + config.windowMs, retryAfterMs: 0 };
  }

  if (entry.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfterMs: entry.resetAt - now };
  }

  entry.count++;
  return { allowed: true, remaining: config.maxRequests - entry.count, resetAt: entry.resetAt, retryAfterMs: 0 };
}

export function clearRateLimits(): void {
  requestCounts.clear();
}

export function getRateLimitStats(): { tracked: number; entries: number } {
  return { tracked: requestCounts.size, entries: Array.from(requestCounts.values()).reduce((s, e) => s + e.count, 0) };
}
