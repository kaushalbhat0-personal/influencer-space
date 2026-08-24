import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockFindFirst: vi.fn(),
  mockChangePlan: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: { workspace: { findFirst: h.mockFindFirst } },
}));
vi.mock("@/modules/billing/application/service", () => ({
  billingService: { changePlan: h.mockChangePlan },
}));

import { changePlanAction, retryPaymentAction } from "@/actions/billing.actions";
import { getCommercePlan, COMMERCE_PLANS } from "@/config/commerce/plans";

/**
 * RCCF-RELEASE-02 (F1) — Plan-family invariant.
 *
 * A Creator tenant may ONLY select Creator-family plans; an Agency/Partner
 * tenant may ONLY select Partner-family plans. There is NO cross-family
 * self-selection. Family derives ONLY from the server-verified Workspace.type
 * (TENANT = Creator, AGENCY = Partner); the client supplies a plan code only.
 * The gate runs inside the server action BEFORE checkout creation, so a
 * cross-family attempt causes zero provider calls and zero subscription or
 * entitlement mutations.
 */

const BILLING_SVC = join(process.cwd(), "src/modules/billing/application/service.ts");
const BILLING_ACTIONS = join(process.cwd(), "src/actions/billing.actions.ts");
const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

function authedCreator() {
  h.mockGetServerSession.mockResolvedValue({ user: { id: "u1", tenantId: "t1" } });
  h.mockFindFirst.mockResolvedValue({ id: "ws-1", type: "TENANT" });
}

function authedAgency() {
  h.mockGetServerSession.mockResolvedValue({ user: { id: "u2", tenantId: "t2" } });
  h.mockFindFirst.mockResolvedValue({ id: "ws-2", type: "AGENCY" });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockChangePlan.mockResolvedValue({
    success: true,
    orderId: "order_1",
    subscriptionId: "sub_1",
    amount: 999,
    currency: "INR",
  });
});

// ── Creator matrix ───────────────────────────────────────────────────────────

describe("F1 — Creator tenant plan matrix", () => {
  beforeEach(authedCreator);

  it.each(["creator_launch", "creator_grow", "creator_scale"])(
    "allows %s (same family)",
    async (code) => {
      const res = await changePlanAction("ws-1", "t1", code);
      expect(res.success).toBe(true);
      expect(h.mockChangePlan).toHaveBeenCalledWith("ws-1", code, undefined);
      expect(h.mockChangePlan).toHaveBeenCalledTimes(1);
    },
  );

  it.each(["partner_free", "partner_solo", "partner_scale"])(
    "denies %s for a Creator (cross-family)",
    async (code) => {
      const res = await changePlanAction("ws-1", "t1", code);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid Creator plan");
      // Zero financial side effects.
      expect(h.mockChangePlan).not.toHaveBeenCalled();
    },
  );

  it("denies retired partner_growth (absent from canonical registry)", async () => {
    const res = await changePlanAction("ws-1", "t1", "partner_growth");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unknown plan: partner_growth");
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("denies an unknown plan code before any service call", async () => {
    const res = await changePlanAction("ws-1", "t1", "not_a_plan");
    expect(res.success).toBe(false);
    expect(res.error).toBe("Unknown plan: not_a_plan");
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });
});

// ── Partner preservation ─────────────────────────────────────────────────────

describe("F1 — Partner path preservation (existing behavior intact)", () => {
  beforeEach(authedAgency);

  it.each(["partner_free", "partner_solo", "partner_scale"])(
    "allows %s for an Agency workspace",
    async (code) => {
      const res = await changePlanAction("ws-2", "t2", code);
      expect(res.success).toBe(true);
      expect(h.mockChangePlan).toHaveBeenCalledWith("ws-2", code, undefined);
    },
  );

  it.each(["creator_launch", "creator_grow", "creator_scale"])(
    "denies %s for an Agency (cross-family)",
    async (code) => {
      const res = await changePlanAction("ws-2", "t2", code);
      expect(res.success).toBe(false);
      expect(res.error).toBe("Invalid partner plan");
      expect(h.mockChangePlan).not.toHaveBeenCalled();
    },
  );

  it("denies retired partner_growth", async () => {
    const res = await changePlanAction("ws-2", "t2", "partner_growth");
    expect(res.success).toBe(false);
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("retryPaymentAction enforces the same family gate", async () => {
    const denied = await retryPaymentAction("ws-2", "t2", "creator_grow");
    expect(denied.success).toBe(false);
    expect(denied.error).toBe("Invalid partner plan");
    expect(h.mockChangePlan).not.toHaveBeenCalled();

    const allowed = await retryPaymentAction("ws-2", "t2", "partner_solo");
    expect(allowed.success).toBe(true);
    expect(h.mockChangePlan).toHaveBeenCalledTimes(1);
  });
});

// ── Security ────────────────────────────────────────────────────────────────

describe("F1 — security: family is server-derived, never client-injected", () => {
  it("the action signature accepts no family input — only a plan code", () => {
    const src = read("src/actions/billing.actions.ts");
    expect(src).toMatch(/changePlanAction\(\s*workspaceId: string,\s*tenantId: string,\s*planCode: string/);
    expect(src).not.toMatch(/family\?\s*:|family:\s*"/);
  });

  it("family derives from server-verified Workspace.type, scoped to the caller's tenant", () => {
    const src = read("src/actions/billing.actions.ts");
    expect(src).toMatch(/assertPlanFamilyForWorkspace/);
    expect(src).toMatch(/where: \{ id: workspaceId, tenantId \},\s*\n\s*select: \{ id: true, type: true \}/);
    expect(src).toMatch(/expectedFamily = workspaceType === "AGENCY" \? "partner" : "creator"/);
  });

  it("a guessed workspace outside the caller's tenant is Unauthorized (no service call)", async () => {
    authedCreator();
    h.mockFindFirst.mockResolvedValue(null); // workspace not owned by t1
    const res = await changePlanAction("other-ws", "t1", "creator_grow");
    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("an anonymous caller cannot reach checkout", async () => {
    h.mockGetServerSession.mockResolvedValue(null);
    const res = await changePlanAction("ws-1", "t1", "creator_grow");
    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("cross-family attempt causes ZERO provider calls / subscription mutations / entitlement changes", async () => {
    authedCreator();
    for (const code of ["partner_free", "partner_solo", "partner_scale", "partner_growth"]) {
      await changePlanAction("ws-1", "t1", code);
    }
    expect(h.mockChangePlan).not.toHaveBeenCalledTimes(4);
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("registry remains the single family authority (no second list in actions)", () => {
    const src = read("src/actions/billing.actions.ts");
    expect(src).toContain('from "@/config/commerce/plans"');
    // The family decision lives in the guard and consults ONLY the registry.
    const guard = src.match(/function assertPlanFamilyForWorkspace[\s\S]*?\n\}/)?.[0] ?? "";
    expect(guard).toContain("getCommercePlan");
    expect(guard).toMatch(/target\.family !== expectedFamily/);
    expect(guard).not.toMatch(/"(partner_solo|partner_scale|partner_free|creator_grow|creator_scale)"/);
    for (const p of COMMERCE_PLANS) {
      expect(getCommercePlan(p.code)?.family).toBe(p.family);
    }
  });
});

// ── Regression: lifecycle / payment architecture untouched ───────────────────

describe("F1 — regression guards", () => {
  it("same-family upgrade passes email through and returns checkout + keyId", async () => {
    authedCreator();
    const res = await changePlanAction("ws-1", "t1", "creator_grow", "c@example.com");
    expect(res.success).toBe(true);
    expect(h.mockChangePlan).toHaveBeenCalledWith("ws-1", "creator_grow", "c@example.com");
    expect(res.checkout?.orderId).toBe("order_1");
    expect(res.checkout?.keyId).toBe(process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "");
  });

  it("lifecycle status guard unchanged in BillingService", () => {
    const svc = readFileSync(BILLING_SVC, "utf8");
    expect(svc).toMatch(/Cannot change plan from status/);
  });

  it("activation stays webhook-driven; old entitlements persist until activation", () => {
    const svc = readFileSync(BILLING_SVC, "utf8");
    expect(svc).toMatch(/Activation is webhook-/);
    expect(svc).toMatch(/capabilities remain until the new subscription activates/);
  });

  it("no provider contract or pricing changes accompany F1", () => {
    const actions = readFileSync(BILLING_ACTIONS, "utf8");
    // The guard resolves eligibility only — it never sets price/provider ids.
    const guard = actions.match(/function assertPlanFamilyForWorkspace[\s\S]*?\n\}/)?.[0] ?? "";
    expect(guard).not.toMatch(/razorpayPlanId|amount|price/i);
  });
});
