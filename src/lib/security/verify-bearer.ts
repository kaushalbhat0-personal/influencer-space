import crypto from "crypto";

/**
 * RCCF-72.17A (SEC-08) — constant-time Bearer-token verification for
 * server-to-server cron routes.
 *
 * Mirrors the timing-safe comparison pattern used by the Razorpay webhook
 * (`src/app/api/webhooks/razorpay/route.ts`): guard against length mismatch
 * first (timingSafeEqual throws on unequal buffers), then compare. Fails
 * closed when the expected secret is unset/empty so a missing secret can never
 * collapse to a trivially guessable `Bearer ` token.
 */
export function verifyBearerAuth(
  request: Request,
  secretEnv: string | undefined,
): boolean {
  if (!secretEnv || secretEnv.length === 0) return false;

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice("Bearer ".length) : "";

  const expected = Buffer.from(secretEnv);
  const received = Buffer.from(token);
  if (expected.length !== received.length) return false;
  return crypto.timingSafeEqual(expected, received);
}