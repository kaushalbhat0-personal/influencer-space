import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const state = {
    rules: [] as Array<Record<string, unknown>>,
    loyalty: null as { commissionPercent: number } | null,
    relationshipShare: null as number | null,
    policyShare: null as number | null,
  };
  const commissionRows: Array<Record<string, unknown>> = [];
  const ledgerRows: Array<Record<string, unknown>> = [];
  return { state, commissionRows, ledgerRows, reset: () => {
    state.rules = []; state.loyalty = null; state.relationshipShare = null; state.policyShare = null;
    commissionRows.length = 0; ledgerRows.length = 0;
  } };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    commissionRule: { findMany: async () => h.state.rules },
    loyaltyTier: { findFirst: vi.fn() },
    commissionPolicy: { findFirst: async () => (h.state.policyShare === null ? null : { agencyDefaultShare: h.state.policyShare }) },
    agencyTenant: { findUnique: async () => ({ agencyId: "p1", revSharePercent: h.state.relationshipShare ?? 0 }) },
    workspace: { findUnique: async () => ({ tenantId: "t1" }) },
    commissionEntry: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-1", ...data }; h.commissionRows.push(r); return r; },
    },
    partnerLedger: {
      findFirst: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "pl-1", ...data }; h.ledgerRows.push(r); return r; },
    },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({
      commissionEntry: {
        create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-tx", ...data }; h.commissionRows.push(r); return r; },
      },
      partnerLedger: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "pl-tx", ...data }; h.ledgerRows.push(r); return r; },
      },
    }),
  },
}));
vi.mock("@/lib/commission/loyalty", () => ({
  resolveLoyaltyTier: async () => h.state.loyalty,
  getActiveClientCount: async () => 0,
}));
vi.mock("@/modules/event-runtime", () => ({ runtimeEventBus: { publish: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));

import { resolveSplitSource, computeSubscriptionSplit, recordSubscriptionCommission } from "@/lib/commission/runtime";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
});

describe("RCCF-46 — commission authority: current precedence + latent CommissionRule", () => {
  it("a DB CommissionRule (if populated) is the highest precedence over loyalty", async () => {
    h.state.rules = [{ id: "r1", type: "partner_override", partnerId: "p1", platformSharePercent: 60, partnerSharePercent: 40, priority: 1, effectiveFrom: new Date("2020-01-01") }];
    h.state.loyalty = { commissionPercent: 30 };
    const src = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(src.source).toBe("rule");
    expect(src.partnerPercent).toBe(40);
  });

  it("loyalty tier wins over CommissionPolicy today (Commission Center does NOT control the effective share)", async () => {
    h.state.loyalty = { commissionPercent: 30 };
    h.state.policyShare = 30;
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(30);

    // Change the policy (as the Commission Center would) — the loyalty tier still wins.
    h.state.policyShare = 50;
    const src = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(src.source).toBe("loyalty");
    expect(src.partnerPercent).toBe(30);
  });

  it("CommissionPolicy applies only when no loyalty tier and no relationship exist", async () => {
    h.state.policyShare = 50;
    const src = await resolveSplitSource("p1", "creator_grow", null);
    expect(src.source).toBe("policy");
    expect(src.partnerPercent).toBe(50);
  });

  it("AgencyTenant.revSharePercent (relationship) beats CommissionPolicy", async () => {
    h.state.relationshipShare = 20;
    h.state.policyShare = 50;
    const src = await resolveSplitSource("p1", "creator_grow", "t1");
    expect(src.source).toBe("relationship");
    expect(src.partnerPercent).toBe(20);
  });

  it("80/20 fallback applies when nothing is configured", async () => {
    const src = await resolveSplitSource("p1", "creator_grow", null);
    expect(src.source).toBe("default");
    expect(src.partnerPercent).toBe(20);
  });

  it("partnerShare + platformShare = gross (no rounding drift)", () => {
    for (const gross of [1, 10, 999, 1000, 1234.56]) {
      const src = { platformPercent: 70, partnerPercent: 30, ruleId: null, source: "rule" as const };
      const split = computeSubscriptionSplit(gross, src);
      expect(Math.round((split.partnerShare + split.platformShare) * 100) / 100).toBe(Math.round(gross * 100) / 100);
    }
  });
});

describe("RCCF-46 — future-only effect: a populated DB rule flows to a NEW CommissionEntry", () => {
  it("records the configured percentage on a new commission while history is untouched", async () => {
    // Historical entry at the OLD rate (unchanged by any config change).
    h.commissionRows.push({ id: "ce-historical", invoiceId: "inv-old", partnerShare: 100, partnerPercent: 30, entryType: "subscription_created", status: "pending" });

    // A DB CommissionRule now exists at 40% (the latent authority, populated).
    h.state.rules = [{ id: "r1", type: "default", platformSharePercent: 60, partnerSharePercent: 40, priority: 1, effectiveFrom: new Date("2020-01-01") }];

    await recordSubscriptionCommission({
      workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-new", amount: 1000, event: "created",
    });

    const historical = h.commissionRows.find((r) => r.id === "ce-historical");
    expect(historical!.partnerPercent).toBe(30); // unchanged

    const created = h.commissionRows.find((r) => r.entryType === "subscription_created" && r.id !== "ce-historical");
    expect(created!.partnerPercent).toBe(40);
    expect(created!.partnerShare).toBe(400); // 40% of 1000
  });
});
