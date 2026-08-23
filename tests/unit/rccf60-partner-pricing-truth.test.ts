import { describe, it, expect, afterEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMMERCE_PLANS } from "@/config/commerce/plans";
import { capabilityService } from "@/lib/capabilities";
import { getComparisonFeatureIds, APPROVED_STORAGE, getStorageDisplay, getDisplayPrice } from "@/components/marketing/Pricing/data";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides, getPlan } from "@/lib/capabilities/plans";

const PARTNER = COMMERCE_PLANS.filter((p) => p.family === "partner");
const partner = (code: string) => PARTNER.find((p) => p.code === code)!;
const highlights = (code: string) => (partner(code).marketingHighlights ?? []).join(" ").toLowerCase();

afterEach(() => resetRuntimeFeatureOverrides());

describe("RCCF-60.2 — Partner pricing matrix (canonical)", () => {
  it("Launch = 0, Solo = 4999, Scale = 7999, Enterprise = 14999/manual", () => {
    expect(partner("partner_free").price).toBe(0);
    expect(partner("partner_solo").price).toBe(4999);
    expect(partner("partner_scale").price).toBe(7999);
    expect(partner("partner_enterprise").price).toBe(14999);
    expect(partner("partner_enterprise").manual).toBe(true);
    expect(partner("partner_enterprise").enterprise).toBe(true);
  });

  it("client limits 1 / 5 / 15 / custom (-1)", () => {
    expect(capabilityService.limit("partner_free", "max_clients")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
    expect(capabilityService.limit("partner_scale", "max_clients")).toBe(15);
    expect(capabilityService.limit("partner_enterprise", "max_clients")).toBe(-1);
  });

  it("team limits 1 / 3 / 10 / 50", () => {
    expect(capabilityService.limit("partner_free", "max_team_members")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_team_members")).toBe(3);
    expect(capabilityService.limit("partner_scale", "max_team_members")).toBe(10);
    expect(capabilityService.limit("partner_enterprise", "max_team_members")).toBe(50);
  });

  it("white-label only on Scale + Enterprise", () => {
    expect(capabilityService.can("partner_free", "white_label").allowed).toBe(false);
    expect(capabilityService.can("partner_solo", "white_label").allowed).toBe(false);
    expect(capabilityService.can("partner_scale", "white_label").allowed).toBe(true);
    expect(capabilityService.can("partner_enterprise", "white_label").allowed).toBe(true);
  });

  it("custom domain on Solo + Scale + Enterprise", () => {
    expect(capabilityService.can("partner_free", "custom_domain").allowed).toBe(false);
    expect(capabilityService.can("partner_solo", "custom_domain").allowed).toBe(true);
    expect(capabilityService.can("partner_scale", "custom_domain").allowed).toBe(true);
    expect(capabilityService.can("partner_enterprise", "custom_domain").allowed).toBe(true);
  });
});

describe("RCCF-60.2 — Partner storage is NOT marketed", () => {
  it("APPROVED_STORAGE contains no Partner plans", () => {
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]) {
      expect(APPROVED_STORAGE[code], `${code} must not have a storage marketing value`).toBeUndefined();
    }
    // Creator storage stays (RCCF-59).
    expect(APPROVED_STORAGE.creator_launch).toBe("20 MB");
    expect(APPROVED_STORAGE.creator_grow).toBe("100 MB");
    expect(APPROVED_STORAGE.creator_scale).toBe("300 MB");
  });

  it("getStorageDisplay never returns a Partner storage number", () => {
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_enterprise"]) {
      expect(getStorageDisplay(code)).toBe("—");
    }
  });

  it("the Partner comparison exposes no storage row", () => {
    const ids = new Set(getComparisonFeatureIds("partner"));
    expect(ids.has("storage_gb")).toBe(false);
    expect(ids.has("storage_mb")).toBe(false);
  });

  it("no Partner highlight advertises storage", () => {
    for (const p of PARTNER) {
      expect(highlights(p.code)).not.toMatch(/mb storage|gb storage|storage/);
    }
  });
});

describe("RCCF-60.2 — no unsupported Partner claims", () => {
  it("no 'Unlimited clients' claim (Enterprise = Custom client capacity)", () => {
    expect(highlights("partner_enterprise")).not.toContain("unlimited clients");
    expect(highlights("partner_enterprise")).toContain("custom client capacity");
  });

  it("no SLA / SSO / automation / bulk / API claims on Partner plans", () => {
    for (const p of PARTNER) {
      const h = highlights(p.code);
      expect(h).not.toMatch(/sla guarantee/);
      expect(h).not.toMatch(/sso/);
      expect(h).not.toContain("automation");
      expect(h).not.toContain("bulk operations");
      expect(h).not.toContain("api access");
    }
  });

  it("no plan-specific commission percentage claim (client-count loyalty only)", () => {
    for (const p of PARTNER) {
      const h = highlights(p.code);
      expect(h).not.toMatch(/higher commission rates|commission rates/);
      expect(h).not.toMatch(/\d+% commission/);
    }
    expect(highlights("partner_scale")).toContain("commission that grows with your client count");
  });

  it("no client-facing portal / Partner builder / multi-website claims", () => {
    for (const p of PARTNER) {
      const h = highlights(p.code);
      expect(h).not.toMatch(/client portal|branded portal|partner builder|multiple websites/);
    }
    // Agency marketing components must not claim a client-FACING portal.
    for (const f of ["src/components/marketing/Agency.tsx", "src/components/marketing/AgencyFeatures/data.ts", "src/lib/marketing/content.ts"]) {
      const text = readFileSync(join(process.cwd(), f), "utf8").toLowerCase();
      expect(text.includes("client portal") && !text.includes("client preview portal"), `${f} claims a client portal`).toBe(false);
      expect(text).not.toMatch(/partner builder/);
    }
  });
});

describe("RCCF-60.2 — Creator tab stays clean", () => {
  it("Creator comparison excludes team/white-label features that are not delivered to Creators", () => {
    const ids = new Set(getComparisonFeatureIds("creator"));
    for (const f of ["max_team_members", "max_clients", "white_label", "remove_branding"]) {
      expect(ids.has(f), `${f} must not appear on the Creator comparison`).toBe(false);
    }
  });
});

describe("RCCF-60.2 — public pricing metadata", () => {
  const page = readFileSync(join(process.cwd(), "src/app/pricing/page.tsx"), "utf8");

  it("does not say Partner plans start at ₹2,999", () => {
    expect(page).not.toContain("2,999");
    expect(page).toContain("Partner plans from ₹4,999/month");
  });

  // MODERNIZED in RCCF-MKT-02-R1: the creator "from" price is now DERIVED from
  // runtime plans at request time (the old pinned token "paid plans from ₹999"
  // contradicted live Growth pricing of ₹699/month and was removed).
  it("Creator metadata truthfully acknowledges the free/trial tier and derives paid prices from runtime", () => {
    expect(page).toContain("Creator plans from Free");
    expect(page).not.toContain("paid plans from ₹999"); // stale hardcoded figure absent
    expect(page).toContain("export async function generateMetadata"); // runtime derivation present
    expect(page).toContain("Math.min(...paidPrices)");
  });
});

describe("RCCF-60.2 — single pricing authority (no second hardcoded matrix)", () => {
  it("marketing derives prices from the canonical ResolvedPlan, not a local table", () => {
    const runtimePlan = { code: "partner_solo", name: "Solo Partner", family: "partner" as const, description: "", marketingDescription: "", targetAudience: null, price: 4999, annualPrice: 49990, currency: "INR", badge: null, ctaLabel: "", ctaType: "checkout" as const, trialDays: null, gracePeriodDays: 0, hidden: false, enterprise: false, popular: false, bestValue: false, recommended: true, comparisonOrder: 2, colorAccent: null, capabilities: [], featureOverrides: {}, features: {}, highlights: [], scheduled: [] };
    expect(getDisplayPrice(runtimePlan, "monthly")).toBe(4999);
    expect(getDisplayPrice(runtimePlan, "yearly")).toBe(Math.round(49990 / 12));
  });

  it("Pricing Center feature edits stay consistent with the effective capability (no stale BillingPlanFeature authority)", () => {
    // Simulate a Super Admin feature override (Pricing Center → runtimeConfig).
    applyRuntimeFeatureOverrides("partner_scale", { max_clients: 25 });
    expect(getPlan("partner_scale")!.features.max_clients).toBe(25);
    expect(capabilityService.limit("partner_scale", "max_clients")).toBe(25);
    // The marketing comparison consumes the SAME canonical feature map via the
    // runtime plans — BillingPlanFeature is dormant (no consumer) and can never
    // override this path.
    expect(capabilityService.limit("partner_scale", "max_team_members")).toBe(10);
  });
});
