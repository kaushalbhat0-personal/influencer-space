/**
 * RCCF-31 — publish period window computation.
 *
 * Lifetime (Launch): one stable row per tenant — `periodStart` = the tenant's
 * creation time, `periodEnd` = null.
 *
 * Monthly (Growth): an explicit calendar-month window derived from the publish
 * time. `BillingSubscription.renewsAt` reliability is unverified and the billing
 * cycle is monthly, so a calendar-month window is the unambiguous representation
 * with a clear `periodStart`/`periodEnd` for every metered period. Historical
 * rows are immutable.
 */
export interface PublishPeriod {
  periodStart: Date;
  periodEnd: Date | null;
}

export function computePublishPeriod(
  mode: "lifetime" | "monthly",
  tenantCreatedAt: Date,
  now: Date,
): PublishPeriod {
  if (mode === "lifetime") {
    return { periodStart: tenantCreatedAt, periodEnd: null };
  }
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  return { periodStart: start, periodEnd: end };
}
