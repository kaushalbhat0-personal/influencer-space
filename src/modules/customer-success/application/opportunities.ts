// ── Customer Success — Opportunity Engine ───────────────────
// RCCF-EPIC-09 Phase 4. Deterministic opportunity detection.

import { entitlementService } from "@/lib/capabilities";
import type { SuccessOpportunity, SuccessSignals } from "../domain/types";

export function detectOpportunities(s: SuccessSignals): SuccessOpportunity[] {
  const opportunities: SuccessOpportunity[] = [];

  // Ready to upgrade to a paid plan (published + has products).
  // Free/entry tier = the plan does not grant paid-tier features (premium themes).
  const onFreeTier = !entitlementService.has(s.planCode, "premium_themes");
  if (s.published && s.hasProducts && onFreeTier) {
    opportunities.push({ type: "upgrade_growth", label: "Upgrade to Creator Growth", description: "Unlimited products, premium themes and a full visual builder.", value: 70, href: "/admin/billing" });
  }

  // Ready for Scale (real revenue).
  if (s.orderCount >= 10) {
    opportunities.push({ type: "upgrade_scale", label: "Consider Creator Scale", description: "API access, webhooks, automation and advanced analytics.", value: 60, href: "/admin/billing" });
  }

  // Ready for Agency (strong performance).
  if (s.orderCount >= 20 && s.healthScore !== null && s.healthScore >= 70) {
    opportunities.push({ type: "agency", label: "Explore Partner plans", description: "Turn your success into an agency with recurring revenue.", value: 55, href: "/signup?plan=partner_free" });
  }

  // Add-on potential (large gallery / storage use).
  if (s.galleryCount >= 50) {
    opportunities.push({ type: "addons", label: "Storage & AI add-ons", description: "You're using significant storage — add-ons unlock more.", value: 40 });
  }

  // High selling potential (engaged + healthy + products).
  if (s.hasProducts && s.healthScore !== null && s.healthScore >= 70 && s.completedRecommendations >= 2) {
    opportunities.push({ type: "high_selling_potential", label: "High selling potential", description: "Your store is well-positioned — promote it actively.", value: 50 });
  }

  // Commerce expansion (only digital products).
  if (s.hasProducts && s.orderCount === 0) {
    opportunities.push({ type: "commerce_expansion", label: "Expand your catalog", description: "Add services, courses or bookings to broaden offers.", value: 45, href: "/admin/products" });
  }

  // SEO opportunity.
  if (s.published && !s.seoConfigured) {
    opportunities.push({ type: "seo_opportunity", label: "Set up SEO", description: "Optimize your storefront for search traffic.", value: 35, href: "/admin/seo" });
  }

  return opportunities.sort((a, b) => b.value - a.value);
}
