/**
 * RCCF-MKT-04-R1 — Homepage imagery restoration + responsive contracts +
 * retired Partner Growth plan removal.
 *
 * Reversal context: RCCF-MKT-04 stripped the certified SPower Gaming storefront
 * captures from the homepage, leaving an empty hero visual region. This RCCF
 * restores the imagery with deliberate breakpoint-aware presentation and
 * removes the retired Partner Growth agency plan from runtime configuration
 * (Agency never launched; no users/subscribers to grandfather).
 */

import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  COMMERCE_PLANS,
  COMMERCE_PLAN_BY_CODE,
  getMarketingPlans,
  getEnterprisePlan,
  LEGACY_TO_CANONICAL,
} from "@/config/commerce/plans";
import { PLAN_CODES, UPGRADE_PATHS, LEGACY_PLAN_MAP } from "@/lib/capabilities/constants";
import { canonicalPlanCode } from "@/lib/capabilities/plan-resolution";
import { capabilityService } from "@/lib/capabilities";

const repoRoot = resolve(process.cwd());

function read(file: string): string {
  return readFileSync(resolve(repoRoot, file), "utf8");
}

// ── 1. Certified assets — preserved on disk and wired into the homepage ─────

describe("RCCF-MKT-04-R1 — certified storefront assets", () => {
  it("keeps both certified SPower Gaming captures on disk, untouched", () => {
    for (const asset of [
      "public/marketing-assets/storefront/01-desktop.png",
      "public/marketing-assets/storefront/02-mobile.png",
    ]) {
      expect(existsSync(resolve(repoRoot, asset)), `${asset} must exist`).toBe(true);
    }
  });

  it("Hero renders the certified desktop capture via breakpoint-aware <picture>", () => {
    const hero = read("src/components/marketing/Hero.tsx");
    // Desktop source at md+, phone capture as the mobile default.
    expect(hero).toContain('srcSet="/marketing-assets/storefront/01-desktop.png"');
    expect(hero).toContain('src="/marketing-assets/storefront/02-mobile.png"');
    expect(hero).toContain('media="(min-width: 768px)"');
    // The empty-region regression is gone.
    expect(hero).not.toContain("Intentionally left empty");
  });

  it("StorefrontShowcase renders exactly the two certified captures", () => {
    const showcase = read("src/components/marketing/StorefrontShowcase.tsx");
    expect(showcase).toContain('srcSet="/marketing-assets/storefront/01-desktop.png"');
    expect(showcase).toContain('src="/marketing-assets/storefront/02-mobile.png"');
    expect(showcase).not.toContain("capture removed");
  });

  it("no other homepage section references the storefront assets", () => {
    for (const file of [
      "src/components/marketing/CoreIdea.tsx",
      "src/components/marketing/HowItWorks.tsx",
      "src/components/marketing/CreatorShowcase.tsx",
      "src/components/marketing/SellAnything.tsx",
      "src/components/marketing/PromoteBand.tsx",
      "src/components/marketing/BuilderShowcase.tsx",
      "src/components/marketing/GrowBand.tsx",
      "src/components/marketing/FinalCta.tsx",
      "src/app/page.tsx",
    ]) {
      expect(read(file)).not.toContain("/marketing-assets/storefront/");
    }
  });
});

// ── 2. Responsive contracts ─────────────────────────────────────────────────

describe("RCCF-MKT-04-R1 — responsive structural rules", () => {
  it("Hero image column cannot force grid overflow (min-w-0) and caps the phone preview height", () => {
    const hero = read("src/components/marketing/Hero.tsx");
    expect(hero).toContain("relative min-w-0");
    expect(hero).toContain("max-h-[420px]");
    expect(hero).toContain("max-w-full");
    // The desktop capture fills the frame at md+ instead of staying phone-sized.
    expect(hero).toMatch(/md:w-full/);
    // No global overflow-x hiding as a substitute for real layout fixes.
    expect(hero).not.toContain("overflow-x-hidden");
  });

  it("StorefrontShowcase constrains the phone preview and keeps the desktop card fluid", () => {
    const showcase = read("src/components/marketing/StorefrontShowcase.tsx");
    expect(showcase).toContain("w-full min-w-0 max-w-3xl");
    expect(showcase).toContain("max-h-[480px]");
    expect(showcase).toMatch(/md:w-full/);
  });

  it("CreatorShowcase no longer forces w-56 shrink-0 at base width", () => {
    const showcase = read("src/components/marketing/CreatorShowcase.tsx");
    expect(showcase).not.toMatch(/className="[^"]*\bw-56 shrink-0\b[^"]*"/);
    // Fixed-width alignment remains available only where there is room (sm+).
    expect(showcase).toContain("sm:w-56 sm:shrink-0");
  });

  it("homepage keeps the positioning and all five narrative pillars", () => {
    const page = read("src/app/page.tsx");
    const hero = read("src/components/marketing/Hero.tsx");
    expect(hero).toContain("Your presence.");
    for (const section of ["CoreIdea", "HowItWorks", "CreatorShowcase", "SellAnything", "PromoteBand", "BuilderShowcase", "GrowBand", "StorefrontShowcase", "Pricing", "FinalCta"]) {
      expect(page).toContain(section);
    }
  });

  it("the comparison table stays retired from the homepage without breaking the barrel export", () => {
    const page = read("src/app/page.tsx");
    // Not imported and not rendered on the homepage (a historical doc-comment
    // mention of the retirement is fine).
    expect(page).not.toMatch(/import\s[^\n]*ComparisonTable/);
    expect(page).not.toContain("<ComparisonTable");
    // The lib barrel no longer re-exports the removed SEED_COMPARISONS symbol
    // (previous deletion left a broken re-export behind).
    const libIndex = read("src/lib/marketing/trust/index.ts");
    expect(libIndex).not.toMatch(/export\s*\{[^}]*SEED_COMPARISONS/);
    expect(existsSync(resolve(repoRoot, "src/components/marketing/trust/ComparisonTable.tsx"))).toBe(false);
  });
});

// ── 3. Retired Partner Growth plan — removed from runtime configuration ─────

describe("RCCF-MKT-04-R1 — Partner Growth removal (Agency lineup)", () => {
  it("partner_growth is not part of the commerce registry", () => {
    expect(COMMERCE_PLANS.some((p) => p.code === "partner_growth")).toBe(false);
    expect(COMMERCE_PLAN_BY_CODE["partner_growth"]).toBeUndefined();
    expect(getCommercePlanSafe("partner_growth")).toBeUndefined();
  });

  it("the public Agency lineup is Free → Solo → Scale (+ Enterprise separately)", () => {
    expect(getMarketingPlans("partner").map((p) => p.code)).toEqual([
      "partner_free",
      "partner_solo",
      "partner_scale",
    ]);
    expect(getEnterprisePlan("partner")?.code).toBe("partner_enterprise");
  });

  it("no plan selector surface can reference partner_growth through canonical resolution", () => {
    expect(canonicalPlanCode("partner_growth")).toBeNull();
    expect(canonicalPlanCode("agency_agency")).toBeNull();
    expect(canonicalPlanCode("GROWTH")).toBeNull();
    expect(PLAN_CODES).not.toContain("partner_growth");
    expect(PLAN_CODES).not.toContain("agency_agency");
    expect(LEGACY_TO_CANONICAL.agency_agency).toBeUndefined();
    expect(LEGACY_PLAN_MAP.GROWTH).toBeUndefined();
  });

  it("capability resolution denies the retired plan outright", () => {
    expect(capabilityService.getPlan("partner_growth")).toBeUndefined();
    expect(capabilityService.can("partner_growth", "premium_themes").allowed).toBe(false);
    expect(capabilityService.can("agency_agency", "advanced_builder").allowed).toBe(false);
  });

  it("upgrade paths never route through partner_growth", () => {
    expect(UPGRADE_PATHS.partner_growth).toBeUndefined();
    expect(UPGRADE_PATHS.agency_agency).toBeUndefined();
    for (const [from, targets] of Object.entries(UPGRADE_PATHS)) {
      expect(targets, `upgrade path from ${from}`).not.toContain("partner_growth");
    }
  });

  it("no active runtime module still wires the retired plan identity", () => {
    const registry = read("src/config/commerce/plans.ts");
    expect(registry).not.toContain('code: "partner_growth"');
    const constants = read("src/lib/capabilities/constants.ts");
    expect(constants).not.toMatch(/"(partner_growth|agency_agency)"/);
    const resolution = read("src/lib/capabilities/plan-resolution.ts");
    expect(resolution).not.toMatch(/^\s*(partner_growth|agency_agency):/m);
  });

  function getCommercePlanSafe(code: string) {
    return COMMERCE_PLANS.find((p) => p.code === code);
  }
});

// ── 4. Surviving lineups + pricing truth (unchanged) ────────────────────────

describe("RCCF-MKT-04-R1 — Creator capabilities/pricing verified correct & unchanged", () => {
  it("creator lineup stays Launch/Growth/Scale/Enterprise with audited prices", () => {
    expect(getMarketingPlans("creator").map((p) => p.code)).toEqual([
      "creator_launch",
      "creator_grow",
      "creator_scale",
    ]);
    expect(COMMERCE_PLAN_BY_CODE.creator_launch?.price).toBe(0);
    expect(COMMERCE_PLAN_BY_CODE.creator_grow?.price).toBe(999);
    expect(COMMERCE_PLAN_BY_CODE.creator_scale?.price).toBe(1999); // RCCF-MKT-05
    expect(COMMERCE_PLAN_BY_CODE.creator_enterprise?.price).toBeNull();
    expect(getEnterprisePlan("creator")?.code).toBe("creator_enterprise");
  });

  it("surviving Agency plans keep their audited prices", () => {
    expect(COMMERCE_PLAN_BY_CODE.partner_free?.price).toBe(0);
    expect(COMMERCE_PLAN_BY_CODE.partner_solo?.price).toBe(4999);
    expect(COMMERCE_PLAN_BY_CODE.partner_scale?.price).toBe(14999); // RCCF-MKT-05
    expect(COMMERCE_PLAN_BY_CODE.partner_enterprise?.price).toBe(14999);
  });

  it("canonical creator codes still resolve after the removal", () => {
    for (const code of ["creator_launch", "creator_grow", "creator_scale", "creator_enterprise"]) {
      expect(canonicalPlanCode(code)).toBe(code);
    }
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]) {
      expect(canonicalPlanCode(code)).toBe(code);
    }
  });

  it("legacy alias mappings that survive remain intact", () => {
    expect(LEGACY_TO_CANONICAL.creator_free).toBe("creator_launch");
    expect(LEGACY_TO_CANONICAL.creator_pro).toBe("creator_grow");
    expect(LEGACY_TO_CANONICAL.creator_elite).toBe("creator_scale");
    expect(LEGACY_TO_CANONICAL.agency_free).toBe("partner_free");
    expect(LEGACY_TO_CANONICAL.agency_studio).toBe("partner_solo");
    expect(LEGACY_TO_CANONICAL.agency_starter).toBe("partner_solo");
    expect(LEGACY_TO_CANONICAL.agency_growth).toBe("partner_scale");
  });
});
