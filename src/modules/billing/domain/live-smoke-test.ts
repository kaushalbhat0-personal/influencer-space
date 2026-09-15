/**
 * RCCF-LIVE-SMOKE-01 — isolated LIVE smoke test pricing override.
 *
 * Canonical pricing (COMMERCE_PLANS / BillingPlan / agency-commercial.ts) is NEVER mutated.
 * When the singleton LiveSmokeTestConfig.enabled is true AND the caller is SUPER_ADMIN,
 * eligible checkout amounts are derived as ₹1 server-side (never from client input).
 * All other semantics — royalty %, capacity formulas, renewal, entitlements, Razorpay routing,
 * webhook verification — remain unchanged.
 */

export const SMOKE_TEST_PRICE_INR = 1;
export const SMOKE_TEST_PRICE_PAISE = 100;
export const SMOKE_TEST_CONFIG_ID = "live-smoke-test";

/** Eligible plan codes for ₹1 override (as per ticket). */
export const SMOKE_TEST_ELIGIBLE_PLANS = new Set<string>([
  "creator_grow",
  "creator_scale",
  "partner_solo",
  "partner_scale",
]);

/** Purpose tag for additional capacity addon orders. */
export const SMOKE_TEST_ADDON_PURPOSE = "partner_capacity_addon";

export function isSmokeTestEligiblePlan(planCode: string | null | undefined): boolean {
  if (!planCode) return false;
  return SMOKE_TEST_ELIGIBLE_PLANS.has(planCode);
}

export function isSmokeTestEligibleForAddon(purpose: string | null | undefined): boolean {
  return purpose === SMOKE_TEST_ADDON_PURPOSE;
}

/**
 * Resolve the effective checkout amount (rupees) under smoke test.
 * Returns 1 if eligible + smokeTestEnabled else originalPrice.
 * Caller must have already verified SUPER_ADMIN role; this helper is pure.
 */
export function resolveSmokeTestAmountRupees(
  originalPrice: number | null | undefined,
  planCode: string | null | undefined,
  smokeTestEnabled: boolean,
): number | null {
  if (!smokeTestEnabled) return originalPrice ?? null;
  if (!isSmokeTestEligiblePlan(planCode)) return originalPrice ?? null;
  if (originalPrice == null || originalPrice <= 0) return originalPrice ?? null;
  return SMOKE_TEST_PRICE_INR;
}

/** Smoke test metadata tag to persist on invoices/events for audit. */
export const SMOKE_TEST_METADATA = {
  liveSmokeTest: true,
  smokeTestPriceInr: SMOKE_TEST_PRICE_INR,
  warning: "LIVE SMOKE TEST PRICING — REAL MONEY",
} as const;

/** Production warning banner text (must be obvious). */
export const SMOKE_TEST_WARNING = "LIVE SMOKE TEST PRICING — REAL MONEY";
