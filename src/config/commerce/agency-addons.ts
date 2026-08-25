/**
 * Agency Commercial Closure (RCCF-61) — canonical commercial constants.
 *
 * RCCF-73: the additional-client charge is ₹2,000 ONE-TIME and is
 * PAYMENT-GATED — capacity becomes ACTIVE only after the Razorpay capture is
 * webhook-verified (identity + amount + idempotency; see
 * src/modules/billing/application/partner-capacity-purchase.ts). It is NOT a
 * recurring/monthly/subscription price. These are the approved fixed product
 * prices — never scatter `2000`/`5`/`15` across actions, UI, or tests.
 */
export const PARTNER_ADDON_UNIT_PRICE_INR = 2000;
export const PARTNER_MIN_PAID_CAPACITY = 5;
export const PARTNER_TRIAL_DAYS = 15;
export const PARTNER_TRIAL_CLIENT_CAPACITY = 1;
