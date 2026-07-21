/**
 * Pricing Section Types
 */

import type { PlanDefinition } from "@/lib/billing/types";

export interface PricingCardData {
  plan: PlanDefinition;
  recommended: boolean;
  ctaType: "signup" | "checkout" | "contact";
  highlights: string[];
}
