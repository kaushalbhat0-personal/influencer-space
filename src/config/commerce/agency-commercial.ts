/**
 * Agency / Freelancer Commercial Authority — RCCF-FINANCE-02/04
 *
 * Single canonical source for every commercial constant that governs the
 * Partner/Agency/Freelancer model. No other file may hardcode a
 * monthly, yearly, add-on or royalty value — import from here.
 *
 * Business decisions (FINANCE-04 MANUAL RENEWAL):
 *  - Partner plans are MANUAL RENEWAL via one-time Razorpay payments (no Razorpay Subscriptions)
 *  - Monthly ₹4,999 grants ~1 month, Yearly ₹49,990 grants ~1 year; renew manually at expiry/grace
 *  - No perpetual access, no automatic charging, no razorpayPlanId required
 *  - Passive royalty starts only at 5 ACTIVE client websites
 *  - Tiers: 0-4 → 0%, 5-25 → 20%, 26-50 → 30%, 51+ → 40%
 *  - Royalty applies ONLY to qualifying ACTIVE client SaaS subscription revenue
 *    for qualifying ACTIVE client websites (BillingSubscription ACTIVE).
 *    It does NOT apply to product/order GMV, DIRECT_CREATOR settlements,
 *    platform fees or any client-generated business revenue.
 *  - Active client = tenant-agency scoped, ACTIVE BillingSubscription only.
 *    Do not count offboarded, deleted, expired, pending, historical, trial-only, PAST_DUE/CANCELLED/EXPIRED.
 */

export const PARTNER_ADDON_UNIT_PRICE_INR = 2000;

export const PARTNER_TRIAL_DAYS = 15;
export const PARTNER_TRIAL_CLIENT_CAPACITY = 1;

/**
 * Canonical MANUAL RENEWAL prices for Partner plans (INR) — one-time payment per period.
 * The `price` field in COMMERCE_PLANS is the monthly authority; yearly is
 * 10× monthly (same invariant as creator annualPrice = 10× monthly).
 * Razorpay plan ids NOT required (manual renewal uses one-time orders).
 * These numbers are the DB-authoritative amounts for amount validation.
 */
export const PARTNER_RECURRING_PRICES = {
  partner_free: { monthly: 0, yearly: 0, razorpayMonthlyPlanId: null as string | null, razorpayYearlyPlanId: null as string | null },
  partner_solo: { monthly: 4999, yearly: 49990, razorpayMonthlyPlanId: null as string | null, razorpayYearlyPlanId: null as string | null },
  partner_scale: { monthly: 14999, yearly: 149990, razorpayMonthlyPlanId: null as string | null, razorpayYearlyPlanId: null as string | null },
  partner_enterprise: { monthly: 14999, yearly: 149990, razorpayMonthlyPlanId: null as string | null, razorpayYearlyPlanId: null as string | null, manual: true },
} as const;

export type PartnerPlanCode = keyof typeof PARTNER_RECURRING_PRICES;
export type BillingCycle = "monthly" | "yearly";

export function partnerPriceForCycle(planCode: string, cycle: BillingCycle): number | null {
  const entry = (PARTNER_RECURRING_PRICES as Record<string, { monthly: number; yearly: number }>)[planCode];
  if (!entry) return null;
  return cycle === "yearly" ? entry.yearly : entry.monthly;
}

export function partnerRazorpayPlanIdForCycle(planCode: string, cycle: BillingCycle): string | null {
  const entry = (PARTNER_RECURRING_PRICES as Record<string, { razorpayMonthlyPlanId: string | null; razorpayYearlyPlanId: string | null }>)[planCode];
  if (!entry) return null;
  return cycle === "yearly" ? entry.razorpayYearlyPlanId : entry.razorpayMonthlyPlanId;
}

// ── Royalty tiers — passive income on recurring SaaS subscription revenue only ──

export interface RoyaltyTier {
  minActiveClients: number;
  maxActiveClients: number | null; // null = unbounded
  percent: number;
  label: string;
}

/**
 * Business-approved royalty tiers (FINANCE-02):
 * 0–4 → 0% (no passive income until 5 active clients)
 * 5–25 → 20%
 * 26–50 → 30%
 * 51+ → 40%
 */
export const AGENCY_ROYALTY_TIERS: RoyaltyTier[] = [
  { minActiveClients: 0, maxActiveClients: 4, percent: 0, label: "0–4 active — 0%" },
  { minActiveClients: 5, maxActiveClients: 25, percent: 20, label: "5–25 active — 20%" },
  { minActiveClients: 26, maxActiveClients: 50, percent: 30, label: "26–50 active — 30%" },
  { minActiveClients: 51, maxActiveClients: null, percent: 40, label: "51+ active — 40%" },
];

export function royaltyPercentForActiveClients(count: number): number {
  const tier = AGENCY_ROYALTY_TIERS.find(
    (t) => count >= t.minActiveClients && (t.maxActiveClients === null || count <= t.maxActiveClients),
  );
  return tier?.percent ?? 0;
}

export function royaltyTierForCount(count: number): RoyaltyTier | null {
  return AGENCY_ROYALTY_TIERS.find(
    (t) => count >= t.minActiveClients && (t.maxActiveClients === null || count <= t.maxActiveClients),
  ) ?? null;
}

// ── Active-client definition (tenant/agency scoped, ACTIVE qualifying only) ──

export const ACTIVE_CLIENT_STATUSES = ["ACTIVE"] as const;

export type ActiveClientStatus = (typeof ACTIVE_CLIENT_STATUSES)[number];

/**
 * Derive royalty from qualifying recurring subscription revenue only.
 * ProductOrder GMV, DIRECT_CREATOR settlements, platform fees and any
 * client commerce revenue are NEVER included. Only the sum of qualifying
 * ACTIVE client SaaS subscription invoice amounts is multiplied by the tier.
 */
export function computeAgencyRoyalty(params: {
  activeClientCount: number;
  qualifyingRecurringRevenue: number; // sum of ACTIVE client BillingInvoice.amount where status PAID
}): { tier: RoyaltyTier | null; percent: number; royaltyAmount: number } {
  const tier = royaltyTierForCount(params.activeClientCount);
  const percent = tier?.percent ?? 0;
  const royaltyAmount = Math.round((params.qualifyingRecurringRevenue * percent) / 100 * 100) / 100;
  return { tier, percent, royaltyAmount };
}
