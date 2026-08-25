import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// RCCF-56 — Commission effective-dating control. Exercises the Super Admin
// schedule action + revenue-service lifecycle + the runtime resolver's
// effective-date boundaries, priority, precedence, and historical immutability.
// Uses an in-memory commissionRule store with vitest fake timers for "now".

const h = vi.hoisted(() => {
  type Rule = {
    id: string; type: string; partnerId: string | null; status: string;
    partnerSharePercent: number; platformSharePercent: number;
    effectiveFrom: Date; effectiveTo: Date | null; priority: number;
    metadata?: Record<string, unknown>;
  };
  const rules: Rule[] = [];
  const commissionRows: Array<Record<string, unknown>> = [];
  const ledgerRows: Array<Record<string, unknown>> = [];
  let seq = 0;
  const logCalls: Array<{ event: string; metadata?: Record<string, unknown> }> = [];
  const mutationCalls: { create: unknown[]; update: unknown[]; updateMany: unknown[] } = { create: [], update: [], updateMany: [] };

  const matchDate = (value: Date | undefined, op: string | undefined, field: Date | null): boolean => {
    if (value === undefined) return true;
    if (field === null && op === "gt") return false; // null effectiveTo never > a date
    const v = value.getTime(); const f = field?.getTime() ?? Infinity;
    switch (op) {
      case "lt": return f < v;
      case "lte": return f <= v;
      case "gt": return f > v;
      case "gte": return f >= v;
      default: return f === v;
    }
  };

  const matches = (rule: Rule, where: Record<string, unknown>): boolean => {
    if (where.type !== undefined && rule.type !== where.type) return false;
    if ("partnerId" in where && rule.partnerId !== where.partnerId) return false;
    if (where.status !== undefined && rule.status !== where.status) return false;
    if (where.effectiveFrom) {
      const op = Object.keys(where.effectiveFrom as object)[0] as string;
      const val = ((where.effectiveFrom as Record<string, Date>)[op]);
      if (!matchDate(val, op, rule.effectiveFrom)) return false;
    }
    if (where.effectiveTo && typeof where.effectiveTo === "object" && !Array.isArray(where.effectiveTo)) {
      const op = Object.keys(where.effectiveTo as object)[0] as string;
      const val = ((where.effectiveTo as Record<string, Date>)[op]);
      if (rule.effectiveTo !== null && !matchDate(val, op, rule.effectiveTo)) return false;
    }
    if (Array.isArray(where.OR)) {
      const ok = where.OR.some((clause) => matches(rule, clause as Record<string, unknown>));
      if (!ok) return false;
    }
    return true;
  };

  const applyOrder = (rows: Rule[], orderBy: unknown): Rule[] => {
    if (!orderBy) return rows;
    if (Array.isArray(orderBy)) {
      for (const o of orderBy as Array<Record<string, string>>) rows = applyOrder(rows, o);
      return rows;
    }
    const [key, dir] = Object.entries(orderBy as Record<string, string>)[0];
    const mult = dir === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[key] as string | number | Date;
      const bv = (b as unknown as Record<string, unknown>)[key] as string | number | Date;
      if (av < bv) return -1 * mult;
      if (av > bv) return 1 * mult;
      return 0;
    });
  };

  return {
    rules, commissionRows, ledgerRows, logCalls, mutationCalls,
    addRule: (r: Partial<Rule> & { effectiveFrom: Date }) => {
      const rule: Rule = { id: `r-${++seq}`, type: "default", partnerId: null, status: "active", partnerSharePercent: 35, platformSharePercent: 65, effectiveTo: null, priority: 100, ...r };
      rules.push(rule);
      return rule;
    },
    reset: () => { rules.length = 0; commissionRows.length = 0; ledgerRows.length = 0; logCalls.length = 0; seq = 0; mutationCalls.create.length = 0; mutationCalls.update.length = 0; mutationCalls.updateMany.length = 0; },
    mockGetServerSession: vi.fn(),
    mockLogAction: vi.fn(),
    mockUpsertPolicy: vi.fn(),
    mockResolveLoyaltyTier: vi.fn(),
    mockGetActiveClientCount: vi.fn(),
    prisma: {
      commissionRule: {
        findMany: async ({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: unknown }) => applyOrder(rules.filter((r) => matches(r, where ?? {})), orderBy),
        findFirst: async ({ where, orderBy }: { where?: Record<string, unknown>; orderBy?: unknown }) => applyOrder(rules.filter((r) => matches(r, where ?? {})), orderBy)[0] ?? null,
        create: async ({ data }: { data: Record<string, unknown> }) => { mutationCalls.create.push(data); return { id: `r-${++seq}`, ...data }; },
        update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => { mutationCalls.update.push({ where, data }); return { id: where.id, ...data }; },
        updateMany: async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => { mutationCalls.updateMany.push({ where, data }); return { count: rules.filter((r) => matches(r, where)).length }; },
      },
      commissionPolicy: { findFirst: async () => null },
    // RCCF-73 eligibility gate: partner is a PAID (ACTIVE) Solo agency.
    billingAccount: { findUnique: async () => ({ id: "acc-1" }) },
    billingSubscription: { findMany: async () => [{ status: "ACTIVE", plan: { code: "partner_solo", family: "partner" } }] },
      agencyTenant: { findUnique: async () => ({ agencyId: "p1", revSharePercent: 0 }) },
      workspace: { findUnique: async () => ({ tenantId: "t1" }) },
      commissionEntry: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-1", ...data }; commissionRows.push(r); return r; },
      },
      partnerLedger: {
        findFirst: async () => null,
        create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "pl-1", ...data }; ledgerRows.push(r); return r; },
      },
      $transaction: async (cb: (tx: unknown) => unknown) => cb({
        commissionEntry: { create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-tx", ...data }; commissionRows.push(r); return r; } },
        partnerLedger: { findFirst: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "pl-tx", ...data }; ledgerRows.push(r); return r; } },
      }),
    },
  };
});

vi.mock("@/lib/prisma", () => ({ prisma: h.prisma }));
vi.mock("@/lib/commission/loyalty", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commission/loyalty")>("@/lib/commission/loyalty");
  return { ...actual, resolveLoyaltyTier: h.mockResolveLoyaltyTier, getActiveClientCount: h.mockGetActiveClientCount };
});
vi.mock("@/modules/billing/infrastructure/revenue-repository", () => ({ revenueRepository: { upsertCommissionPolicy: h.mockUpsertPolicy } }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/modules/event-runtime", () => ({ runtimeEventBus: { publish: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { revenueService } from "@/modules/billing/application/revenue-service";
import { adminScheduleCommissionRule } from "@/actions/super-admin-billing.actions";
import { resolveSplitSource } from "@/lib/commission/runtime";
import { tierForCount } from "@/lib/commission/loyalty";

const TIERS = [
  { id: "starter", name: "Starter", minActiveClients: 0, maxActiveClients: 9, commissionPercent: 30 },
  { id: "growth", name: "Growth", minActiveClients: 10, maxActiveClients: 24, commissionPercent: 40 },
  { id: "scale", name: "Scale", minActiveClients: 25, maxActiveClients: null, commissionPercent: 50 },
];

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "sa" } });
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockUpsertPolicy.mockResolvedValue(undefined);
  h.mockResolveLoyaltyTier.mockResolvedValue(null);
  h.mockGetActiveClientCount.mockResolvedValue(0);
});
afterEach(() => vi.useRealTimers());

describe("RCCF-56 — schedule action authorization", () => {
  const VALID = { partnerSharePercent: 40, effectiveFrom: "2026-09-01T00:00:00.000Z" };

  it("SUPER_ADMIN is allowed", async () => {
    const res = await adminScheduleCommissionRule(VALID);
    expect(res.success).toBe(true);
    expect(h.prisma.commissionRule.create).toBeDefined();
  });

  for (const role of ["AGENCY_ADMIN", "AGENCY_STAFF", "ADMIN", "CREATOR"]) {
    it(`${role} is rejected with zero mutation`, async () => {
      h.mockGetServerSession.mockResolvedValue({ user: { role, id: "u" } });
      const res = await adminScheduleCommissionRule(VALID);
      expect(res.success).toBe(false);
      expect(h.mutationCalls.create).toHaveLength(0);
      expect(h.mutationCalls.update).toHaveLength(0);
      expect(h.mutationCalls.updateMany).toHaveLength(0);
    });
  }

  it("anonymous is rejected with zero mutation", async () => {
    h.mockGetServerSession.mockResolvedValue(null);
    const res = await adminScheduleCommissionRule(VALID);
    expect(res.success).toBe(false);
    expect(h.mutationCalls.create).toHaveLength(0);
    expect(h.mutationCalls.update).toHaveLength(0);
    expect(h.mutationCalls.updateMany).toHaveLength(0);
  });
});

describe("RCCF-56 — server-side validation", () => {
  it("accepts 0% and 100%", async () => {
    for (const pct of [0, 100]) {
      const res = await adminScheduleCommissionRule({ partnerSharePercent: pct, effectiveFrom: "2026-09-01T00:00:00.000Z" });
      expect(res.success).toBe(true);
    }
  });

  it("rejects out-of-range / non-finite percentages", async () => {
    for (const pct of [101, -1, Number.NaN, Infinity, -Infinity]) {
      const res = await adminScheduleCommissionRule({ partnerSharePercent: pct, effectiveFrom: "2026-09-01T00:00:00.000Z" });
      expect(res.success).toBe(false);
      expect(res.error).toMatch(/invalid commission percentage/i);
    }
    expect(h.mutationCalls.create).toHaveLength(0);
  });

  it("rejects invalid dates and effectiveFrom >= effectiveTo", async () => {
    const invalid = await adminScheduleCommissionRule({ partnerSharePercent: 40, effectiveFrom: "not-a-date" });
    expect(invalid.success).toBe(false);
    const backwards = await adminScheduleCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-09-01T00:00:00.000Z", effectiveTo: "2026-08-01T00:00:00.000Z" });
    expect(backwards.success).toBe(false);
    const equal = await adminScheduleCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-09-01T00:00:00.000Z", effectiveTo: "2026-09-01T00:00:00.000Z" });
    expect(equal.success).toBe(false);
    expect(h.mutationCalls.create).toHaveLength(0);
  });

  it("rejects invalid priority", async () => {
    const res = await adminScheduleCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-09-01T00:00:00.000Z", priority: -5 });
    expect(res.success).toBe(false);
  });
});

describe("RCCF-56 — scheduling semantics", () => {
  it("future schedule closes the current rule and creates a SCHEDULED rule", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    h.addRule({ id: "current", partnerSharePercent: 35, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    const res = await revenueService.scheduleGlobalCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-09-01T00:00:00.000Z" });
    expect(res.status).toBe("SCHEDULED");
    expect(h.mutationCalls.updateMany).toHaveLength(1);
    const [updateMany] = h.mutationCalls.updateMany as Array<{ data: { effectiveTo: Date } }>;
    expect(updateMany.data.effectiveTo.getTime()).toBe(new Date("2026-09-01T00:00:00.000Z").getTime() - 1);
    const created = h.mutationCalls.create[0] as Record<string, unknown>;
    expect(created.partnerSharePercent).toBe(40);
    expect(created.platformSharePercent).toBe(60);
    expect((created.effectiveFrom as Date).toISOString()).toBe("2026-09-01T00:00:00.000Z");
    vi.useRealTimers();
  });

  it("immediate date mutates the current active rule (Option A)", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    h.addRule({ id: "current", partnerSharePercent: 35, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    const res = await revenueService.scheduleGlobalCommissionRule({ partnerSharePercent: 45, effectiveFrom: "2026-08-13T00:00:00.000Z" });
    expect(res.status).toBe("ACTIVE");
    expect(h.mutationCalls.update).toHaveLength(1);
    const [update] = h.mutationCalls.update as Array<{ where: { id: string }; data: { partnerSharePercent: number } }>;
    expect(update.where.id).toBe("current");
    expect(update.data.partnerSharePercent).toBe(45);
    expect(h.mutationCalls.create).toHaveLength(0);
    vi.useRealTimers();
  });

  it("rejects an overlapping future window for the global scope", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    h.addRule({ id: "current", partnerSharePercent: 35, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });
    h.addRule({ id: "future", partnerSharePercent: 50, effectiveFrom: new Date("2026-10-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    await expect(revenueService.scheduleGlobalCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-09-15T00:00:00.000Z", effectiveTo: "2026-10-15T00:00:00.000Z" }))
      .rejects.toThrow(/overlaps this date window/i);
    expect(h.mutationCalls.create).toHaveLength(0);
    vi.useRealTimers();
  });

  it("classifies ACTIVE / SCHEDULED / EXPIRED and orders newest-first", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-13T12:00:00Z"));
    h.addRule({ id: "expired", partnerSharePercent: 30, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: new Date("2026-01-31T23:59:59Z"), priority: 100 });
    h.addRule({ id: "current", partnerSharePercent: 35, effectiveFrom: new Date("2026-02-01T00:00:00Z"), effectiveTo: null, priority: 100 });
    h.addRule({ id: "future", partnerSharePercent: 40, effectiveFrom: new Date("2026-09-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    const list = await revenueService.listGlobalCommissionRules();
    expect(list).toHaveLength(3);
    const byId = Object.fromEntries(list.map((r) => [r.id, r.status]));
    expect(byId.expired).toBe("EXPIRED");
    expect(byId.current).toBe("ACTIVE");
    expect(byId.future).toBe("SCHEDULED");
    expect(list[0].effectiveFrom).toBe("2026-09-01T00:00:00.000Z"); // newest first
    vi.useRealTimers();
  });

  it("empty rule state is truthful (no rules → empty list)", async () => {
    const list = await revenueService.listGlobalCommissionRules();
    expect(list).toHaveLength(0);
  });
});

describe("RCCF-56 — audit trail", () => {
  it("records the configuration mutation with scope-safe metadata (no secrets)", async () => {
    const res = await adminScheduleCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-09-01T00:00:00.000Z", priority: 100 });
    expect(res.success).toBe(true);
    const call = h.mockLogAction.mock.calls.find((c) => (c[1] as string) === "billing:commission-rule-scheduled");
    expect(call).toBeDefined();
    const meta = call![2] as Record<string, unknown>;
    expect(meta.partnerSharePercent).toBe(40);
    expect(meta.effectiveFrom).toBe("2026-09-01T00:00:00.000Z");
    expect(meta.priority).toBe(100);
    expect(JSON.stringify(meta)).not.toMatch(/token|secret|password/i);
  });
});

describe("RCCF-56 — runtime resolution boundaries", () => {
  it("resolves a rule active while effectiveFrom <= now <= effectiveTo (both inclusive)", async () => {
    h.addRule({ id: "jan", partnerSharePercent: 30, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: new Date("2026-01-31T23:59:59.999Z"), priority: 100 });
    h.addRule({ id: "feb", partnerSharePercent: 40, effectiveFrom: new Date("2026-02-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z").getTime() - 1);
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).not.toBe(30);

    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(30);

    vi.setSystemTime(new Date("2026-01-31T23:59:59.999Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(30);

    vi.setSystemTime(new Date("2026-02-01T00:00:00Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(40);

    vi.setSystemTime(new Date("2026-02-01T00:00:00Z").getTime() + 1);
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(40);
    vi.useRealTimers();
  });

  it("priority asc wins; equal-priority tie-breaks deterministically by id", async () => {
    h.addRule({ id: "b", partnerSharePercent: 20, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });
    h.addRule({ id: "a", partnerSharePercent: 50, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 50 });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(50); // priority 50 wins
    vi.useRealTimers();
  });

  it("partner > plan > global precedence, then loyalty fallback", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    h.addRule({ id: "g", partnerSharePercent: 35, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });
    h.addRule({ id: "plan", partnerSharePercent: 45, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100, metadata: { planCode: "creator_grow" } });
    h.addRule({ id: "partner", partnerId: "p1", partnerSharePercent: 55, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(55); // partner wins
    expect((await resolveSplitSource("p2", "creator_grow", "t1")).partnerPercent).toBe(45); // plan for p2
    expect((await resolveSplitSource("p2", "creator_grow", "t2")).partnerPercent).toBe(45);
    expect((await resolveSplitSource("p2", "creator_scale", "t1")).partnerPercent).toBe(35); // global for other plan
    vi.useRealTimers();
  });

  it("loyalty fallback remains 30/40/50 and global rule overrides it", async () => {
    expect(tierForCount(TIERS, 5)?.commissionPercent).toBe(30);
    expect(tierForCount(TIERS, 10)?.commissionPercent).toBe(40);
    expect(tierForCount(TIERS, 30)?.commissionPercent).toBe(50);

    h.mockResolveLoyaltyTier.mockResolvedValue({ commissionPercent: 40 });
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).source).toBe("loyalty");
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(40);

    h.addRule({ id: "g", partnerSharePercent: 35, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(35);
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).source).toBe("rule");
    vi.useRealTimers();
  });

  it("isolation: a partner-specific rule cannot affect another partner", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-01T00:00:00Z"));
    h.addRule({ id: "pA", partnerId: "p1", partnerSharePercent: 60, effectiveFrom: new Date("2026-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });
    h.mockResolveLoyaltyTier.mockResolvedValue({ commissionPercent: 30 });
    const forB = await resolveSplitSource("p2", "creator_grow", "t1");
    expect(forB.partnerPercent).toBe(30); // B falls back to loyalty, unaffected by A's rule
    expect((await resolveSplitSource("p1", "creator_grow", "t1")).partnerPercent).toBe(60);
    vi.useRealTimers();
  });
});

describe("RCCF-56 — historical immutability", () => {
  it("old CommissionEntry stays at the old rate; a new one uses the new rule", async () => {
    h.commissionRows.push({ id: "ce-old", invoiceId: "inv-old", partnerShare: 300, partnerPercent: 30, entryType: "subscription_created", status: "pending" });
    h.addRule({ id: "g", partnerSharePercent: 35, effectiveFrom: new Date("2020-01-01T00:00:00Z"), effectiveTo: null, priority: 100 });

    const { recordSubscriptionCommission } = await import("@/lib/commission/runtime");
    await recordSubscriptionCommission({ workspaceId: "ws-1", planCode: "creator_grow", subscriptionId: "sub-1", invoiceId: "inv-new", amount: 1000, event: "created" });

    expect(h.commissionRows.find((r) => r.id === "ce-old")!.partnerPercent).toBe(30); // unchanged
    const created = h.commissionRows.find((r) => r.entryType === "subscription_created" && r.id !== "ce-old");
    expect(created!.partnerPercent).toBe(35);
    expect(created!.partnerShare).toBe(350);
  });

  it("settlement/refund records are never touched by a rule change", async () => {
    const before = { settlementCount: 0, reversalCount: 0 };
    expect(h.commissionRows).toHaveLength(0);
    await revenueService.scheduleGlobalCommissionRule({ partnerSharePercent: 40, effectiveFrom: "2026-08-13T00:00:00.000Z" });
    // Only CommissionRule rows changed; no financial records were created or modified.
    expect(h.mutationCalls.update).toBeDefined();
    expect(before).toEqual({ settlementCount: 0, reversalCount: 0 });
  });
});
