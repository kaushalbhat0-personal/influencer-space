import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockBillingPlanFindMany } = vi.hoisted(() => ({
  mockBillingPlanFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { billingPlan: { findMany: mockBillingPlanFindMany } },
}));

vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: vi.fn().mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" }),
}));

import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";
import { capabilityService } from "@/lib/capabilities";
import { loadRuntimeFeatureOverrides, resetRuntimeConfigLoaderCache } from "@/modules/billing/application/runtime-config-loader";
import { enforceContentLimit } from "@/modules/billing/application/content-limit.enforcement";

beforeEach(() => {
  vi.clearAllMocks();
  resetRuntimeFeatureOverrides();
  resetRuntimeConfigLoaderCache();
  mockBillingPlanFindMany.mockReset();
  mockBillingPlanFindMany.mockResolvedValue([]);
});

describe("RCCF-29 — Super Admin runtime config → enforcement propagation", () => {
  it("applies persisted featureOverrides from the DB to the capability engine", async () => {
    mockBillingPlanFindMany.mockResolvedValue([
      { code: "creator_grow", runtimeConfig: { featureOverrides: { max_products: 7 } } },
    ]);

    await loadRuntimeFeatureOverrides();

    expect(capabilityService.limit("creator_grow", "max_products")).toBe(7);
  });

  it("uses the static registry when no runtime override exists", async () => {
    await loadRuntimeFeatureOverrides();

    expect(capabilityService.limit("creator_grow", "max_products")).toBe(-1);
  });

  it("propagates to content-limit enforcement (7 product cap enforced)", async () => {
    applyRuntimeFeatureOverrides("creator_grow", { max_products: 7 });

    // used < limit → still has headroom → allowed
    const under = await enforceContentLimit({ tenantId: "t1", featureKey: "max_products", used: 6 });
    expect(under.ok).toBe(true);

    // used === limit → no headroom → 8th rejected
    const over = await enforceContentLimit({ tenantId: "t1", featureKey: "max_products", used: 7 });
    expect(over.ok).toBe(false);
    expect(over.limit).toBe(7);
  });

  it("resets back to static values", () => {
    applyRuntimeFeatureOverrides("creator_grow", { max_products: 7 });
    resetRuntimeFeatureOverrides();
    expect(capabilityService.limit("creator_grow", "max_products")).toBe(-1);
  });

  it("RCCF-35: resetRuntimeConfigLoaderCache clears applied overrides AND a reload picks up the new DB values", async () => {
    mockBillingPlanFindMany.mockResolvedValue([
      { code: "creator_grow", runtimeConfig: { featureOverrides: { max_products: 7 } } },
    ]);
    await loadRuntimeFeatureOverrides();
    expect(capabilityService.limit("creator_grow", "max_products")).toBe(7);

    // Super Admin saves a change → cache reset → enforcement must reflect the
    // new value without a process restart.
    resetRuntimeConfigLoaderCache();
    expect(capabilityService.limit("creator_grow", "max_products")).toBe(-1);

    mockBillingPlanFindMany.mockResolvedValue([
      { code: "creator_grow", runtimeConfig: { featureOverrides: { max_products: 12 } } },
    ]);
    await loadRuntimeFeatureOverrides();
    expect(capabilityService.limit("creator_grow", "max_products")).toBe(12);
  });

  it("falls back to static when the DB read fails", async () => {
    mockBillingPlanFindMany.mockRejectedValue(new Error("db down"));

    await loadRuntimeFeatureOverrides();

    expect(capabilityService.limit("creator_scale", "max_products")).toBe(-1);
  });
});