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
  "/api/auth/login": { windowMs: 900_000, maxRequests: 10 },
  "/api/auth/claim-invite": { windowMs: 900_000, maxRequests: 10 },
  "/api/webhooks/razorpay": { windowMs: 1000, maxRequests: 30 },
  "/api/checkout": { windowMs: 60_000, maxRequests: 20 },
  "/api/domain/verify": { windowMs: 60_000, maxRequests: 10 },
  "/api/media/upload-url": { windowMs: 60_000, maxRequests: 60 },
  "/api/media/upload": { windowMs: 60_000, maxRequests: 60 },
  "/api/media/register": { windowMs: 60_000, maxRequests: 120 },
  // RCCF-65.3: public storefront affiliate click increments are throttled
  // per-IP (same in-memory limiter as auth) so repeated automated requests
  // cannot drive unbounded counter growth.
  "/affiliate-clicks": { windowMs: 60_000, maxRequests: 60 },
  // RCCF-67.4: public storefront booking submissions (per-IP, per minute).
  "/public-bookings": { windowMs: 60_000, maxRequests: 10 },
};

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfterMs: number;
}

// RCCF-LAUNCH-01: bound the in-memory map — expired keys were only evicted when
// re-hit, so a unique-IP flood grew the Map forever. Sweep periodically.
let sweepCounter = 0;
function sweepExpired(): void {
  sweepCounter++;
  if (sweepCounter % 50 !== 0) return;
  const now = Date.now();
  for (const [key, entry] of Array.from(requestCounts.entries())) {
    if (now > entry.resetAt) requestCounts.delete(key);
  }
}

export function checkRateLimit(key: string, endpoint?: string): RateLimitResult {
  const config = endpoint ? ENDPOINT_LIMITS[endpoint] : DEFAULT_CONFIG;
  const now = Date.now();
  sweepExpired();
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
