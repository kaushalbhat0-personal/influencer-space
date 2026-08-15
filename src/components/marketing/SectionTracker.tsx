"use client";

import { useSectionViewed } from "@/hooks/use-section-viewed";

export function SectionTracker() {
  useSectionViewed("hero", "Hero");
  useSectionViewed("transformation", "Before & After");
  useSectionViewed("how-it-works", "How It Works");
  useSectionViewed("ai-demo", "Storefront Preview Demo");
  useSectionViewed("sell", "Sell Anything");
  useSectionViewed("grow", "Grow");
  useSectionViewed("manage", "Manage");
  useSectionViewed("showcase", "Creator Showcase");
  useSectionViewed("agency", "Agency Platform");
  useSectionViewed("comparison", "Comparison");
  useSectionViewed("pricing", "Pricing");
  useSectionViewed("faq", "FAQ");
  useSectionViewed("final-cta", "Final CTA");
  return null;
}
