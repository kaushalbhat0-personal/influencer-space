import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResolveActivePlan, mockResolvePolicy, mockSuggestedUpgrade, mockTenantFindUnique, mockUsageFindUnique, mockWorkspaceFindUnique, mockSubFindUnique } = vi.hoisted(() => ({
  mockResolveActivePlan: vi.fn(),
  mockResolvePolicy: vi.fn(),
  mockSuggestedUpgrade: vi.fn(),
  mockTenantFindUnique: vi.fn(),
  mockUsageFindUnique: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
  mockSubFindUnique: vi.fn(),
}));

vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: mockResolveActivePlan }));
vi.mock("@/lib/publishing/publish-policy", () => ({
  resolvePublishPolicy: mockResolvePolicy,
  suggestedPublishUpgrade: mockSuggestedUpgrade,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    workspace: { findUnique: mockWorkspaceFindUnique },
    billingSubscription: { findUnique: mockSubFindUnique },
    planUsage: { findUnique: mockUsageFindUnique },
  },
}));

import { getPublishUsage } from "@/lib/publishing/publish-usage";

const CREATED = new Date("2026-01-10T08:30:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveActivePlan.mockReset();
  mockResolvePolicy.mockReset();
  mockSuggestedUpgrade.mockReset();
  mockTenantFindUnique.mockReset();
  mockUsageFindUnique.mockReset();
  mockWorkspaceFindUnique.mockReset();
  mockSubFindUnique.mockReset();
  mockTenantFindUnique.mockResolvedValue({ createdAt: CREATED });
  mockUsageFindUnique.mockResolvedValue(null);
  mockWorkspaceFindUnique.mockResolvedValue({ id: "w1" });
  mockSubFindUnique.mockResolvedValue(null);
});

describe("getPublishUsage — RCCF-32 authoritative read", () => {
  it("new Launch creator with no usage row returns 0/3 remaining 3", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch" });
    mockResolvePolicy.mockResolvedValue({ mode: "lifetime", limit: 3 });
    mockSuggestedUpgrade.mockReturnValue("growth");

    const u = await getPublishUsage("t1");

    expect(u).toMatchObject({ mode: "lifetime", used: 0, limit: 3, remaining: 3, isExhausted: false, suggestedUpgrade: "growth" });
    expect(u.periodStart).toEqual(CREATED);
    expect(u.periodEnd).toBeNull();
    // no usage row was created — only read
    expect(mockUsageFindUnique).toHaveBeenCalledTimes(1);
  });

  it("Launch after one publish returns 1/3 remaining 2", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch" });
    mockResolvePolicy.mockResolvedValue({ mode: "lifetime", limit: 3 });
    mockSuggestedUpgrade.mockReturnValue("growth");
    mockUsageFindUnique.mockResolvedValue({ id: "u1", used: 1 });

    const u = await getPublishUsage("t1");

    expect(u).toMatchObject({ used: 1, remaining: 2, isExhausted: false });
  });

  it("exhausted Launch returns isExhausted true", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch" });
    mockResolvePolicy.mockResolvedValue({ mode: "lifetime", limit: 3 });
    mockSuggestedUpgrade.mockReturnValue("growth");
    mockUsageFindUnique.mockResolvedValue({ id: "u1", used: 3 });

    const u = await getPublishUsage("t1");

    expect(u).toMatchObject({ used: 3, remaining: 0, isExhausted: true });
  });

  it("Growth returns a monthly window and scale upgrade", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_grow" });
    mockResolvePolicy.mockResolvedValue({ mode: "monthly", limit: 10 });
    mockSuggestedUpgrade.mockReturnValue("scale");
    mockUsageFindUnique.mockResolvedValue({ id: "u1", used: 8 });

    const u = await getPublishUsage("t1");

    expect(u).toMatchObject({ mode: "monthly", used: 8, limit: 10, remaining: 2, isExhausted: false, suggestedUpgrade: "scale" });
    expect(u.periodStart).not.toBeNull();
    expect(u.periodEnd).not.toBeNull();
  });

  it("Scale/Enterprise unlimited returns null limit and no exhaustion", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale" });
    mockResolvePolicy.mockResolvedValue({ mode: "unlimited", limit: null });
    mockSuggestedUpgrade.mockReturnValue(null);

    const u = await getPublishUsage("t1");

    expect(u).toEqual({
      mode: "unlimited",
      used: 0,
      limit: null,
      remaining: null,
      periodStart: null,
      periodEnd: null,
      isExhausted: false,
      suggestedUpgrade: null,
      trialExpired: false,
    });
  });

  it("flags trialExpired when the Launch trial has ended", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch" });
    mockResolvePolicy.mockResolvedValue({ mode: "lifetime", limit: 3 });
    mockSuggestedUpgrade.mockReturnValue("growth");
    mockSubFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: new Date(Date.now() - 60_000) });

    const u = await getPublishUsage("t1");

    expect(u.trialExpired).toBe(true);
  });

  it("keeps trialExpired false during an active trial", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch" });
    mockResolvePolicy.mockResolvedValue({ mode: "lifetime", limit: 3 });
    mockSuggestedUpgrade.mockReturnValue("growth");
    mockSubFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: new Date(Date.now() + 60_000) });

    const u = await getPublishUsage("t1");

    expect(u.trialExpired).toBe(false);
  });
});