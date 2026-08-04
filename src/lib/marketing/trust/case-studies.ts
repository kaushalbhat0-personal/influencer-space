import type { TrustCaseStudy } from "./types";

/**
 * IMPLEMENTATION-43 honesty audit: the previous seed contained fabricated case
 * studies (invented creators, revenue and growth outcomes). CreatorStore does
 * not fabricate case studies. No case study is displayed unless it is a real,
 * verifiable story — so this seed is intentionally empty.
 */
export const SEED_CASE_STUDIES: TrustCaseStudy[] = [];
