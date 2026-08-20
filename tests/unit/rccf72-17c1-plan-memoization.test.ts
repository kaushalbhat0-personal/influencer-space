import { describe, it, expect, vi, beforeEach } from "vitest";

// Request-scope simulation: `currentHeaders` is a fresh object per request.
// `headers()` returns it (same instance within a request); when null it throws
// (as Next does outside a request scope) → identity fallback.
let currentHeaders: object | null = {};
const h = vi.hoisted(() => ({
  mockHeaders: vi.fn(() => {
    if (!currentHeaders) throw new Error("`headers` was called outside a request scope.");
    return currentHeaders;
  }),
  mockFindSub: vi.fn(),
  mockWorkspace: vi.fn(),
  mockLegacy: vi.fn(),
}));

vi.mock("next/headers", () => ({ headers: h.mockHeaders }));
vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { findSubscriptionWithPlan: h.mockFindSub },
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: { findFirst: h.mockWorkspace },
    subscription: { findUnique: h.mockLegacy },
  },
}));

import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { resetPlanRestrictionCache } from "@/modules/billing/application/plan-restriction";

function beginRequest() {
  currentHeaders = {};
}
function endRequest() {
  currentHeaders = null;
}

beforeEach(() => {
  vi.clearAllMocks();
  resetPlanRestrictionCache();
  h.mockWorkspace.mockResolvedValue(null);
  h.mockFindSub.mockResolvedValue(null);
  h.mockLegacy.mockResolvedValue(null);
  beginRequest();
});

afterEach(() => endRequest());

describe("RCCF-72.17C.1 — request-scoped resolveActivePlan memoization", () => {
  it("TEST 1 — deduplicates repeated same-input calls within one request", async () => {
    h.mockFindSub.mockResolvedValue({ plan: { code: "creator_grow" }, status: "ACTIVE" });
    const r1 = await resolveActivePlan("ws-a", "tenant-a");
    const r2 = await resolveActivePlan("ws-a", "tenant-a");
    const r3 = await resolveActivePlan("ws-a", "tenant-a");
    expect(r1.code).toBe("creator_grow");
    expect(r2).toBe(r1);
    expect(r3).toBe(r1);
    // workspaceId path → one findSubscriptionWithPlan for three calls.
    expect(h.mockFindSub).toHaveBeenCalledTimes(1);
  });

  it("TEST 2 — different requests do NOT share cached results", async () => {
    h.mockFindSub.mockResolvedValue({ plan: { code: "creator_grow" }, status: "ACTIVE" });
    await resolveActivePlan("ws-a", "tenant-a");
    expect(h.mockFindSub).toHaveBeenCalledTimes(1);

    // New request, same inputs → must re-resolve and observe new committed state.
    endRequest();
    beginRequest();
    h.mockFindSub.mockResolvedValue({ plan: { code: "creator_scale" }, status: "ACTIVE" });
    const r2 = await resolveActivePlan("ws-a", "tenant-a");
    expect(r2.code).toBe("creator_scale");
    // Two independent resolutions total — one per request.
    expect(h.mockFindSub).toHaveBeenCalledTimes(2);
  });

  it("TEST 3 — different tenants/workspaces do NOT collide within one request", async () => {
    h.mockFindSub.mockResolvedValue({ plan: { code: "creator_grow" }, status: "ACTIVE" });
    const a = await resolveActivePlan("ws-a", "tenant-a");
    const b = await resolveActivePlan("ws-b", "tenant-b");
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    // Two distinct input keys → two independent resolutions.
    expect(h.mockFindSub).toHaveBeenCalledTimes(2);
  });

  it("TEST 4 — workspace-only, tenant-only, both, and null inputs are distinct keys", async () => {
    h.mockWorkspace.mockImplementation(async ({ where }: { where: { tenantId: string } }) => ({ id: `ws-${where.tenantId}` }));
    h.mockFindSub.mockResolvedValue({ plan: { code: "creator_launch" }, status: "ACTIVE" });

    await resolveActivePlan("ws-only", undefined); // workspaceId path → findSub
    await resolveActivePlan(undefined, "tenant-only"); // tenantId path → workspace + findSub
    await resolveActivePlan("ws-both", "tenant-both"); // workspaceId path → findSub
    await resolveActivePlan(undefined, undefined); // neither → no DB read
    await resolveActivePlan("ws-only", undefined); // dedup of the first combo

    expect(h.mockFindSub).toHaveBeenCalledTimes(3); // ws-only, tenant-only, ws-both
    expect(h.mockWorkspace).toHaveBeenCalledTimes(1); // tenant-only path only
    expect(h.mockLegacy).toHaveBeenCalledTimes(0); // v2 always found here
  });

  it("TEST 5 — a failed resolution is not cached and does not poison later calls", async () => {
    h.mockWorkspace.mockResolvedValue({ id: "ws-1" });
    h.mockFindSub.mockRejectedValueOnce(new Error("db down"));
    h.mockFindSub.mockResolvedValueOnce({ plan: { code: "creator_scale" }, status: "ACTIVE" });

    await expect(resolveActivePlan("ws-a", "tenant-a")).rejects.toThrow("db down");
    // Second call in the same request re-invokes (failure not cached) and succeeds.
    const r = await resolveActivePlan("ws-a", "tenant-a");
    expect(r.code).toBe("creator_scale");
    expect(h.mockFindSub).toHaveBeenCalledTimes(2);

    // A subsequent request resolves normally.
    endRequest();
    beginRequest();
    h.mockFindSub.mockResolvedValue({ plan: { code: "creator_grow" }, status: "ACTIVE" });
    const r2 = await resolveActivePlan("ws-a", "tenant-a");
    expect(r2.code).toBe("creator_grow");
  });

  it("regression — legacy fallback resolves and dedups within a request (tenant-only path)", async () => {
    h.mockLegacy.mockResolvedValue({ plan: "PRO", status: "ACTIVE" });
    const r1 = await resolveActivePlan(undefined, "tenant-legacy");
    const r2 = await resolveActivePlan(undefined, "tenant-legacy");
    expect(r1.origin).toBe("legacy");
    expect(r1.code).toBe("PRO");
    expect(r2).toBe(r1);
    // One full tenant-only resolution (workspace + legacy) for two calls; the
    // v2 path is skipped because no workspace exists.
    expect(h.mockWorkspace).toHaveBeenCalledTimes(1);
    expect(h.mockFindSub).toHaveBeenCalledTimes(0);
    expect(h.mockLegacy).toHaveBeenCalledTimes(1);
  });
});