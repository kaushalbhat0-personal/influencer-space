/**
 * Agency Commercial Closure (RCCF-61) — canonical commercial constants.
 *
 * RCCF-FINANCE-02: canonical values now live in
 * src/config/commerce/agency-commercial.ts. This file re-exports for
 * backward compat — import from agency-commercial.ts for new code.
 */
export { PARTNER_ADDON_UNIT_PRICE_INR, PARTNER_TRIAL_DAYS, PARTNER_TRIAL_CLIENT_CAPACITY } from "./agency-commercial";
export const PARTNER_MIN_PAID_CAPACITY = 5;
