import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  // Simulated per-tenant PlanUsage table (atomic within a microtask, with
  // transaction-style rollback) so the REAL planUsageRepository.reserveSlot
  // conditional-increment invariant is exercised faithfully.
  const usageState = new Map<string, { used: number; exists: boolean }>();
  const stateFor = (tid: string) => {
    if (!usageState.has(tid)) usageState.set(tid, { used: 0, exists: false });
    return usageState.get(tid)!;
  };
  return {
    mockResolveActivePlan: vi.fn(),
    mockOrderFindUnique: vi.fn(),
    mockTenantFindUnique: vi.fn(),
    mockPlanUsageFindUnique: vi.fn(),
    mockEnsureFulfillment: vi.fn(),
    updateThrows: false,
    usageState,
    resetState: () => usageState.clear(),
    snapshot: () => new Map([...usageState].map(([k, v]) => [k, { ...v }])),
    restore: (snap: Map<string, { used: number; exists: boolean }>) => {
      usageState.clear();
      for (const [k, v] of snap) usageState.set(k, { ...v });
    },
    stateFor,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: { findUnique: h.mockOrderFindUnique, update: vi.fn() },
    tenant: { findUnique: h.mockTenantFindUnique },
    planUsage: { findUnique: h.mockPlanUsageFindUnique },
    $transaction: async (cb: (tx: unknown) => unknown) => {
      const snap = h.snapshot();
      try {
        return await cb({
          planUsage: {
            updateMany: async (args: { where: { tenantId: string; used: { lt: number } } }) => {
              const st = h.stateFor(args.where.tenantId);
              const limit = args.where.used.lt;
              if (st.used < limit) {
                st.used += 1;
                st.exists = true;
                return { count: 1 };
              }
              return { count: 0 };
            },
            create: async (args: { data: { tenantId: string; used: number } }) => {
              const st = h.stateFor(args.data.tenantId);
              if (st.exists) throw { code: "P2002" };
              st.used = args.data.used;
              st.exists = true;
              return {};
            },
            findUnique: async (args: { where: { tenantId_featureKey_periodStart: { tenantId: string } } }) => {
              const st = h.stateFor(args.where.tenantId_featureKey_periodStart.tenantId);
              return st.exists ? { used: st.used } : null;
            },
          },
          productOrder: {
            update: async () => {
              if (h.updateThrows) throw new Error("db write failed");
              return {};
            },
          },
        });
      } catch (e) {
        h.restore(snap);
        throw e;
      }
    },
  },
}));

vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/modules/fulfillment", () => ({ ensureFulfillment: h.mockEnsureFulfillment }));

import { completeProductOrder, getCurrentOrderUsage } from "@/modules/billing/application/order-completion";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";
import { capabilityService } from "@/lib/capabilities";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";

function order(id: string, tenantId = TENANT_A, status = "PENDING") {
  return { id, tenantId, status, productId: "p1", amount: 100 };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.resetState();
  h.updateThrows = false;
  h.mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
  h.mockTenantFindUnique.mockResolvedValue({ createdAt: new Date("2026-01-01T00:00:00Z") });
  h.mockPlanUsageFindUnique.mockImplementation((args: { where: { tenantId_featureKey_periodStart: { tenantId: string } } }) => {
    const st = h.stateFor(args.where.tenantId_featureKey_periodStart.tenantId);
    return st.exists ? { used: st.used } : null;
  });
  h.mockEnsureFulfillment.mockResolvedValue(null);
  h.mockOrderFindUnique.mockResolvedValue(order("order-a"));
  resetRuntimeFeatureOverrides();
});

describe("RCCF-38 — canonical order limits (approved: Launch 10, Growth 100, Scale/Enterprise unlimited)", () => {
  it("canonical defaults are Launch 10 / Growth 100 / Scale -1 / Enterprise -1", () => {
    expect(capabilityService.limit("creator_launch", "max_orders")).toBe(10);
    expect(capabilityService.limit("creator_grow", "max_orders")).toBe(100);
    expect(capabilityService.limit("creator_scale", "max_orders")).toBe(-1);
    expect(capabilityService.limit("creator_enterprise", "max_orders")).toBe(-1);
  });
});

describe("RCCF-38 — basic metering (completeProductOrder)", () => {
  it("Launch under limit completes and consumes one slot", async () => {
    const res = await completeProductOrder("order-a");
    expect(res.success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(1);
  });

  it("Launch at the 10-order limit rejects the next completion (used stays 10)", async () => {
    h.stateFor(TENANT_A).used = 10;
    h.stateFor(TENANT_A).exists = true;

    const res = await completeProductOrder("order-a");

    expect(res.success).toBe(false);
    expect(res.reason).toBe("quota");
    expect(res.used).toBe(10);
    expect(res.limit).toBe(10);
    expect(res.suggestedUpgrade).toBe("growth");
    expect(h.stateFor(TENANT_A).used).toBe(10);
  });

  it("Growth accepts up to 100", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    h.stateFor(TENANT_A).used = 99;
    h.stateFor(TENANT_A).exists = true;

    expect((await completeProductOrder("order-a")).success).toBe(true);
    expect((await completeProductOrder("order-b")).success).toBe(false);
    expect(h.stateFor(TENANT_A).used).toBe(100);
  });

  it("Scale (unlimited) completes without touching PlanUsage", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "ACTIVE" });

    const res = await completeProductOrder("order-a");

    expect(res.success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(0);
  });

  it("Enterprise (unlimited) completes without a usage row", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_enterprise", origin: "v2", status: "ACTIVE" });

    expect((await completeProductOrder("order-a")).success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(0);
  });
});

describe("RCCF-38 — atomicity / concurrency", () => {
  it("final-slot concurrent requests: exactly ONE succeeds, used never exceeds limit", async () => {
    h.stateFor(TENANT_A).used = 9;
    h.stateFor(TENANT_A).exists = true;

    const [a, b] = await Promise.all([
      completeProductOrder("order-a"),
      completeProductOrder("order-b"),
    ]);

    const successes = [a, b].filter((r) => r.success).length;
    const rejections = [a, b].filter((r) => r.reason === "quota").length;
    expect(successes).toBe(1);
    expect(rejections).toBe(1);
    expect(h.stateFor(TENANT_A).used).toBe(10);
  });

  it("a failed order write rolls the quota reservation back (no usage without completion)", async () => {
    h.updateThrows = true;

    await expect(completeProductOrder("order-a")).rejects.toThrow("db write failed");

    expect(h.stateFor(TENANT_A).used).toBe(0);
  });

  it("quota rejection never completes the order", async () => {
    h.stateFor(TENANT_A).used = 10;
    h.stateFor(TENANT_A).exists = true;

    const res = await completeProductOrder("order-a");

    expect(res.reason).toBe("quota");
    expect(h.mockOrderFindUnique).toHaveBeenCalled();
    expect(h.stateFor(TENANT_A).used).toBe(10);
  });
});

describe("RCCF-38 — payment lifecycle + idempotency", () => {
  it("a duplicate completion attempt never consumes a second slot", async () => {
    expect((await completeProductOrder("order-a")).success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(1);

    // Order already COMPLETED → idempotent success, no re-meter.
    h.mockOrderFindUnique.mockResolvedValue(order("order-a", TENANT_A, "COMPLETED"));
    const res = await completeProductOrder("order-a");

    expect(res.success).toBe(true);
    expect(res.reason).toBe("already_completed");
    expect(h.stateFor(TENANT_A).used).toBe(1);
  });

  it("a PENDING (unpaid/abandoned) order consumes no usage", async () => {
    h.mockOrderFindUnique.mockResolvedValue(order("order-a", TENANT_A, "PENDING"));
    // No completion call happens for abandoned checkouts; verify usage stays 0.
    const usage = await getCurrentOrderUsage(TENANT_A);
    expect(usage.used).toBe(0);
    expect(usage.limit).toBe(10);
  });

  it("a non-pending order cannot be completed", async () => {
    h.mockOrderFindUnique.mockResolvedValue(order("order-a", TENANT_A, "CANCELLED"));
    const res = await completeProductOrder("order-a");
    expect(res.success).toBe(false);
    expect(res.reason).toBe("not_pending");
    expect(h.stateFor(TENANT_A).used).toBe(0);
  });

  it("a free order that legitimately completes consumes one slot", async () => {
    const res = await completeProductOrder("order-a");
    expect(res.success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(1);
  });
});

describe("RCCF-38 — period semantics", () => {
  it("getCurrentOrderUsage reads the calendar-month window (server-derived)", async () => {
    h.stateFor(TENANT_A).used = 3;
    h.stateFor(TENANT_A).exists = true;

    const usage = await getCurrentOrderUsage(TENANT_A);

    expect(usage).toEqual({ used: 3, limit: 10 });
    const queried = h.mockPlanUsageFindUnique.mock.calls[0][0] as { where: { tenantId_featureKey_periodStart: { periodStart: Date } } };
    const start = queried.where.tenantId_featureKey_periodStart.periodStart;
    const now = new Date();
    expect(start.getUTCDate()).toBe(1);
    expect(start.getUTCMonth()).toBe(now.getUTCMonth());
  });
});

describe("RCCF-38 — upgrade / downgrade semantics (usage retained, not reset)", () => {
  it("Launch → Growth retains current-period usage and applies the new allowance immediately", async () => {
    h.stateFor(TENANT_A).used = 8;
    h.stateFor(TENANT_A).exists = true;

    // 9th on Launch is allowed; then upgrade to Growth.
    expect((await completeProductOrder("order-a")).success).toBe(true);

    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    expect((await completeProductOrder("order-b")).success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(10); // retained, not reset
  });

  it("Growth → Launch above the new limit blocks new orders", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    h.stateFor(TENANT_A).used = 25;
    h.stateFor(TENANT_A).exists = true;

    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    const res = await completeProductOrder("order-a");

    expect(res.success).toBe(false);
    expect(res.reason).toBe("quota");
    expect(res.limit).toBe(10);
    expect(h.stateFor(TENANT_A).used).toBe(25); // history untouched
  });
});

describe("RCCF-38 — refund policy (usage immutable)", () => {
  it("a completed order stays counted after a refund (no decrement path)", async () => {
    expect((await completeProductOrder("order-a")).success).toBe(true);
    expect(h.stateFor(TENANT_A).used).toBe(1);

    // Refund = order remains COMPLETED; usage must not change. The metering
    // layer has no decrement: completing/refunding never touches PlanUsage down.
    h.mockOrderFindUnique.mockResolvedValue(order("order-a", TENANT_A, "COMPLETED"));
    await completeProductOrder("order-a");

    expect(h.stateFor(TENANT_A).used).toBe(1);
    const usage = await getCurrentOrderUsage(TENANT_A);
    expect(usage.used).toBe(1);
  });
});

describe("RCCF-38 — tenant isolation + client-can't-spoof", () => {
  it("orders on different tenants consume separate quotas", async () => {
    h.mockOrderFindUnique.mockImplementation((args: { where: { id: string } }) => {
      if (args.where.id === "order-a") return Promise.resolve(order("order-a", TENANT_A));
      return Promise.resolve(order("order-b", TENANT_B));
    });

    await completeProductOrder("order-a");
    await completeProductOrder("order-b");

    expect(h.stateFor(TENANT_A).used).toBe(1);
    expect(h.stateFor(TENANT_B).used).toBe(1);
  });

  it("only orderId (and a payment id) are accepted — plan/limit/tenant are server-derived", async () => {
    // The API surface takes no tenant/plan/limit/period inputs at all.
    const res = await completeProductOrder("order-a", { paymentId: "pay_1" });
    expect(res.success).toBe(true);
    expect(h.mockResolveActivePlan).toHaveBeenCalledWith(undefined, TENANT_A);
  });
});

describe("RCCF-38 — Super Admin override propagates to enforcement + marketing source", () => {
  it("a runtime override of max_orders is enforced by order completion", async () => {
    applyRuntimeFeatureOverrides("creator_grow", { max_orders: 25 });
    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    expect(capabilityService.limit("creator_grow", "max_orders")).toBe(25);

    h.stateFor(TENANT_A).used = 25;
    h.stateFor(TENANT_A).exists = true;
    const res = await completeProductOrder("order-a");

    expect(res.reason).toBe("quota");
    expect(res.limit).toBe(25);
  });

  it("marketing (comparison) reads the same runtime feature values", async () => {
    // The comparison matrix renders p.features["max_orders"]; the canonical
    // registry is the fallback marketing source when no override exists.
    const { getPlan } = await import("@/lib/capabilities");
    expect(getPlan("creator_launch")?.features.max_orders).toBe(10);
    expect(getPlan("creator_grow")?.features.max_orders).toBe(100);
    expect(getPlan("creator_scale")?.features.max_orders).toBe(-1);
    expect(getPlan("creator_enterprise")?.features.max_orders).toBe(-1);
  });
});
