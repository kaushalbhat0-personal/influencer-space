"use client";

import { useSectionViewed } from "@/hooks/use-section-viewed";

/** RCCF-MKT-02-R1 — tracked sections match the repositioned homepage IA. */
export function SectionTracker() {
  useSectionViewed("hero", "Hero");
  useSectionViewed("core", "One Home");
  useSectionViewed("how-it-works", "How It Works");
  useSectionViewed("showcase", "Showcase");
  useSectionViewed("sell", "Sell");
  useSectionViewed("promote", "Promote");
  useSectionViewed("builder", "Build");
  useSectionViewed("grow", "Grow");
  useSectionViewed("proof", "Product Experience");
  useSectionViewed("pricing", "Pricing");
  useSectionViewed("final-cta", "Final CTA");
  return null;
}
