import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  tierForCount,
  getLoyaltyTiers,
  getLoyaltyProgress,
  resolveLoyaltyTier,
  type LoyaltyTierRow,
} from "@/lib/commission/loyalty";

const { mockCount, mockFindMany } = vi.hoisted(() => ({ mockCount: vi.fn(), mockFindMany: vi.fn() }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agencyTenant: { count: mockCount },
    loyaltyTier: { findMany: mockFindMany },
  },
}));

const TIERS: LoyaltyTierRow[] = [
  { id: "t1", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
  { id: "t2", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
  { id: "t3", name: "Scale", minActiveClients: 25, maxActiveClients: null, commissionPercent: 50 },
];

beforeEach(() => {
  mockCount.mockReset();
  mockFindMany.mockReset();
});

describe("RCCF-IMPLEMENTATION-75 — tierForCount (pure)", () => {
  it("resolves the base tier at 0 clients", () => {
    expect(tierForCount(TIERS, 0)?.commissionPercent).toBe(30);
  });

  it("resolves boundaries correctly (9 → 30%, 10 → 40%, 24 → 40%, 25 → 50%)", () => {
    expect(tierForCount(TIERS, 9)?.commissionPercent).toBe(30);
    expect(tierForCount(TIERS, 10)?.commissionPercent).toBe(40);
    expect(tierForCount(TIERS, 24)?.commissionPercent).toBe(40);
    expect(tierForCount(TIERS, 25)?.commissionPercent).toBe(50);
  });

  it("returns null when no tier matches", () => {
    expect(tierForCount([], 5)).toBeNull();
  });
});

describe("RCCF-IMPLEMENTATION-75 — getLoyaltyTiers", () => {
  it("returns ACTIVE tiers ordered by client range", async () => {
    mockFindMany.mockResolvedValue([
      { id: "t1", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
      { id: "t2", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
    ]);
    const tiers = await getLoyaltyTiers();
    expect(tiers.length).toBe(2);
    expect(tiers[0].commissionPercent).toBe(30);
    expect(mockFindMany.mock.calls[0][0].where.status).toBe("ACTIVE");
  });
});

describe("RCCF-IMPLEMENTATION-75 — resolveLoyaltyTier", () => {
  it("resolves by the live-subscription active-client count", async () => {
    mockCount.mockResolvedValue(12);
    mockFindMany.mockResolvedValue(TIERS);
    const tier = await resolveLoyaltyTier("agency_1");
    expect(tier?.commissionPercent).toBe(40);
    expect(mockCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          agencyId: "agency_1",
          workspace: { billingSubscription: { status: { in: ["ACTIVE", "TRIALING"] } } },
        }),
      }),
    );
  });

  it("uses a supplied count without querying prisma", async () => {
    mockFindMany.mockResolvedValue(TIERS);
    const tier = await resolveLoyaltyTier("agency_1", 30);
    expect(tier?.commissionPercent).toBe(50);
    expect(mockCount).not.toHaveBeenCalled();
  });
});

describe("RCCF-IMPLEMENTATION-75 — getLoyaltyProgress", () => {
  it("reports current tier and clients remaining to the next tier", async () => {
    mockCount.mockResolvedValue(7);
    mockFindMany.mockResolvedValue(TIERS);
    const p = await getLoyaltyProgress("agency_1");
    expect(p).not.toBeNull();
    expect(p!.tier?.commissionPercent).toBe(30);
    expect(p!.nextTier?.commissionPercent).toBe(40);
    expect(p!.clientsToNext).toBe(3);
  });

  it("reports no next tier at the top tier", async () => {
    mockCount.mockResolvedValue(40);
    mockFindMany.mockResolvedValue(TIERS);
    const p = await getLoyaltyProgress("agency_1");
    expect(p!.tier?.commissionPercent).toBe(50);
    expect(p!.nextTier).toBeNull();
    expect(p!.clientsToNext).toBe(0);
  });

  it("returns null when no tiers are configured", async () => {
    mockCount.mockResolvedValue(5);
    mockFindMany.mockResolvedValue([]);
    expect(await getLoyaltyProgress("agency_1")).toBeNull();
  });
});
