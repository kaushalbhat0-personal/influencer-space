import { describe, it, expect } from "vitest";
import {
  capabilityEngine,
  capabilityService,
  getPlan,
  getAllPlans,
  getPlansByFamily,
  getFeatureInfo,
  getAllFeatureIds,
  getFeaturesByCategory,
  getEffectiveLimit,
  checkLimit,
  getLimitsMap,
  getOverLimitFeatures,
  FEATURE_IDS,
  FEATURE_CATALOG,
  PLAN_CODES,
  UPGRADE_PATHS,
  UNLIMITED,
  DISABLED,
  validatePlanCode,
  validateFeatureId,
  validateUsageContext,
  validatePlanTransition,
  formatPlanName,
  formatFeatureLabel,
  toPlanSummary,
  formatFeatureComparison,
  comparisonToRows,
} from "@/lib/capabilities";

describe("Capabilities — Constants", () => {
  it("should define canonical plan codes", () => {
    expect(PLAN_CODES).toContain("creator_launch");
    expect(PLAN_CODES).toContain("creator_grow");
    expect(PLAN_CODES).toContain("creator_scale");
    expect(PLAN_CODES).toContain("creator_enterprise");
    expect(PLAN_CODES).toContain("partner_free");
    expect(PLAN_CODES).toContain("partner_solo");
    expect(PLAN_CODES).toContain("partner_growth");
    expect(PLAN_CODES).toContain("partner_scale");
    expect(PLAN_CODES).toContain("partner_enterprise");
  });

  it("should include legacy DB codes for backward compat", () => {
    expect(PLAN_CODES).toContain("creator_free");
    expect(PLAN_CODES).toContain("creator_pro");
    expect(PLAN_CODES).toContain("creator_elite");
    expect(PLAN_CODES).toContain("agency_free");
    expect(PLAN_CODES).toContain("agency_studio");
    expect(PLAN_CODES).toContain("agency_agency");
    expect(PLAN_CODES).toContain("agency_starter");
    expect(PLAN_CODES).toContain("agency_growth");
  });

  it("should define all feature IDs", () => {
    const ids = Object.values(FEATURE_IDS);
    expect(ids.length).toBe(47);
    expect(ids).toContain("max_products");
    expect(ids).toContain("custom_domain");
    expect(ids).toContain("seo");
    expect(ids).toContain("ai_automation");
    expect(ids).toContain("white_label");
    expect(ids).toContain("max_websites");
    // RCCF-IMPLEMENTATION-70: real storefront modules exposed as tiered limits.
    expect(ids).toContain("max_services");
    expect(ids).toContain("max_courses");
    expect(ids).toContain("max_testimonials");
    expect(ids).toContain("ai_credits");
  });

  it("should have canonical UPGRADE_PATHS for creator plans", () => {
    expect(UPGRADE_PATHS.creator_free).toEqual(["creator_grow", "creator_scale", "creator_enterprise"]);
    expect(UPGRADE_PATHS.creator_pro).toEqual(["creator_scale", "creator_enterprise"]);
    expect(UPGRADE_PATHS.creator_elite).toEqual(["creator_enterprise"]);
    expect(UPGRADE_PATHS.creator_launch).toEqual(["creator_grow", "creator_scale", "creator_enterprise"]);
    expect(UPGRADE_PATHS.creator_grow).toEqual(["creator_scale", "creator_enterprise"]);
    expect(UPGRADE_PATHS.creator_scale).toEqual(["creator_enterprise"]);
    expect(UPGRADE_PATHS.creator_enterprise).toEqual([]);
  });

  it("should have canonical UPGRADE_PATHS for partner plans", () => {
    expect(UPGRADE_PATHS.agency_free).toEqual(["partner_solo", "partner_growth", "partner_scale", "partner_enterprise"]);
    expect(UPGRADE_PATHS.agency_studio).toEqual(["partner_growth", "partner_scale", "partner_enterprise"]);
    expect(UPGRADE_PATHS.agency_agency).toEqual(["partner_enterprise"]);
  });
});

describe("Capabilities — Plans", () => {
  it("should return canonical Creator Launch via legacy code", () => {
    const free = getPlan("creator_free");
    expect(free).toBeDefined();
    expect(free!.name).toBe("Creator Launch");
    expect(free!.family).toBe("creator");
    expect(free!.price).toBe(0);
  });

  it("should return Creator Grow plan via legacy code", () => {
    const pro = getPlan("creator_pro");
    expect(pro).toBeDefined();
    expect(pro!.name).toBe("Creator Growth");
    expect(pro!.price).toBe(699);
    expect(pro!.recommended).toBe(true);
    expect(pro!.badge).toBe("Most Popular");
  });

  it("should return Creator Scale plan via legacy code", () => {
    const elite = getPlan("creator_elite");
    expect(elite).toBeDefined();
    expect(elite!.name).toBe("Creator Scale");
    expect(elite!.price).toBe(1999);
  });

  it("should return canonical Partner plans via legacy codes", () => {
    const free = getPlan("agency_free");
    expect(free).toBeDefined();
    expect(free!.name).toBe("Partner Launch");
    expect(free!.family).toBe("agency");

    const studio = getPlan("agency_studio");
    expect(studio).toBeDefined();
    expect(studio!.name).toBe("Solo Partner");
    expect(studio!.recommended).toBe(true);

    const agency = getPlan("agency_agency");
    expect(agency).toBeDefined();
    expect(agency!.name).toBe("Partner Growth");
    expect(agency!.price).toBe(4999);
  });

  it("should resolve backward-compat aliases to canonical partner plans", () => {
    expect(getPlan("agency_starter")!.name).toBe("Solo Partner");
    expect(getPlan("agency_growth")!.name).toBe("Partner Scale");
  });

  it("should return undefined for unknown plan", () => {
    expect(getPlan("nonexistent")).toBeUndefined();
  });

  it("should list all canonical plans (no legacy dupes)", () => {
    const all = getAllPlans();
    expect(all.length).toBe(9);
    const codes = all.map((p) => p.code);
    expect(codes).toContain("creator_launch");
    expect(codes).toContain("creator_grow");
    expect(codes).toContain("creator_scale");
    expect(codes).toContain("creator_enterprise");
    expect(codes).toContain("partner_free");
    expect(codes).toContain("partner_solo");
    expect(codes).toContain("partner_growth");
    expect(codes).toContain("partner_scale");
    expect(codes).toContain("partner_enterprise");
  });

  it("should filter canonical plans by family", () => {
    const creator = getPlansByFamily("creator");
    expect(creator.length).toBe(4);
    expect(creator.every((p) => p.family === "creator")).toBe(true);

    const agency = getPlansByFamily("agency");
    expect(agency.length).toBe(5);
    expect(agency.every((p) => p.family === "agency")).toBe(true);
  });
});

describe("Capabilities — Features", () => {
  it("should return feature info for known features", () => {
    const info = getFeatureInfo(FEATURE_IDS.PRODUCTS);
    expect(info.label).toBe("Products");
    expect(info.category).toBe("products");
    expect(info.valueType).toBe("numeric");
  });

  it("should return feature info for boolean features", () => {
    const info = getFeatureInfo(FEATURE_IDS.CUSTOM_DOMAIN);
    expect(info.label).toBe("Custom Domain");
    expect(info.valueType).toBe("boolean");
  });

  it("should generate fallback info for unknown features", () => {
    const info = getFeatureInfo("unknown_feature");
    expect(info.label).toBe("Unknown Feature");
  });

  it("should list all feature IDs", () => {
    const ids = getAllFeatureIds();
    expect(ids.length).toBe(46);
  });

  it("should filter features by category", () => {
    const team = getFeaturesByCategory("team");
    expect(team.length).toBeGreaterThanOrEqual(4);
    expect(team.some((f) => f.label === "Team Members")).toBe(true);

    const analytics = getFeaturesByCategory("analytics");
    expect(analytics.length).toBe(3);
  });

  it("should have complete FEATURE_CATALOG", () => {
    expect(Object.keys(FEATURE_CATALOG).length).toBe(46);
  });
});

describe("Capabilities — Engine.can / cannot", () => {
  it("should allow boolean features when true", () => {
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.ANALYTICS_BASIC).allowed).toBe(true);
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.SEO).allowed).toBe(true);
  });

  it("should deny boolean features when false", () => {
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.PREMIUM_THEMES).allowed).toBe(false);
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(false);
  });

  it("should allow Creator Grow boolean features", () => {
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(false);
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.PREMIUM_THEMES).allowed).toBe(true);
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.AI_TOOLS).allowed).toBe(true);
  });

  it("should allow Creator Scale premium features", () => {
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.PREMIUM_THEMES).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.REMOVE_BRANDING).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.API_ACCESS).allowed).toBe(true);
  });

  it("should gate custom domain, API access, webhooks and live social sync to Creator Scale only", () => {
    for (const plan of ["creator_free", "creator_pro", "creator_grow"]) {
      expect(capabilityEngine.can(plan, FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(false);
      expect(capabilityEngine.can(plan, FEATURE_IDS.API_ACCESS).allowed).toBe(false);
      expect(capabilityEngine.can(plan, FEATURE_IDS.WEBHOOKS).allowed).toBe(false);
      expect(capabilityEngine.can(plan, FEATURE_IDS.LIVE_SOCIAL_SYNC).allowed).toBe(false);
    }
    for (const plan of ["creator_elite", "creator_scale"]) {
      expect(capabilityEngine.can(plan, FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(true);
      expect(capabilityEngine.can(plan, FEATURE_IDS.API_ACCESS).allowed).toBe(true);
      expect(capabilityEngine.can(plan, FEATURE_IDS.WEBHOOKS).allowed).toBe(true);
      expect(capabilityEngine.can(plan, FEATURE_IDS.LIVE_SOCIAL_SYNC).allowed).toBe(true);
    }
  });

  it("should handle numeric limits from feature overrides", () => {
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.PRODUCTS).allowed).toBe(true);
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.PRODUCTS).limit).toBe(3);
    expect(capabilityEngine.can("creator_grow", FEATURE_IDS.PRODUCTS).limit).toBe(-1);
  });

  it("should deny unknown plans", () => {
    expect(capabilityEngine.can("bogus", FEATURE_IDS.PRODUCTS).allowed).toBe(false);
  });

  it("should deny unknown features", () => {
    expect(capabilityEngine.can("creator_free", "bogus").allowed).toBe(false);
  });

  it("cannot should invert can", () => {
    expect(capabilityEngine.cannot("creator_free", FEATURE_IDS.CUSTOM_DOMAIN)).toBe(true);
    expect(capabilityEngine.cannot("creator_pro", FEATURE_IDS.CUSTOM_DOMAIN)).toBe(true);
    expect(capabilityEngine.cannot("creator_elite", FEATURE_IDS.CUSTOM_DOMAIN)).toBe(false);
  });
});

describe("Capabilities — Engine.limit / remaining / used", () => {
  it("should return tiered numeric limits per plan", () => {
    expect(capabilityEngine.limit("creator_free", FEATURE_IDS.PRODUCTS)).toBe(3);
    expect(capabilityEngine.limit("creator_free", FEATURE_IDS.GALLERY)).toBe(3);
    expect(capabilityEngine.limit("creator_free", FEATURE_IDS.API_CALLS)).toBe(1000);
    expect(capabilityEngine.limit("creator_grow", FEATURE_IDS.PRODUCTS)).toBe(-1);
  });

  it("should return remaining counts", () => {
    expect(capabilityEngine.remaining("creator_free", FEATURE_IDS.PRODUCTS, 1)).toBe(2);
    expect(capabilityEngine.remaining("creator_free", FEATURE_IDS.PRODUCTS, 3)).toBe(0);
  });

  it("used should return usage tuple", () => {
    const result = capabilityEngine.used("creator_free", FEATURE_IDS.PRODUCTS, 3);
    expect(result.used).toBe(3);
    expect(result.limit).toBe(3);
    expect(result.remaining).toBe(0);
  });
});

describe("Capabilities — Engine.hasReachedLimit / requiresUpgrade", () => {
  it("should detect limit reached", () => {
    expect(capabilityEngine.hasReachedLimit("creator_free", FEATURE_IDS.PRODUCTS, 5)).toBe(true);
    expect(capabilityEngine.hasReachedLimit("creator_free", FEATURE_IDS.PRODUCTS, 3)).toBe(true);
    expect(capabilityEngine.hasReachedLimit("creator_free", FEATURE_IDS.PRODUCTS, 2)).toBe(false);
  });

  it("requiresUpgrade should allow when under limit", () => {
    const result = capabilityEngine.requiresUpgrade("creator_free", FEATURE_IDS.PRODUCTS, 2);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });

  it("requiresUpgrade should suggest upgrade when at limit", () => {
    const result = capabilityEngine.requiresUpgrade("creator_free", FEATURE_IDS.PRODUCTS, 3);
    expect(result.allowed).toBe(false);
    expect(result.suggestedUpgrade).toBe("creator_grow");
    expect(result.reason).toContain("Limit reached");
  });

  it("requiresUpgrade should suggest upgrade for disabled feature", () => {
    const result = capabilityEngine.requiresUpgrade("creator_free", FEATURE_IDS.CUSTOM_DOMAIN, 0);
    expect(result.allowed).toBe(false);
    expect(result.suggestedUpgrade).toBeDefined();
    expect(result.reason).toContain("not available");
  });

  it("requiresUpgrade should allow Creator Scale features", () => {
    expect(capabilityEngine.requiresUpgrade("creator_elite", FEATURE_IDS.CUSTOM_DOMAIN, 0).allowed).toBe(true);
  });

  it("requiresUpgrade should return allowed for unknown features", () => {
    expect(capabilityEngine.requiresUpgrade("creator_free", "unknown_feat", 0).allowed).toBe(true);
  });
});

describe("Capabilities — Engine.missingFeatures", () => {
  it("should return missing features for Creator Launch", () => {
    const missing = capabilityEngine.missingFeatures("creator_free");
    const labels = missing.map((m) => m.label);
    expect(labels).toContain("Custom Domain");
    expect(labels).toContain("Premium Themes");
    expect(labels).not.toContain("SEO Tools");
    expect(labels).not.toContain("Basic Analytics");
  });

  it("should suggest upgrades for missing features", () => {
    const missing = capabilityEngine.missingFeatures("creator_free");
    const customDomain = missing.find((m) => m.label === "Custom Domain");
    expect(customDomain?.upgradeTo).toBe("creator_scale");
  });

  it("should return fewer missing for Creator Grow", () => {
    const missing = capabilityEngine.missingFeatures("creator_pro");
    const labels = missing.map((m) => m.label);
    expect(labels).toContain("Custom Domain");
    expect(labels).not.toContain("Premium Themes");
  });

  it("should return empty for unknown plan", () => {
    const missing = capabilityEngine.missingFeatures("bogus");
    expect(missing.length).toBe(0);
  });
});

describe("Capabilities — Engine.planSummary", () => {
  it("should return summary for valid plan", () => {
    const summary = capabilityEngine.planSummary("creator_free");
    expect(summary).not.toBeNull();
    expect(summary!.code).toBe("creator_launch");
    expect(summary!.name).toBe("Creator Launch");
    // RCCF-LAUNCH-POLISH-06: theme_background_solid adds one feature to Launch.
    expect(summary!.featureCount).toBe(47);
    expect(summary!.enabledFeatureCount).toBeGreaterThan(0);
  });

  it("should return null for unknown plan", () => {
    expect(capabilityEngine.planSummary("bogus")).toBeNull();
  });
});

describe("Capabilities — Engine.comparePlans", () => {
  it("should compare Creator Launch to Creator Grow", () => {
    const cmp = capabilityEngine.comparePlans("creator_free", "creator_pro");
    expect(cmp).not.toBeNull();
    expect(cmp!.addedFeatures.length).toBeGreaterThan(0);
    const addedLabels = cmp!.addedFeatures.map((f) => f.label);
    expect(addedLabels).not.toContain("Custom Domain");
    expect(addedLabels).toContain("Premium Themes");
    expect(cmp!.priceDifference).toBe(699);
    expect(cmp!.recommendation).toBeTruthy();
  });

  it("should compare Creator Grow to Creator Scale", () => {
    const cmp = capabilityEngine.comparePlans("creator_pro", "creator_elite");
    expect(cmp).not.toBeNull();
    const addedLabels = cmp!.addedFeatures.map((f) => f.label);
    expect(addedLabels).toContain("Remove Branding");
    expect(addedLabels).toContain("API Access");
    expect(addedLabels).toContain("Custom Domain");
    expect(addedLabels).toContain("Webhooks");
    expect(addedLabels).toContain("Live Social Sync");
    expect(cmp!.priceDifference).toBe(1300);
  });

  it("should return null for invalid plans", () => {
    expect(capabilityEngine.comparePlans("bogus", "creator_pro")).toBeNull();
    expect(capabilityEngine.comparePlans("creator_free", "bogus")).toBeNull();
  });

  it("should include recommendation string", () => {
    const cmp = capabilityEngine.comparePlans("creator_free", "creator_pro");
    expect(cmp!.recommendation.length).toBeGreaterThan(0);
  });
});

describe("Capabilities — Engine.recommendedUpgrade", () => {
  it("should suggest an upgrade when tiered limits are exceeded", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "creator_free",
      usage: { max_gallery: 15, max_products: 10 },
    });
    expect(rec).not.toBeNull();
    expect(rec!.targetPlan).toBe("creator_grow");
  });

  it("should return null when no limits exceeded", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "creator_free",
      usage: { max_products: 1, max_gallery: 1 },
    });
    expect(rec).toBeNull();
  });

  it("should return null for unknown plan", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "bogus",
      usage: { max_products: 999 },
    });
    expect(rec).toBeNull();
  });

  it("should return null for top-tier plan", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "creator_elite",
      usage: { max_products: 999 },
    });
    expect(rec).toBeNull();
  });
});

describe("Capabilities — Limits", () => {
  it("should compute effective limit from feature overrides", () => {
    expect(getEffectiveLimit("creator_free", "max_products")).toBe(3);
    expect(getEffectiveLimit("creator_grow", "max_products")).toBe(-1);
  });

  it("should return 0 for unknown plan", () => {
    expect(getEffectiveLimit("bogus", "max_products")).toBe(0);
  });

  it("should check limit correctly", () => {
    const check = checkLimit("creator_free", "max_products", 2);
    expect(check.limit).toBe(3);
    expect(check.used).toBe(2);
    expect(check.remaining).toBe(1);
    expect(check.isUnlimited).toBe(false);
    expect(check.isExceeded).toBe(false);
    expect(check.usagePercent).toBe(67);
  });

  it("should detect exceeded limit", () => {
    const check = checkLimit("creator_free", "max_products", 10);
    expect(check.isExceeded).toBe(true);
    expect(check.remaining).toBe(0);
    expect(check.usagePercent).toBe(100);
  });

  it("should build limits map", () => {
    const map = getLimitsMap("creator_free", { max_products: 3, max_gallery: 2 });
    expect(map.max_products).toBeDefined();
    expect(map.max_gallery).toBeDefined();
    expect(map.max_gallery.isExceeded).toBe(false);
  });

  it("should find over-limit features", () => {
    const over = getOverLimitFeatures("creator_free", { max_products: 10, max_gallery: 2 });
    expect(over.length).toBe(1);
    expect(over[0]!.featureId).toBe("max_products");
  });
});

describe("Capabilities — Validation", () => {
  it("should validate plan codes", () => {
    expect(validatePlanCode("creator_free")).toBe(true);
    expect(validatePlanCode("creator_pro")).toBe(true);
    expect(validatePlanCode("creator_launch")).toBe(true);
    expect(validatePlanCode("agency_agency")).toBe(true);
    expect(validatePlanCode("bogus")).toBe(false);
  });

  it("should validate feature IDs", () => {
    expect(validateFeatureId("max_products")).toBe(true);
    expect(validateFeatureId("custom_domain")).toBe(true);
    expect(validateFeatureId("bogus")).toBe(false);
  });

  it("should validate usage context", () => {
    const errors = validateUsageContext({ planCode: "creator_free", usage: { max_products: 5 } });
    expect(errors.length).toBe(0);
  });

  it("should flag invalid usage context", () => {
    const errors = validateUsageContext({ planCode: "bogus", usage: { bogus: 1 } });
    expect(errors.length).toBe(2);
  });

  it("should validate plan transitions", () => {
    expect(validatePlanTransition("creator_free", "creator_pro").length).toBe(0);
    expect(validatePlanTransition("creator_free", "creator_free").length).toBeGreaterThan(0);
    expect(validatePlanTransition("creator_free", "agency_free").length).toBeGreaterThan(0);
  });

  it("should format canonical plan name", () => {
    expect(formatPlanName("creator_free")).toBe("Creator Launch");
    expect(formatPlanName("bogus")).toBe("Bogus");
  });

  it("should format feature label", () => {
    expect(formatFeatureLabel("max_products")).toBe("Products");
    expect(formatFeatureLabel("custom_domain")).toBe("Custom Domain");
  });
});

describe("Capabilities — Mapper", () => {
  it("should convert plan to summary", () => {
    const plan = getPlan("creator_free")!;
    const summary = toPlanSummary(plan);
    expect(summary.code).toBe("creator_launch");
    // RCCF-LAUNCH-POLISH-06: theme_background_solid adds one feature to Launch.
    expect(summary.featureCount).toBe(47);
  });

  it("should format feature comparison", () => {
    const cmp = formatFeatureComparison("max_products", 5, 10);
    expect(cmp.label).toBe("Products");
    expect(cmp.from).toBe("5");
    expect(cmp.to).toBe("10");
    expect(cmp.improved).toBe(true);
  });

  it("should format unlimited comparison", () => {
    const cmp = formatFeatureComparison("max_products", 5, -1);
    expect(cmp.to).toBe("Unlimited");
    expect(cmp.improved).toBe(true);
  });

  it("should convert comparison to rows", () => {
    const cmp = capabilityEngine.comparePlans("creator_free", "creator_pro")!;
    const rows = comparisonToRows(cmp);
    expect(rows.length).toBeGreaterThan(0);
  });
});

describe("Capabilities — Partner Plans", () => {
  it("should allow partner_free basic features via legacy codes", () => {
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(false);
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.ANALYTICS_BASIC).allowed).toBe(true);
  });

  it("should deny partner_free advanced features via legacy codes", () => {
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.ANALYTICS_ADVANCED).allowed).toBe(false);
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.REMOVE_BRANDING).allowed).toBe(false);
  });
});

describe("Capabilities — Service Delegation", () => {
  it("should delegate can/cannot", () => {
    expect(capabilityService.can("creator_free", "custom_domain").allowed).toBe(false);
    expect(capabilityService.cannot("creator_free", "custom_domain")).toBe(true);
    expect(capabilityService.can("creator_pro", "custom_domain").allowed).toBe(false);
    expect(capabilityService.can("creator_elite", "custom_domain").allowed).toBe(true);
    expect(capabilityService.can("creator_elite", "webhooks").allowed).toBe(true);
    expect(capabilityService.can("creator_elite", "live_social_sync").allowed).toBe(true);
  });

  it("should delegate limit/remaining/used", () => {
    expect(capabilityService.limit("creator_free", "max_products")).toBe(3);
    expect(capabilityService.remaining("creator_free", "max_products", 1)).toBe(2);
    expect(capabilityService.used("creator_free", "max_products", 3).limit).toBe(3);
  });

  it("should delegate canonical plan accessors", () => {
    expect(capabilityService.getPlan("creator_free")?.name).toBe("Creator Launch");
    expect(capabilityService.getAllPlans().length).toBe(9);
    expect(capabilityService.getPlansByFamily("creator").length).toBe(4);
    expect(capabilityService.getPlan("creator_grow")?.price).toBe(699);
    expect(capabilityService.getPlan("creator_scale")?.price).toBe(1999);
  });

  it("should delegate feature accessors", () => {
    expect(capabilityService.getFeatureInfo("max_products").label).toBe("Products");
    expect(capabilityService.getAllFeatureIds().length).toBe(46);
  });

  it("should delegate limit functions", () => {
    expect(capabilityService.getEffectiveLimit("creator_free", "max_products")).toBe(3);
    expect(capabilityService.checkLimit("creator_free", "max_products", 6).isExceeded).toBe(true);
  });
});
