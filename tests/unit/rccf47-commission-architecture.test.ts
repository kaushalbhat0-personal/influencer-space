import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const state = { rules: [] as Array<Record<string, unknown>>, loyalty: null as { commissionPercent: number } | null, relationshipShare: null as number | null, policyShare: null as number | null };
  return { state, reset: () => { state.rules = []; state.loyalty = null; state.relationshipShare = null; state.policyShare = null; } };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionRule: {
      findMany: async ({ orderBy }: { orderBy?: { priority: string } | Array<{ priority: string }> }) => {
        const rows = [...h.state.rules];
        const first = Array.isArray(orderBy) ? orderBy[0] : orderBy;
        if (first?.priority === "asc") rows.sort((a, b) => (a.priority as number) - (b.priority as number));
        return rows;
      },
    },
    commissionPolicy: { findFirst: async () => (h.state.policyShare === null ? null : { agencyDefaultShare: h.state.policyShare }) },
    agencyTenant: { findUnique: async () => ({ agencyId: "p1", revSharePercent: h.state.relationshipShare ?? 0 }) },
  },
}));
vi.mock("@/lib/commission/loyalty", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commission/loyalty")>("@/lib/commission/loyalty");
  return {
    ...actual,
    resolveLoyaltyTier: async () => h.state.loyalty,
    getActiveClientCount: async () => 0,
  };
});

import { tierForCount } from "@/lib/commission/loyalty";
import { resolveSplitSource } from "@/lib/commission/runtime";

const TIERS = [
  { id: "starter", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
  { id: "growth", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
  { id: "scale", name: "Scale", minActiveClients: 25, maxActiveClients: null, commissionPercent: 50 },
];

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
});
afterEach(() => vi.useRealTimers());

describe("RCCF-47 — loyalty tier model (actual seeded thresholds)", () => {
  it("Starter 30% (0–9), Growth 40% (10–24), Scale 50% (25+)", () => {
    expect(tierForCount(TIERS, 0)?.commissionPercent).toBe(30);
    expect(tierForCount(TIERS, 9)?.commissionPercent).toBe(30);
    expect(tierForCount(TIERS, 10)?.commissionPercent).toBe(40);
    expect(tierForCount(TIERS, 24)?.commissionPercent).toBe(40);
    expect(tierForCount(TIERS, 25)?.commissionPercent).toBe(50);
    expect(tierForCount(TIERS, 100)?.commissionPercent).toBe(50);
  });
});

describe("RCCF-47 — effective-dating support (future-only effect)", () => {
  it("a Jan 30% rule and Feb 40% rule resolve deterministically by transaction date", async () => {
    h.state.rules = [
      { id: "r-old", type: "default", partnerSharePercent: 30, platformSharePercent: 70, priority: 10, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: new Date("2026-01-31T23:59:59Z"), status: "active" },
      { id: "r-new", type: "default", partnerSharePercent: 40, platformSharePercent: 60, priority: 10, effectiveFrom: new Date("2026-02-01T00:00:00Z"), effectiveTo: null, status: "active" },
    ];

    // January transaction → 30%.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-15T00:00:00Z"));
    const jan = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(jan.partnerPercent).toBe(30);

    // February transaction → 40% (new rule, future-only).
    vi.setSystemTime(new Date("2026-02-15T00:00:00Z"));
    const feb = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(feb.partnerPercent).toBe(40);
  });

  it("a not-yet-effective future rule does NOT apply to current transactions", async () => {
    h.state.rules = [
      { id: "r-now", type: "default", partnerSharePercent: 20, platformSharePercent: 80, priority: 10, effectiveFrom: new Date("2020-01-01T00:00:00Z"), effectiveTo: null, status: "active" },
      { id: "r-future", type: "default", partnerSharePercent: 50, platformSharePercent: 50, priority: 10, effectiveFrom: new Date("2027-01-01T00:00:00Z"), effectiveTo: null, status: "active" },
    ];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));

    const src = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(src.partnerPercent).toBe(20); // future rule excluded
  });

  it("priority makes concurrent same-type rules deterministic (lowest priority wins first)", async () => {
    h.state.rules = [
      { id: "r-a", type: "default", partnerSharePercent: 30, platformSharePercent: 70, priority: 20, effectiveFrom: new Date("2020-01-01T00:00:00Z"), effectiveTo: null, status: "active" },
      { id: "r-b", type: "default", partnerSharePercent: 40, platformSharePercent: 60, priority: 10, effectiveFrom: new Date("2020-01-01T00:00:00Z"), effectiveTo: null, status: "active" },
    ];
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));

    const src = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(src.ruleId).toBe("r-b"); // priority 10 (lowest number = first) selected deterministically
  });
});

describe("RCCF-47 — CommissionPolicy is subordinate (loyalty wins)", () => {
  it("changing CommissionPolicy does not change the effective rate while a loyalty tier applies", async () => {
    h.state.loyalty = { commissionPercent: 30 };
    h.state.policyShare = 30;
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(30);

    h.state.policyShare = 55;
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(30);
  });
});
