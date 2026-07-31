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
  it("should define all plan codes", () => {
    expect(PLAN_CODES).toContain("creator_free");
    expect(PLAN_CODES).toContain("creator_pro");
    expect(PLAN_CODES).toContain("creator_elite");
    expect(PLAN_CODES).toContain("agency_free");
    expect(PLAN_CODES).toContain("agency_studio");
    expect(PLAN_CODES).toContain("agency_agency");
  });

  it("should include backward-compat aliases", () => {
    expect(PLAN_CODES).toContain("agency_starter");
    expect(PLAN_CODES).toContain("agency_growth");
  });

  it("should define all feature IDs", () => {
    const ids = Object.values(FEATURE_IDS);
    expect(ids.length).toBe(36);
    expect(ids).toContain("max_products");
    expect(ids).toContain("custom_domain");
    expect(ids).toContain("seo");
    expect(ids).toContain("ai_automation");
    expect(ids).toContain("white_label");
    expect(ids).toContain("max_websites");
  });

  it("should have UPGRADE_PATHS for creator plans", () => {
    expect(UPGRADE_PATHS.creator_free).toEqual(["creator_pro", "creator_elite"]);
    expect(UPGRADE_PATHS.creator_pro).toEqual(["creator_elite"]);
    expect(UPGRADE_PATHS.creator_elite).toEqual([]);
  });

  it("should have UPGRADE_PATHS for agency plans", () => {
    expect(UPGRADE_PATHS.agency_free).toEqual(["agency_studio", "agency_agency"]);
    expect(UPGRADE_PATHS.agency_studio).toEqual(["agency_agency"]);
    expect(UPGRADE_PATHS.agency_agency).toEqual([]);
  });
});

describe("Capabilities — Plans", () => {
  it("should return plan by code", () => {
    const free = getPlan("creator_free");
    expect(free).toBeDefined();
    expect(free!.name).toBe("Starter");
    expect(free!.family).toBe("creator");
    expect(free!.price).toBe(0);
  });

  it("should return Pro plan", () => {
    const pro = getPlan("creator_pro");
    expect(pro).toBeDefined();
    expect(pro!.name).toBe("Pro");
    expect(pro!.price).toBe(999);
    expect(pro!.recommended).toBe(true);
    expect(pro!.badge).toBe("Most Popular");
  });

  it("should return Elite plan", () => {
    const elite = getPlan("creator_elite");
    expect(elite).toBeDefined();
    expect(elite!.price).toBe(2999);
    expect(elite!.features.max_products).toBe(UNLIMITED);
  });

  it("should return agency plans", () => {
    const free = getPlan("agency_free");
    expect(free).toBeDefined();
    expect(free!.name).toBe("Free");
    expect(free!.family).toBe("agency");

    const studio = getPlan("agency_studio");
    expect(studio).toBeDefined();
    expect(studio!.name).toBe("Studio");
    expect(studio!.recommended).toBe(true);

    const agency = getPlan("agency_agency");
    expect(agency).toBeDefined();
    expect(agency!.name).toBe("Agency");
    expect(agency!.price).toBe(4999);
  });

  it("should resolve backward-compat aliases", () => {
    expect(getPlan("agency_starter")!.name).toBe("Studio");
    expect(getPlan("agency_growth")!.name).toBe("Agency");
  });

  it("should return undefined for unknown plan", () => {
    expect(getPlan("nonexistent")).toBeUndefined();
  });

  it("should list all canonical plans (no dupes)", () => {
    const all = getAllPlans();
    expect(all.length).toBe(6);
    const codes = all.map((p) => p.code);
    expect(codes).toContain("creator_free");
    expect(codes).not.toContain("agency_starter");
  });

  it("should filter plans by family", () => {
    const creator = getPlansByFamily("creator");
    expect(creator.length).toBe(3);
    expect(creator.every((p) => p.family === "creator")).toBe(true);

    const agency = getPlansByFamily("agency");
    expect(agency.length).toBe(3);
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
    expect(ids.length).toBe(35);
  });

  it("should filter features by category", () => {
    const team = getFeaturesByCategory("team");
    expect(team.length).toBeGreaterThanOrEqual(4);
    expect(team.some((f) => f.label === "Team Members")).toBe(true);

    const analytics = getFeaturesByCategory("analytics");
    expect(analytics.length).toBe(3);
  });

  it("should have complete FEATURE_CATALOG", () => {
    expect(Object.keys(FEATURE_CATALOG).length).toBe(35);
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

  it("should allow Pro boolean features", () => {
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(true);
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.PREMIUM_THEMES).allowed).toBe(true);
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.AI_TOOLS).allowed).toBe(true);
  });

  it("should allow Elite all features", () => {
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.PREMIUM_THEMES).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.REMOVE_BRANDING).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.API_ACCESS).allowed).toBe(true);
    expect(capabilityEngine.can("creator_elite", FEATURE_IDS.WEBHOOKS).allowed).toBe(true);
  });

  it("should handle numeric limits correctly", () => {
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.PRODUCTS).allowed).toBe(true);
    expect(capabilityEngine.can("creator_free", FEATURE_IDS.PRODUCTS).limit).toBe(5);
    expect(capabilityEngine.can("creator_pro", FEATURE_IDS.PRODUCTS).limit).toBe(UNLIMITED);
  });

  it("should deny unknown plans", () => {
    expect(capabilityEngine.can("bogus", FEATURE_IDS.PRODUCTS).allowed).toBe(false);
  });

  it("should deny unknown features", () => {
    expect(capabilityEngine.can("creator_free", "bogus").allowed).toBe(false);
  });

  it("cannot should invert can", () => {
    expect(capabilityEngine.cannot("creator_free", FEATURE_IDS.CUSTOM_DOMAIN)).toBe(true);
    expect(capabilityEngine.cannot("creator_pro", FEATURE_IDS.CUSTOM_DOMAIN)).toBe(false);
  });
});

describe("Capabilities — Engine.limit / remaining / used", () => {
  it("should return numeric limits", () => {
    expect(capabilityEngine.limit("creator_free", FEATURE_IDS.PRODUCTS)).toBe(5);
    expect(capabilityEngine.limit("creator_free", FEATURE_IDS.GALLERY)).toBe(10);
    expect(capabilityEngine.limit("creator_free", FEATURE_IDS.API_CALLS)).toBe(1000);
  });

  it("should return -1 for unlimited features", () => {
    expect(capabilityEngine.limit("creator_pro", FEATURE_IDS.PRODUCTS)).toBe(UNLIMITED);
  });

  it("should return remaining counts", () => {
    expect(capabilityEngine.remaining("creator_free", FEATURE_IDS.PRODUCTS, 3)).toBe(2);
    expect(capabilityEngine.remaining("creator_free", FEATURE_IDS.PRODUCTS, 5)).toBe(0);
  });

  it("should return infinity remaining for unlimited", () => {
    expect(capabilityEngine.remaining("creator_pro", FEATURE_IDS.PRODUCTS, 100)).toBe(Infinity);
  });

  it("used should return usage tuple", () => {
    const result = capabilityEngine.used("creator_free", FEATURE_IDS.PRODUCTS, 3);
    expect(result.used).toBe(3);
    expect(result.limit).toBe(5);
    expect(result.remaining).toBe(2);
  });
});

describe("Capabilities — Engine.hasReachedLimit / requiresUpgrade", () => {
  it("should detect limit reached", () => {
    expect(capabilityEngine.hasReachedLimit("creator_free", FEATURE_IDS.PRODUCTS, 5)).toBe(true);
    expect(capabilityEngine.hasReachedLimit("creator_free", FEATURE_IDS.PRODUCTS, 3)).toBe(false);
  });

  it("should never reach unlimited limit", () => {
    expect(capabilityEngine.hasReachedLimit("creator_pro", FEATURE_IDS.PRODUCTS, 999999)).toBe(false);
  });

  it("requiresUpgrade should allow when under limit", () => {
    const result = capabilityEngine.requiresUpgrade("creator_free", FEATURE_IDS.PRODUCTS, 3);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("requiresUpgrade should suggest upgrade when at limit", () => {
    const result = capabilityEngine.requiresUpgrade("creator_free", FEATURE_IDS.PRODUCTS, 5);
    expect(result.allowed).toBe(false);
    expect(result.suggestedUpgrade).toBe("creator_pro");
    expect(result.reason).toContain("Limit reached");
  });

  it("requiresUpgrade should suggest upgrade for disabled feature", () => {
    const result = capabilityEngine.requiresUpgrade("creator_free", FEATURE_IDS.CUSTOM_DOMAIN, 0);
    expect(result.allowed).toBe(false);
    expect(result.suggestedUpgrade).toBeDefined();
    expect(result.reason).toContain("not available");
  });

  it("requiresUpgrade should allow Elite features", () => {
    expect(capabilityEngine.requiresUpgrade("creator_elite", FEATURE_IDS.CUSTOM_DOMAIN, 0).allowed).toBe(true);
  });

  it("requiresUpgrade should return allowed for unknown features", () => {
    expect(capabilityEngine.requiresUpgrade("creator_free", "unknown_feat", 0).allowed).toBe(true);
  });
});

describe("Capabilities — Engine.missingFeatures", () => {
  it("should return missing features for Starter", () => {
    const missing = capabilityEngine.missingFeatures("creator_free");
    const labels = missing.map((m) => m.label);
    expect(labels).toContain("Custom Domain");
    expect(labels).toContain("Premium Themes");
    expect(labels).toContain("AI Tools");
    expect(labels).toContain("Priority Support");
    expect(labels).toContain("Remove Branding");
    expect(labels).not.toContain("SEO Tools");
    expect(labels).not.toContain("Basic Analytics");
  });

  it("should suggest upgrades for missing features", () => {
    const missing = capabilityEngine.missingFeatures("creator_free");
    const customDomain = missing.find((m) => m.label === "Custom Domain");
    expect(customDomain?.upgradeTo).toBe("creator_pro");
  });

  it("should return fewer missing for Pro", () => {
    const missing = capabilityEngine.missingFeatures("creator_pro");
    const labels = missing.map((m) => m.label);
    expect(labels).toContain("Remove Branding");
    expect(labels).not.toContain("Custom Domain");
    expect(labels).not.toContain("Premium Themes");
  });

  it("should return only white_label and clients as missing for Elite", () => {
    const missing = capabilityEngine.missingFeatures("creator_elite");
    const labels = missing.map((m) => m.label);
    expect(labels).toContain("White Label");
    expect(labels).not.toContain("Custom Domain");
    expect(labels).not.toContain("API Access");
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
    expect(summary!.code).toBe("creator_free");
    expect(summary!.name).toBe("Starter");
    expect(summary!.featureCount).toBe(35);
    expect(summary!.enabledFeatureCount).toBeGreaterThan(0);
  });

  it("should return null for unknown plan", () => {
    expect(capabilityEngine.planSummary("bogus")).toBeNull();
  });
});

describe("Capabilities — Engine.comparePlans", () => {
  it("should compare Starter to Pro", () => {
    const cmp = capabilityEngine.comparePlans("creator_free", "creator_pro");
    expect(cmp).not.toBeNull();
    expect(cmp!.addedFeatures.length).toBeGreaterThan(0);
    const addedLabels = cmp!.addedFeatures.map((f) => f.label);
    expect(addedLabels).toContain("Custom Domain");
    expect(addedLabels).toContain("Premium Themes");
    expect(addedLabels).toContain("AI Tools");
    expect(cmp!.upgradedLimits.length).toBeGreaterThan(0);
    expect(cmp!.priceDifference).toBe(999);
    expect(cmp!.recommendation).toBeTruthy();
  });

  it("should compare Pro to Elite", () => {
    const cmp = capabilityEngine.comparePlans("creator_pro", "creator_elite");
    expect(cmp).not.toBeNull();
    expect(cmp!.addedFeatures.map((f) => f.label)).toContain("Remove Branding");
    expect(cmp!.addedFeatures.map((f) => f.label)).toContain("API Access");
    expect(cmp!.addedFeatures.map((f) => f.label)).toContain("Webhooks");
    expect(cmp!.priceDifference).toBe(2000);
  });

  it("should compare Studio to Agency", () => {
    const cmp = capabilityEngine.comparePlans("agency_studio", "agency_agency");
    expect(cmp).not.toBeNull();
    expect(cmp!.priceDifference).toBe(3000);
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
  it("should recommend upgrade when over product limit", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "creator_free",
      usage: { max_products: 10 },
    });
    expect(rec).not.toBeNull();
    expect(rec!.currentPlan).toBe("creator_free");
    expect(rec!.targetPlan).toBe("creator_pro");
    expect(rec!.priority).toBe("high");
  });

  it("should recommend higher upgrade when Pro limit also exceeded", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "creator_pro",
      usage: { max_products: 999, max_gallery: 999 },
    });
    expect(rec).not.toBeNull();
    expect(rec!.targetPlan).toBe("creator_elite");
  });

  it("should return null when no limits exceeded", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "creator_free",
      usage: { max_products: 1, max_gallery: 1 },
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

  it("should return null for unknown plan", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "bogus",
      usage: { max_products: 999 },
    });
    expect(rec).toBeNull();
  });

  it("should have high priority when at limit", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "agency_free",
      usage: { max_clients: 2 },
    });
    expect(rec).not.toBeNull();
    expect(rec!.priority).toBe("high");
  });
});

describe("Capabilities — Limits", () => {
  it("should compute effective limit", () => {
    expect(getEffectiveLimit("creator_free", "max_products")).toBe(5);
    expect(getEffectiveLimit("creator_pro", "max_products")).toBe(UNLIMITED);
  });

  it("should return 0 for unknown plan", () => {
    expect(getEffectiveLimit("bogus", "max_products")).toBe(0);
  });

  it("should check limit correctly", () => {
    const check = checkLimit("creator_free", "max_products", 3);
    expect(check.limit).toBe(5);
    expect(check.used).toBe(3);
    expect(check.remaining).toBe(2);
    expect(check.isUnlimited).toBe(false);
    expect(check.isExceeded).toBe(false);
    expect(check.usagePercent).toBe(60);
  });

  it("should detect exceeded limit", () => {
    const check = checkLimit("creator_free", "max_products", 10);
    expect(check.isExceeded).toBe(true);
    expect(check.remaining).toBe(0);
    expect(check.usagePercent).toBe(100);
  });

  it("should handle unlimited limits", () => {
    const check = checkLimit("creator_pro", "max_products", 100);
    expect(check.isUnlimited).toBe(true);
    expect(check.isExceeded).toBe(false);
    expect(check.remaining).toBe(Infinity);
    expect(check.usagePercent).toBe(0);
  });

  it("should build limits map", () => {
    const map = getLimitsMap("creator_free", { max_products: 3, max_gallery: 10 });
    expect(map.max_products).toBeDefined();
    expect(map.max_gallery).toBeDefined();
    expect(map.max_gallery.isExceeded).toBe(false);
  });

  it("should find over-limit features", () => {
    const over = getOverLimitFeatures("creator_free", { max_products: 10, max_gallery: 5 });
    expect(over.length).toBe(1);
    expect(over[0]!.featureId).toBe("max_products");
  });
});

describe("Capabilities — Validation", () => {
  it("should validate plan codes", () => {
    expect(validatePlanCode("creator_free")).toBe(true);
    expect(validatePlanCode("creator_pro")).toBe(true);
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

  it("should format plan name", () => {
    expect(formatPlanName("creator_free")).toBe("Starter");
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
    expect(summary.code).toBe("creator_free");
    expect(summary.featureCount).toBe(35);
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
    expect(rows.some((r) => r.type === "feature")).toBe(true);
    expect(rows.some((r) => r.type === "limit")).toBe(true);
  });
});

describe("Capabilities — Agency Plans", () => {
  it("should allow agency_free basic features", () => {
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.CUSTOM_DOMAIN).allowed).toBe(true);
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.ANALYTICS_BASIC).allowed).toBe(true);
  });

  it("should deny agency_free advanced features", () => {
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.ANALYTICS_ADVANCED).allowed).toBe(false);
    expect(capabilityEngine.can("agency_free", FEATURE_IDS.REMOVE_BRANDING).allowed).toBe(false);
  });

  it("should set client limits for agency plans", () => {
    expect(capabilityEngine.limit("agency_free", "max_clients")).toBe(1);
    expect(capabilityEngine.limit("agency_studio", "max_clients")).toBe(5);
    expect(capabilityEngine.limit("agency_agency", "max_clients")).toBe(20);
  });

  it("should set website limits for agency plans", () => {
    expect(capabilityEngine.limit("agency_free", "max_websites")).toBe(1);
    expect(capabilityEngine.limit("agency_studio", "max_websites")).toBe(5);
    expect(capabilityEngine.limit("agency_agency", "max_websites")).toBe(20);
  });

  it("should detect over-limit clients", () => {
    const over = getOverLimitFeatures("agency_free", { max_clients: 5 });
    expect(over.length).toBe(1);
    expect(over[0]!.featureId).toBe("max_clients");
  });

  it("should suggest upgrade from agency_free to agency_studio", () => {
    const rec = capabilityEngine.recommendedUpgrade({
      planCode: "agency_free",
      usage: { max_clients: 5 },
    });
    expect(rec).not.toBeNull();
    expect(rec!.targetPlan).toBe("agency_studio");
  });
});

describe("Capabilities — Service Delegation", () => {
  it("should delegate can/cannot", () => {
    expect(capabilityService.can("creator_free", "custom_domain").allowed).toBe(false);
    expect(capabilityService.cannot("creator_free", "custom_domain")).toBe(true);
    expect(capabilityService.can("creator_pro", "custom_domain").allowed).toBe(true);
  });

  it("should delegate limit/remaining/used", () => {
    expect(capabilityService.limit("creator_free", "max_products")).toBe(5);
    expect(capabilityService.remaining("creator_free", "max_products", 3)).toBe(2);
    expect(capabilityService.used("creator_free", "max_products", 3).limit).toBe(5);
  });

  it("should delegate plan accessors", () => {
    expect(capabilityService.getPlan("creator_free")?.name).toBe("Starter");
    expect(capabilityService.getAllPlans().length).toBe(6);
    expect(capabilityService.getPlansByFamily("creator").length).toBe(3);
  });

  it("should delegate feature accessors", () => {
    expect(capabilityService.getFeatureInfo("max_products").label).toBe("Products");
    expect(capabilityService.getAllFeatureIds().length).toBe(35);
  });

  it("should delegate limit functions", () => {
    expect(capabilityService.getEffectiveLimit("creator_free", "max_products")).toBe(5);
    expect(capabilityService.checkLimit("creator_free", "max_products", 6).isExceeded).toBe(true);
  });
});
