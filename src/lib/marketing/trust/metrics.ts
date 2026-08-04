import type { TrustMetric } from "./types";

/**
 * IMPLEMENTATION-43 honesty audit: the previous seed contained fabricated
 * growth/commerce metrics (storefront counts, creators onboarded, revenue
 * processed, uptime, satisfaction). CreatorStore does not fabricate metrics.
 * Per the honesty policy, no metric is displayed unless it comes from runtime
 * or configuration — so this seed is intentionally empty. Marketing metrics are
 * rendered only from trusted, verified sources.
 */
export const SEED_METRICS: TrustMetric[] = [];
