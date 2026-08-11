import { describe, it, expect, vi, beforeEach } from "vitest";
import { computeSubscriptionSplit, resolveSplitSource, type RevenueSplit } from "@/lib/commission/runtime";

const { mockRules, mockLoyaltyTiers, mockClientCount, mockRevShare, mockPolicy } = vi.hoisted(() => ({
  mockRules: vi.fn(),
  mockLoyaltyTiers: vi.fn(),
  mockClientCount: vi.fn(),
  mockRevShare: vi.fn(),
  mockPolicy: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionRule: { findMany: mockRules },
    loyaltyTier: { findMany: mockLoyaltyTiers },
    agencyTenant: { count: mockClientCount, findUnique: mockRevShare },
    commissionPolicy: { findFirst: mockPolicy },
  },
}));

beforeEach(() => {
  mockRules.mockReset();
  mockLoyaltyTiers.mockReset();
  mockClientCount.mockReset();
  mockRevShare.mockReset();
  mockPolicy.mockReset();
});

describe("RCCF-IMPLEMENTATION-72 — subscription revenue split", () => {
  it("computes an 80/20 platform/agency split that sums to the amount", () => {
    const src = { platformPercent: 80, partnerPercent: 20, ruleId: null, source: "default" as const };
    const split = computeSubscriptionSplit(699, src);
    expect(split.platformPercent).toBe(80);
    expect(split.partnerPercent).toBe(20);
    expect(Math.round((split.platformShare + split.partnerShare) * 100) / 100).toBe(699);
    expect(split.partnerShare).toBe(139.8);
    expect(split.platformShare).toBe(559.2);
  });

  it("computes a 70/30 split (CommissionPolicy agencyDefaultShare)", () => {
    const src = { platformPercent: 70, partnerPercent: 30, ruleId: null, source: "policy" as const };
    const split = computeSubscriptionSplit(1000, src);
    expect(split.partnerShare).toBe(300);
    expect(split.platformShare).toBe(700);
  });

  it("handles a partner rule override (e.g. 60/40)", () => {
    const src = { platformPercent: 60, partnerPercent: 40, ruleId: "rule_x", source: "rule" as const };
    const split = computeSubscriptionSplit(2500, src);
    expect(split.partnerShare).toBe(1000);
    expect(split.platformShare).toBe(1500);
    expect(split.ruleId).toBe("rule_x");
  });

  it("never yields a negative partner share and never over-splits", () => {
    const src = { platformPercent: 50, partnerPercent: 50, ruleId: null, source: "default" as const };
    for (const amount of [1, 3, 99, 101, 699, 1999]) {
      const split = computeSubscriptionSplit(amount, src);
      expect(split.partnerShare).toBeGreaterThanOrEqual(0);
      expect(Math.round((split.platformShare + split.partnerShare) * 100) / 100).toBe(Math.round(amount * 100) / 100);
    }
  });

  it("rounds to paise (2dp) consistently", () => {
    const src = { platformPercent: 70, partnerPercent: 30, ruleId: null, source: "policy" as const };
    const split = computeSubscriptionSplit(1999, src);
    expect(split.partnerShare).toBe(599.7);
    expect(split.platformShare).toBe(1399.3);
    expect(split.platformShare + split.partnerShare).toBe(1999);
  });
});

describe("RCCF-IMPLEMENTATION-75 — resolveSplitSource loyalty ordering", () => {
  // react `cache` memoizes by args — every case uses a unique partnerId.
  it("applies the loyalty tier when no explicit partner rule exists", async () => {
    mockRules.mockResolvedValue([]);
    mockClientCount.mockResolvedValue(12); // Growth tier → 40%
    mockLoyaltyTiers.mockResolvedValue([
      { id: "t1", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
      { id: "t2", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
    ]);
    const src = await resolveSplitSource("agency_loy1", "creator_scale", "tenant_loy1");
    expect(src.source).toBe("loyalty");
    expect(src.partnerPercent).toBe(40);
    expect(src.platformPercent).toBe(60);
  });

  it("explicit partner rule beats the loyalty tier", async () => {
    mockRules.mockResolvedValue([
      { id: "rule_override", type: "partner_override", partnerId: "agency_loy2", platformSharePercent: 60, partnerSharePercent: 40, metadata: {}, effectiveFrom: new Date(2020, 0, 1), effectiveTo: null, priority: 10 },
    ]);
    const src = await resolveSplitSource("agency_loy2", "creator_scale", "tenant_loy2");
    expect(src.source).toBe("rule");
    expect(src.partnerPercent).toBe(40);
    expect(src.ruleId).toBe("rule_override");
  });

  it("loyalty tier beats the AgencyTenant relationship share", async () => {
    mockRules.mockResolvedValue([]);
    mockRevShare.mockResolvedValue({ revSharePercent: 20 });
    mockClientCount.mockResolvedValue(30); // Scale tier → 50%
    mockLoyaltyTiers.mockResolvedValue([
      { id: "t1", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
      { id: "t2", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
      { id: "t3", name: "Scale", minActiveClients: 25, maxActiveClients: null, commissionPercent: 50 },
    ]);
    const src = await resolveSplitSource("agency_loy3", "creator_grow", "tenant_loy3");
    expect(src.source).toBe("loyalty");
    expect(src.partnerPercent).toBe(50);
  });

  it("falls back to relationship → policy → default when no loyalty tier is configured", async () => {
    mockRules.mockResolvedValue([]);
    mockLoyaltyTiers.mockResolvedValue([]);
    mockClientCount.mockResolvedValue(5);

    mockRevShare.mockResolvedValue({ revSharePercent: 20 });
    mockPolicy.mockResolvedValue(null);
    expect((await resolveSplitSource("agency_fb1", "creator_grow", "tenant_fb1")).source).toBe("relationship");

    mockRevShare.mockResolvedValue(null);
    mockPolicy.mockResolvedValue({ agencyDefaultShare: 30 });
    expect((await resolveSplitSource("agency_fb2", "creator_grow", "tenant_fb2")).source).toBe("policy");

    mockRevShare.mockResolvedValue(null);
    mockPolicy.mockResolvedValue(null);
    expect((await resolveSplitSource("agency_fb3", "creator_grow", null)).source).toBe("default");
  });
});
