/**
 * RCCF-MKT-06 — Pricing Catalog Synchronization & Subscription Readiness.
 *
 * Pins the full MKT-05 → runtime chain after the authorized Super Admin
 * catalog re-sync:
 *   registry (src/config/commerce/plans.ts)
 *     → seedBillingCatalog / resyncBillingCatalog (BillingPlan)
 *       → runtime pricing resolver (src/modules/pricing/application/runtime.ts)
 *         → marketing surfaces (/pricing, homepage, metadata)
 *
 * Plus Razorpay subscription readiness: creator_scale provisions a fresh plan
 * via savePlanConfig, the retired ₹1,995 provider plan stays dead,
 * creator_grow keeps its valid plan, and live-mode provisioning fails closed
 * without explicit authorization.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

// ── Harness (same pattern as super-admin-pricing-actions.test.ts) ───────────

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockUpsert: vi.fn(),
  mockVersionCreate: vi.fn(),
  mockResetCache: vi.fn(),
  mockLogAction: vi.fn(),
  mockFindUnique: vi.fn(),
  mockPlansCreate: vi.fn(),
  mockUpdateMany: vi.fn(),
  mockSeedCatalog: vi.fn(),
  mockPlansFindMany: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingPlan: { upsert: h.mockUpsert, findUnique: h.mockFindUnique, updateMany: h.mockUpdateMany, findMany: h.mockPlansFindMany },
    planPricingVersion: { create: h.mockVersionCreate },
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/modules/billing/infrastructure/catalog-seed", () => ({ seedBillingCatalog: h.mockSeedCatalog }));
vi.mock("@/modules/billing/application/runtime-config-loader", () => ({ resetRuntimeConfigLoaderCache: h.mockResetCache }));
vi.mock("razorpay", () => ({
  __esModule: true,
  default: class {
    plans = { create: h.mockPlansCreate };
  },
}));

import { savePlanConfig, resyncBillingCatalog } from "@/actions/super-admin-pricing.actions";
import type { PlanEditorInput } from "@/actions/super-admin-pricing.actions";
import { COMMERCE_PLANS, getCommercePlan } from "@/config/commerce/plans";
import { getAllPlans } from "@/lib/capabilities";
import { getRuntimePlan, mergeRuntimePlan } from "@/modules/pricing/application/runtime";

// ── Approved pricing contract (RCCF-MKT-05, authoritative) ──────────────────

const APPROVED_MONTHLY: Record<string, number> = {
  creator_launch: 0,
  creator_grow: 999,
  creator_scale: 1999,
  partner_free: 0,
  partner_solo: 4999,
  partner_scale: 14999,
};

const RETIRED_PRICES = [699, 1995, 2999, 7999];
const RETIRED_RAZORPAY_PLAN = "plan_TLTH45wQlPdW7v";
const VALID_GROW_PLAN = "plan_TLTGQBU1EXkseF";

describe("MKT-06 Catalog — registry contract is the corrected MKT-05 truth", () => {
  it("exposes exactly the approved monthly prices for every public plan", () => {
    for (const [code, price] of Object.entries(APPROVED_MONTHLY)) {
      expect(getCommercePlan(code)?.price, `${code} must be ₹${price}`).toBe(price);
    }
  });

  it("keeps the annualPrice = 10 × monthly invariant on every paid plan that declares one", () => {
    for (const plan of COMMERCE_PLANS) {
      if (plan.price === null || plan.price === 0 || plan.annualPrice === undefined) continue;
      expect(plan.annualPrice, `${plan.code} annual`).toBe(plan.price * 10);
    }
    // The six public plans all declare the invariant explicitly.
    for (const [code, price] of Object.entries(APPROVED_MONTHLY)) {
      if (price === 0) continue;
      expect(getCommercePlan(code)?.annualPrice).toBe(price * 10);
    }
  });

  it("carries no retired active prices anywhere in the registry", () => {
    const prices = COMMERCE_PLANS.map((p) => p.price);
    for (const stale of RETIRED_PRICES) {
      expect(prices).not.toContain(stale);
    }
  });

  it("does not expose Partner Growth as a canonical plan", () => {
    expect(COMMERCE_PLANS.some((p) => p.code === "partner_growth")).toBe(false);
  });

  it("maps every registry plan into the capability engine the DB seed writes", () => {
    // seedBillingCatalog iterates getAllPlans() and upserts price: plan.price —
    // so the capability-engine mirror must agree with the commerce registry.
    const engine = new Map(getAllPlans().map((p) => [p.code, p]));
    for (const cfg of COMMERCE_PLANS) {
      const mirrored = engine.get(cfg.code);
      expect(mirrored, `${cfg.code} mirrored`).toBeDefined();
      expect(mirrored!.price).toBe(cfg.price ?? 0);
    }
  });
});

// ── Runtime — registry → BillingPlan → resolved pricing ─────────────────────

function dbRow(code: string, price: number, rc: unknown) {
  return { code, name: code, family: "creator", price, currency: "INR", status: "ACTIVE", gracePeriodDays: 0, runtimeConfig: rc };
}

describe("MKT-06 Runtime — corrected BillingPlan resolves through the runtime resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", email: "sa@test" } });
    h.mockUpsert.mockResolvedValue({ id: "plan-row" });
    h.mockVersionCreate.mockResolvedValue({ id: "v" });
    h.mockLogAction.mockResolvedValue(undefined);
    h.mockSeedCatalog.mockResolvedValue({ ok: true });
    h.mockUpdateMany.mockResolvedValue({ count: 15 });
    h.mockPlansCreate.mockResolvedValue({ id: "plan_new_scale_1" });
  });

  it("resolves all six public plans to the approved values after the re-sync", async () => {
    h.mockPlansFindMany.mockResolvedValue(
      Object.entries(APPROVED_MONTHLY).map(([code, price]) => dbRow(code, price, null)),
    );
    for (const [code, price] of Object.entries(APPROVED_MONTHLY)) {
      expect((await getRuntimePlan(code))?.price, `${code} runtime`).toBe(price);
    }
  });

  it("a stale scalar row cannot shadow once the sync has corrected it", async () => {
    // Post-resync state: seedBillingCatalog upserted the corrected scalar and
    // resyncBillingCatalog wiped runtimeConfig — nothing stale remains.
    h.mockPlansFindMany.mockResolvedValue([dbRow("creator_grow", 999, null)]);
    expect((await getRuntimePlan("creator_grow"))?.price).toBe(999);
  });

  it("documents why the DbNull wipe matters: stale runtimeConfig WOULD shadow the corrected catalog", () => {
    const defaults = getCommercePlan("creator_grow")!;
    expect(mergeRuntimePlan(defaults, { pricing: { price: 699 } }).price).toBe(699); // pre-sync shadow
    expect(mergeRuntimePlan(defaults, undefined).price).toBe(999); // post-sync (rc cleared)
  });

  it("resyncBillingCatalog resets every row to registry defaults (seed + DbNull wipe)", async () => {
    const res = await resyncBillingCatalog();
    expect(res.success).toBe(true);
    expect(h.mockSeedCatalog).toHaveBeenCalledTimes(1);
    expect(h.mockUpdateMany).toHaveBeenCalledWith({ data: { runtimeConfig: expect.anything() } });
    expect(h.mockResetCache).toHaveBeenCalledTimes(1);
  });
});

// ── Razorpay — provisioning readiness & safety ──────────────────────────────

const scaleInput: PlanEditorInput = {
  code: "creator_scale",
  name: "Creator Scale",
  family: "creator",
  description: "Scale",
  targetAudience: null,
  monthlyPrice: 1999,
  annualPrice: 19990,
  trialDays: null,
  gracePeriodDays: 0,
  badge: null,
  ctaLabel: "Upgrade to Scale",
  ctaType: "checkout",
  comparisonOrder: 3,
  hidden: false,
  enterprise: false,
  popular: false,
  bestValue: false,
  recommended: false,
  colorAccent: null,
  highlights: [],
  capabilities: ["premium_themes"],
  featureOverrides: {},
  scheduled: [],
  changeNote: "MKT-06 provision fresh Scale plan at ₹1,999",
};

describe("MKT-06 Razorpay — Creator Scale provisioning contract", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", email: "sa@test" } });
    h.mockUpsert.mockResolvedValue({ id: "plan-row" });
    h.mockVersionCreate.mockResolvedValue({ id: "v" });
    h.mockLogAction.mockResolvedValue(undefined);
    h.mockResetCache.mockResolvedValue(undefined);
    h.mockPlansCreate.mockResolvedValue({ id: "plan_new_scale_1" });
    delete process.env.RAZORPAY_LIVE_PROVISIONING_AUTHORIZED;
    delete process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_ID;
  });

  it("starts with razorpayPlanId null in the registry (pre-provisioning state)", () => {
    expect(getCommercePlan("creator_scale")?.razorpayPlanId).toBeNull();
  });

  it("provisions a ₹1,999 INR monthly provider plan and stores the returned id in runtimeConfig", async () => {
    // Existing row carries the retired ₹1,995 amount → priceChanged triggers
    // auto-provisioning through the existing Pricing Center mechanism.
    h.mockFindUnique.mockResolvedValue({ price: 1995, runtimeConfig: null });

    const res = await savePlanConfig(scaleInput);

    expect(res.success).toBe(true);
    expect(res.warning).toBeUndefined();
    expect(h.mockPlansCreate).toHaveBeenCalledTimes(1);
    const args = h.mockPlansCreate.mock.calls[0][0] as { period: string; interval: number; item: { amount: number; currency: string; name: string }; notes: { planCode: string } };
    expect(args.period).toBe("monthly");
    expect(args.interval).toBe(1);
    expect(args.item.amount).toBe(199900); // ₹1,999 in paise
    expect(args.item.currency).toBe("INR");
    expect(args.notes.planCode).toBe("creator_scale");

    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId).toBe("plan_new_scale_1");
    expect(rc.pricing?.razorpayPlanId).not.toBe(RETIRED_RAZORPAY_PLAN);
  });

  it("never uses or stores the retired ₹1,995 provider plan", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 1995, runtimeConfig: null });
    await savePlanConfig(scaleInput);
    const storedIds = JSON.stringify(h.mockUpsert.mock.calls);
    expect(storedIds).not.toContain(RETIRED_RAZORPAY_PLAN);
    // The MKT-05 comment documents WHY the id was nulled — but it must never
    // be assigned as an active razorpayPlanId again.
    const src = read("src/config/commerce/plans.ts");
    expect(src).not.toMatch(new RegExp(`razorpayPlanId:\\s*"${RETIRED_RAZORPAY_PLAN}"`));
    expect(getCommercePlan("creator_scale")?.razorpayPlanId).not.toBe(RETIRED_RAZORPAY_PLAN);
  });

  it("keeps creator_growth's valid provider plan untouched when its price is unchanged", async () => {
    h.mockFindUnique.mockResolvedValue({ price: 999, runtimeConfig: null });
    const res = await savePlanConfig({ ...scaleInput, code: "creator_grow", name: "Creator Growth", monthlyPrice: 999, changeNote: "no-op edit" });

    expect(res.success).toBe(true);
    expect(h.mockPlansCreate).not.toHaveBeenCalled(); // no new provider contract
    expect(getCommercePlan("creator_grow")?.razorpayPlanId).toBe(VALID_GROW_PLAN);
  });

  it("fails closed under LIVE keys without explicit authorization", async () => {
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_unitTestKey";
    h.mockFindUnique.mockResolvedValue({ price: 1995, runtimeConfig: null });

    const res = await savePlanConfig(scaleInput);

    // Fail-closed semantics: NO provider mutation; price still saves; warning
    // surfaces; plan id stays unset → checkout keeps the one-time-order path.
    expect(res.success).toBe(true);
    expect(res.warning).toMatch(/LIVE MODE CONFIRMATION REQUIRED/i);
    expect(h.mockPlansCreate).not.toHaveBeenCalled();
    const rc = h.mockUpsert.mock.calls[0][0].update.runtimeConfig as { pricing?: { razorpayPlanId?: string | null } };
    expect(rc.pricing?.razorpayPlanId ?? null).toBeNull();
  });

  it("allows LIVE provisioning only with explicit operator authorization", async () => {
    process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID = "rzp_live_unitTestKey";
    process.env.RAZORPAY_LIVE_PROVISIONING_AUTHORIZED = "1";
    h.mockFindUnique.mockResolvedValue({ price: 1995, runtimeConfig: null });

    const res = await savePlanConfig(scaleInput);

    expect(res.success).toBe(true);
    expect(res.warning).toBeUndefined();
    expect(h.mockPlansCreate).toHaveBeenCalledTimes(1);
  });
});

// ── Marketing — surfaces derive from synchronized runtime ───────────────────

describe("MKT-06 Marketing — no hardcoded pricing, runtime-derived only", () => {
  it("/pricing metadata derives both 'from' prices via paidFromPrice(runtime)", () => {
    const src = read("src/app/pricing/page.tsx");
    expect(src).toContain("paidFromPrice(data.creator)");
    expect(src).toContain("paidFromPrice(data.partner)");
    expect(src).toContain('from ₹${minCreator}/month');
    expect(src).toContain('from ₹${minPartner}/month');
    expect(src).toMatch(/getPublicPricingData/);
  });

  it("the Pricing component renders formatCurrency values, never hardcoded plan literals", () => {
    const src = read("src/components/marketing/Pricing/index.tsx");
    expect(src).toMatch(/formatCurrency\(/);
    expect(src).not.toMatch(/₹\s?999|₹\s?1,?999|₹\s?4,?999|₹\s?14,?999/);
  });

  it("the Launch core-content note still explains the shared ceiling of 3", () => {
    const src = read("src/components/marketing/Pricing/comparison.tsx");
    expect(src).toContain("launch-core-content-note");
    expect(src).toContain("combined allowance of up to 3 active items");
  });
});

// ── Safety — architecture preservation ──────────────────────────────────────

describe("MKT-06 Safety — billing architecture and history are untouched", () => {
  it("catalog operations never mutate subscriptions or billing events", () => {
    const src = read("src/actions/super-admin-pricing.actions.ts");
    // Scope to the two catalog-mutation operations (analytics legitimately
    // reads subscriptions elsewhere in this module).
    const saveBody = src.slice(src.indexOf("export async function savePlanConfig"), src.indexOf("export async function rollbackPlanVersion"));
    const resyncBody = src.slice(src.indexOf("export async function resyncBillingCatalog"), src.indexOf("export async function getPricingAnalytics"));
    for (const body of [saveBody, resyncBody]) {
      expect(body).not.toMatch(/billingSubscription/);
      expect(body).not.toMatch(/billingEvent/);
      expect(body).not.toMatch(/deleteMany|delete\(\{/);
    }
  });

  it("the checkout provider fallback chain (DB plan id → registry) is preserved", () => {
    const src = read("src/modules/billing/infrastructure/providers/razorpay.ts");
    expect(src).toContain("params.razorpayPlanId ?? razorpayPlanIdFor(params.planCode)");
  });

  it("existing subscriptions keep snapshotting their own contracted amounts", () => {
    // Subscriptions bill against immutable Razorpay plans; catalog resync only
    // touches BillingPlan rows. The lifecycle webhook guard (paid transition
    // needs a captured payment) is intact.
    const svc = read("src/modules/billing/application/service.ts");
    expect(svc).toMatch(/validPaidAmount|isPaidTransition/);
  });

  it("Partner Growth is unreachable as a canonical upgrade target", () => {
    const constants = read("src/lib/capabilities/constants.ts");
    expect(constants).not.toMatch(/partner_growth\s*[:=]/);
    expect(constants).toMatch(/partner_growth removed|removed.*[Pp]artner [Gg]rowth|GROWTH → partner_growth removed/);
  });
});
