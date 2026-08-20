import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPlan, mockCount } = vi.hoisted(() => ({
  mockPlan: vi.fn(),
  mockCount: vi.fn(),
}));

vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: mockPlan,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { count: mockCount },
    offering: { count: mockCount },
    timelineEvent: { count: mockCount },
    affiliateLink: { count: mockCount },
    game: { count: mockCount },
    galleryImage: { count: mockCount },
    booking: { count: mockCount },
    contentFeedItem: { count: mockCount },
    setting: { findUnique: mockCount },
  },
}));

import { enforceContentLimit, countContentUsage } from "@/modules/billing/application/content-limit.enforcement";
import { FEATURE_IDS } from "@/lib/capabilities/constants";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("enforceContentLimit — RCCF-08", () => {
  it("allows creation when current usage is below the plan limit", async () => {
    mockPlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.PRODUCTS, used: 2 });
    expect(r.ok).toBe(true);
  });

  it("rejects creation when the plan limit is reached", async () => {
    mockPlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.PRODUCTS, used: 3 });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Core content limit reached");
    expect(r.reason).toContain("3/3");
  });

  it("RCCF-72.15B: courses are capability-available on Launch (no longer max_courses=0)", async () => {
    mockPlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    mockCount.mockResolvedValue(0);
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.COURSES, used: 0 });
    expect(r.ok).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it("RCCF-72.15B: Launch enforces the global 3-active-core ceiling across types", async () => {
    mockPlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    // 3 active core items (product + service + course counts sum to 3).
    mockCount.mockResolvedValue(3);
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.GAMES, used: 3 });
    expect(r.ok).toBe(false);
    expect(r.reason).toContain("Core content limit reached");
    expect(r.limit).toBe(3);
    expect(r.suggestedUpgrade).toBeTruthy();
  });

  it("allows unlimited plans to create beyond the base limit", async () => {
    mockPlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.GALLERY, used: 1000 });
    expect(r.ok).toBe(true);
  });

  it("defaults to the Launch plan when no subscription exists", async () => {
    mockPlan.mockResolvedValue({ code: null, origin: "none", status: null });
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.PRODUCTS, used: 3 });
    expect(r.ok).toBe(false);
  });

  it("counts usage from the DB when no used count is passed", async () => {
    mockPlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    mockCount.mockResolvedValue(3);
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.PRODUCTS });
    expect(r.ok).toBe(false);
    expect(mockCount).toHaveBeenCalled();
  });

  it("counts setting-backed collections (testimonials) from Tenant settings", async () => {
    mockCount.mockResolvedValue({ value: [{ id: "1" }, { id: "2" }, { id: "3" }] });
    const used = await countContentUsage("t1", FEATURE_IDS.TESTIMONIALS);
    expect(used).toBe(3);
    expect(mockCount).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_key: { tenantId: "t1", key: "testimonials" } },
    }));
  });

  it("suggests an upgrade path when a creator plan is maxed out", async () => {
    mockPlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    const r = await enforceContentLimit({ tenantId: "t1", featureKey: FEATURE_IDS.GALLERY, used: 3 });
    expect(r.ok).toBe(false);
    expect(r.suggestedUpgrade).toBeDefined();
  });

  it("maps services to coaching offerings and courses to course offerings", async () => {
    mockCount.mockResolvedValue(1);
    await countContentUsage("t1", FEATURE_IDS.SERVICES);
    expect(mockCount).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "t1", type: "coaching" } }));
    await countContentUsage("t1", FEATURE_IDS.COURSES);
    expect(mockCount).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "t1", type: "course" } }));
  });
});