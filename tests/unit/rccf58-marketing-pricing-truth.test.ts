import { describe, it, expect } from "vitest";
import { APPROVED_STORAGE, getStorageDisplay, getFeatureDisplayValue, getComparisonFeatureIds } from "@/components/marketing/Pricing/data";
import { COMMERCE_PLANS } from "@/config/commerce/plans";

describe("RCCF-58 — storage presentation truth", () => {
  it("exposes the approved commercial storage decision for every public plan", () => {
    expect(APPROVED_STORAGE.creator_launch).toBe("20 MB");
    expect(APPROVED_STORAGE.creator_grow).toBe("100 MB");
    expect(APPROVED_STORAGE.creator_scale).toBe("300 MB");
    expect(APPROVED_STORAGE.creator_enterprise).toBe("Custom");
    // RCCF-60.2: Partner storage is NOT a marketed capability — no Partner
    // plans appear in APPROVED_STORAGE.
    expect(APPROVED_STORAGE.partner_free).toBeUndefined();
    expect(APPROVED_STORAGE.partner_solo).toBeUndefined();
    expect(APPROVED_STORAGE.partner_scale).toBeUndefined();
    expect(APPROVED_STORAGE.partner_enterprise).toBeUndefined();
  });

  it("covers every public CREATOR plan (storage is Creator-only; Partner plans are excluded)", () => {
    const creatorPlans = COMMERCE_PLANS.filter((p) => p.family === "creator" && !p.hidden && !p.enterprise).map((p) => p.code);
    for (const code of creatorPlans) {
      expect(APPROVED_STORAGE[code], `missing storage value for ${code}`).toBeDefined();
      expect(APPROVED_STORAGE[code]).not.toMatch(/^\d+$/); // never a bare number
    }
  });

  it("storage renders the MB value for Creators; Partner plans advertise no storage", () => {
    expect(getFeatureDisplayValue("creator_scale", "storage_gb", 50, "numeric")).toBe("300 MB");
    expect(getFeatureDisplayValue("creator_enterprise", "storage_gb", 500, "numeric")).toBe("Custom");
    expect(getStorageDisplay("partner_solo")).toBe("—");
    // non-storage numeric stays canonical
    expect(getFeatureDisplayValue("creator_scale", "max_products", -1, "numeric")).toBe(-1);
    expect(getFeatureDisplayValue("creator_launch", "max_orders", 10, "numeric")).toBe(10);
    expect(getFeatureDisplayValue("creator_grow", "custom_domain", false, "boolean")).toBe(false);
  });

  it("getStorageDisplay falls back truthfully for unknown codes", () => {
    expect(getStorageDisplay("not_a_plan")).toBe("—");
  });
});

describe("RCCF-58 — family-appropriate comparison vocabulary", () => {
  it("creator comparison excludes agency/team features that are not delivered to creators", () => {
    const ids = new Set(getComparisonFeatureIds("creator"));
    for (const excluded of ["max_clients", "max_team_members", "agency_clients", "multiple_users", "white_label", "remove_branding"]) {
      expect(ids.has(excluded), `${excluded} must not appear on the creator comparison`).toBe(false);
    }
    // creator commerce/content vocabulary stays
    expect(ids.has("max_products")).toBe(true);
    expect(ids.has("max_gallery")).toBe(true);
    expect(ids.has("custom_domain")).toBe(true);
    // RCCF-59: creators render storage via storage_mb (storage_gb is the
    // Partner/legacy authority and no longer appears on the creator comparison).
    expect(ids.has("storage_mb")).toBe(true);
    expect(ids.has("storage_gb")).toBe(false);
  });

  it("partner comparison shows only delivered partner capabilities, never creator-commerce limits", () => {
    const ids = new Set(getComparisonFeatureIds("partner"));
    expect(ids.has("max_clients")).toBe(true);
    expect(ids.has("max_team_members")).toBe(true);
    expect(ids.has("white_label")).toBe(true);
    expect(ids.has("custom_domain")).toBe(true);
    expect(ids.has("analytics_basic")).toBe(true);
    expect(ids.has("analytics_advanced")).toBe(true);
    expect(ids.has("storage_gb")).toBe(false);
    expect(ids.has("priority_support")).toBe(true);
    expect(ids.has("premium_themes")).toBe(true);
    // creator-commerce vocabulary must NOT leak into the partner tab
    for (const notIncluded of ["max_products", "max_gallery", "max_orders", "max_services", "max_courses", "max_bookings", "max_feed", "max_games", "max_websites", "remove_branding", "automation", "bulk_publish", "multiple_brands", "marketplace_access"]) {
      expect(ids.has(notIncluded), `${notIncluded} must not appear on the partner comparison`).toBe(false);
    }
  });
});

describe("RCCF-58 — marketing copy truth", () => {
  it("no overclaimed enterprise/scale claims remain in the canonical plan config", () => {
    const partnerEnterprise = COMMERCE_PLANS.find((p) => p.code === "partner_enterprise")!;
    expect(partnerEnterprise.marketingHighlights).not.toContain("SLA guarantee");
    expect(partnerEnterprise.marketingHighlights).not.toContain("SSO + audit logs");
    expect(partnerEnterprise.marketingHighlights).not.toContain("Unlimited clients");
    expect(partnerEnterprise.marketingHighlights).toContain("Custom client capacity");
    expect(partnerEnterprise.marketingHighlights).toContain("Team audit trail");

    const partnerScale = COMMERCE_PLANS.find((p) => p.code === "partner_scale")!;
    expect(partnerScale.marketingHighlights).not.toContain("Higher commission rates");
    expect(partnerScale.marketingHighlights).not.toContain("Automation");
    expect(partnerScale.marketingHighlights).not.toContain("Bulk operations");
    expect(partnerScale.marketingHighlights).toContain("Commission that grows with your client count");

    const creatorScale = COMMERCE_PLANS.find((p) => p.code === "creator_scale")!;
    expect(creatorScale.marketingHighlights).not.toContain("Team members");
    expect(creatorScale.marketingHighlights).toContain("300 MB storage");
  });

  it("all partner plan descriptions avoid claiming an undelivered client-facing portal or builder", () => {
    for (const plan of COMMERCE_PLANS.filter((p) => p.family === "partner")) {
      const text = `${plan.marketingDescription ?? ""} ${plan.description} ${plan.marketingHighlights?.join(" ")}`.toLowerCase();
      expect(text).not.toMatch(/client-facing portal|branded client portal|partner website builder/);
      expect(text).not.toMatch(/multiple brands|multiple websites/);
    }
  });
});
