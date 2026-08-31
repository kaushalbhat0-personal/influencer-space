// RCCF-71.6.1 — effective entitlement status guardrails.
// Historical subscription plan codes must not become current capabilities after
// the billing lifecycle has revoked access.

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { capabilityService } from "@/lib/capabilities";
import { themeEntitlementDecision } from "@/lib/theme/entitlement";
import { resolveExperienceForCapabilities, THEME_EXPERIENCES } from "@/modules/theme/runtime/experience";
import { isSubscriptionEntitlementEligible } from "@/modules/billing/application/plan-source";

const repoRoot = resolve(process.cwd());
const NOW = new Date("2026-08-17T00:00:00.000Z");

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

describe("RCCF-71.6.1 — effective subscription status", () => {
  it("keeps ACTIVE Growth and Scale entitlement", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE" }, NOW)).toBe(true);
    expect(capabilityService.can("creator_grow", "premium_themes").allowed).toBe(true);
    expect(capabilityService.can("creator_scale", "theme_effects_custom").allowed).toBe(true);
  });

  it("keeps valid TRIALING entitlement, including the existing open-ended semantics", () => {
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: new Date("2026-08-18T00:00:00.000Z") }, NOW)).toBe(true);
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: null }, NOW)).toBe(true);
  });

  it("revokes ended trials", () => {
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", trialEndsAt: new Date("2026-08-16T23:59:59.000Z") }, NOW)).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "TRIALING", currentPeriodEnd: new Date("2026-08-16T23:59:59.000Z") }, NOW)).toBe(false);
  });

  it.each(["CANCELLED", "EXPIRED", "PAST_DUE", "DRAFT", "FREE"])('%s does not grant entitlement', (status) => {
    expect(isSubscriptionEntitlementEligible({ status }, NOW)).toBe(false);
  });

  it("revokes an ACTIVE record after its effective period end", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", renewsAt: new Date("2026-08-16T23:59:59.000Z") }, NOW)).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", currentPeriodEnd: new Date("2026-08-18T00:00:00.000Z") }, NOW)).toBe(true);
  });

  it("applies the same effective-period rule to legacy subscriptions", () => {
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", currentPeriodEnd: new Date("2026-08-16T00:00:00.000Z") }, NOW)).toBe(false);
    expect(isSubscriptionEntitlementEligible({ status: "ACTIVE", currentPeriodEnd: null }, NOW)).toBe(true);
  });
});

describe("RCCF-71.6.1 — server capability and theme security", () => {
  it("does not allow premium themes when the effective plan is revoked", () => {
    expect(themeEntitlementDecision("pro", null).allowed).toBe(false);
    expect(themeEntitlementDecision("business", null).allowed).toBe(false);
    expect(capabilityService.can("creator_launch", "premium_themes").allowed).toBe(false);
  });

  it("degrades premium runtime experience to the safe Launch fallback", () => {
    const resolved = resolveExperienceForCapabilities(THEME_EXPERIENCES.aurora, "creator_launch");
    expect(resolved.background.kind).toBe("solid");
    expect(resolved.surface).toBe("flat");
    expect(resolved.motion).toBe("static");
    expect(resolved.decoration).toBe("minimal");
  });

  it("keeps server gates ahead of themeConfig mutation and theme application", () => {
    const src = read("src/actions/theme.actions.ts");
    expect(src).toContain('rejectMissing(["advanced_builder"])');
    expect(src).toContain("themeEntitlementDecision(tier, resolved.code)");
    expect(src.indexOf('rejectMissing(["advanced_builder"])')).toBeLessThan(src.indexOf("themeConfig.experienceBackground"));
  });

  it("passes only effective plan codes through single and batched resolution", () => {
    const src = read("src/modules/billing/application/plan-source.ts");
    expect(src).toContain("isSubscriptionEntitlementEligible(sub)");
    expect(src).toContain("isSubscriptionEntitlementEligible(legacy)");
    expect(src).toContain("return noEntitlement(\"v2\", sub.status)");
    expect(src).toContain('select: { plan: true, status: true, currentPeriodEnd: true }');
    expect(src).toContain('planCode: null, planDisplay: "Free", origin: "v2"');
  });

  it("keeps the canonical resolver chain for preview and publish", () => {
    expect(read("src/lib/storefront/storefront-loader.ts")).toContain("resolveExperienceForCapabilities(");
    expect(read("src/lib/publishing/service.ts")).toContain("resolveExperienceForCapabilities(overridden");
    expect(read("src/features/builder/canvas/interactive-canvas.tsx")).toContain("resolveExperienceForCapabilities(");
  });
});
