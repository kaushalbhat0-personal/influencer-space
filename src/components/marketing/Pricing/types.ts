/**
 * Pricing Section Types
 */

import type { PlanDefinition } from "@/modules/billing/domain/types";

export interface PricingCardData {
  plan: PlanDefinition;
  recommended: boolean;
  ctaType: "signup" | "checkout" | "contact";
  highlights: string[];
}
