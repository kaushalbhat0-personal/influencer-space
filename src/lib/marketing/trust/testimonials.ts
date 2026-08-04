import type { TrustTestimonial } from "./types";

/**
 * IMPLEMENTATION-43 honesty audit: the previous seed contained fabricated
 * testimonials (invented names, quotes, revenue and growth claims). CreatorStore
 * does not fabricate testimonials. No testimonial is displayed unless it is a
 * real, verifiable customer story — so this seed is intentionally empty.
 */
export const SEED_TESTIMONIALS: TrustTestimonial[] = [];
