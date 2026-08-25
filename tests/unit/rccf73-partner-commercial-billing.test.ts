/**
 * RCCF-73 — Partner Commercial Model & Billing Architecture.
 *
 * Pins the ONE-TIME partner economics end-to-end at the boundaries that move
 * money: registry form, provider routing, webhook activation integrity,
 * payment-gated additional-client capacity, free-partner commission gate,
 * F2 provisioning truth, Pricing Center provisioning skip, and Creator
 * regression invariants.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { COMMERCE_PLANS, getCommercePlan, isOneTimePlan, planBillingForm } from "@/config/commerce/plans";
import { PARTNER_ADDON_UNIT_PRICE_INR } from "@/config/commerce/agency-addons";

// ── Registry: billing-form truth ─────────────────────────────────────────────

describe("RCCF-73 — registry billing forms", () => {
  it("Partner Solo = ₹4,999 ONE-TIME (no annual variant, no provider subscription id)", () => {
    const p = getCommercePlan("partner_solo")!;
    expect(p.price).toBe(4999);
    expect(p.billingForm).toBe("one_time");
    expect(p.family).toBe("partner");
    expect(p.annualPrice).toBeUndefined();
    expect(p.razorpayPlanId).toBeNull();
    expect(isOneTimePlan("partner_solo")).toBe(true);
  });

  it("Partner Scale = ₹14,999 ONE-TIME (no annual variant, no provider subscription id)", () => {
    const p = getCommercePlan("partner_scale")!;
    expect(p.price).toBe(14999);
    expect(p.billingForm).toBe("one_time");
    expect(p.annualPrice).toBeUndefined();
    expect(p.razorpayPlanId).toBeNull();
    expect(isOneTimePlan("partner_scale")).toBe(true);
  });

  it("unknown codes default to subscription semantics (pre-RCCF-73 behavior preserved)", () => {
    expect(planBillingForm("db_only_plan")).toBe("subscription");
    expect(isOneTimePlan(null)).toBe(false);
  });

  it("Partner Launch stays a free 15-day trial with 1 client website", () => {
    const p = getCommercePlan("partner_free")!;
    expect(p.price).toBe(0);
    expect(p.trialDays).toBe(15);
    expect(p.featureOverrides?.max_clients).toBe(1);
    expect(isOneTimePlan("partner_free")).toBe(false);
  });

  it("Partner Growth remains fully retired from the canonical registry", () => {
    expect(COMMERCE_PLANS.find((p) => p.code === "partner_growth")).toBeUndefined();
  });
});

// ── Shared harness ───────────────────────────────────────────────────────────

const h = vi.hoisted(() => ({
  // provider SDK
  ordersCreate: vi.fn(),
  subsCreate: vi.fn(),
  // billing service
  findSubByWorkspace: vi.fn(),
  findSubWithPlan: vi.fn(),
  findPlanByCode: vi.fn(),
  upsertSub: vi.fn(),
  createEvent: vi.fn(),
  isDuplicate: vi.fn(),
  createInvoice: vi.fn(),
  publish: vi.fn(),
  logAction: vi.fn(),
  workspaceFind: vi.fn(),
  invoiceFindFirst: vi.fn(),
  // capacity purchase
  agencyFindUnique: vi.fn(),
  workspaceFindFirst: vi.fn(),
  capEventFindUnique: vi.fn(),
  capEventDirectCreate: vi.fn(),
  addonCreateTx: vi.fn(),
  eventCreateTx: vi.fn(),
}));

vi.mock("razorpay", () => ({
  default: class MockRazorpay {
    orders = { create: h.ordersCreate };
    subscriptions = { create: h.subsCreate };
    constructor(_keyId?: string, _secret?: string) {}
  },
}));

vi.mock("@/modules/billing/application/plan-restriction", () => ({
  assertEligiblePlan: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    findSubscriptionByWorkspaceId: h.findSubByWorkspace,
    findSubscriptionWithPlan: h.findSubWithPlan,
    findPlanByCode: h.findPlanByCode,
    upsertSubscription: h.upsertSub,
    createEvent: h.createEvent,
    isDuplicateEvent: h.isDuplicate,
    createInvoice: h.createInvoice,
    linkSubscriptionToWorkspace: vi.fn().mockResolvedValue(null),
  },
}));

const prismaMock = vi.hoisted(() => ({
  prisma: {
    $transaction: async (cb: (tx: unknown) => unknown) =>
      cb({
        agencyCapacityAddon: { create: h.addonCreateTx },
        billingInvoice: { create: h.createInvoice },
        billingEvent: { create: h.eventCreateTx },
      }),
    workspace: { findUnique: h.workspaceFind, findFirst: h.workspaceFindFirst },
    websiteAgency: { findUnique: h.agencyFindUnique },
    billingPlan: { findUnique: vi.fn() },
    billingInvoice: { findFirst: h.invoiceFindFirst },
    billingEvent: {
      findUnique: h.capEventFindUnique,
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      create: h.capEventDirectCreate,
    },
    productOrder: { findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) },
    agencyTenant: { findUnique: vi.fn().mockResolvedValue(null), findFirst: vi.fn().mockResolvedValue(null), count: vi.fn().mockResolvedValue(0) },
    commissionRule: { findMany: vi.fn().mockResolvedValue([]) },
    commissionPolicy: { findFirst: vi.fn().mockResolvedValue(null) },
    loyaltyTier: { findMany: vi.fn().mockResolvedValue([]) },
    billingAccount: { findUnique: vi.fn().mockResolvedValue(null) },
    billingSubscription: { findMany: vi.fn().mockResolvedValue([]) },
    commissionEntry: { findFirst: vi.fn().mockResolvedValue(null), aggregate: vi.fn().mockResolvedValue({ _sum: { partnerShare: 0 } }) },
    partnerLedger: { findFirst: vi.fn().mockResolvedValue(null), aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 0 } }) },
    product: { count: vi.fn().mockResolvedValue(0) },
    galleryImage: { count: vi.fn().mockResolvedValue(0) },
  },
}));

vi.mock("@/lib/prisma", () => prismaMock);
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: h.publish } }));
vi.mock("@/lib/audit", () => ({ logAction: h.logAction }));
// Partial mock: keep the REAL commission runtime (predicate/resolver under
// test) while stubbing only the heavy recording entry point.
vi.mock(import("@/lib/commission/runtime"), async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/commission/runtime")>();
  return {
    ...actual,
    recordSubscriptionCommission: vi.fn().mockResolvedValue({ success: true }),
  };
});

import { RazorpayProvider } from "@/modules/billing/infrastructure/providers/razorpay";
import { BillingService } from "@/modules/billing/application/service";

const provider = new RazorpayProvider();
const service = new BillingService();

beforeEach(() => {
  vi.clearAllMocks();
  h.isDuplicate.mockResolvedValue(false);
  h.upsertSub.mockImplementation(async (_ws: string, data: object) => ({ id: "sub-1", ...data }));
  h.createEvent.mockResolvedValue({ id: "evt-1" });
  h.createInvoice.mockResolvedValue({ id: "inv-1" });
  h.invoiceFindFirst.mockResolvedValue(null);
  h.workspaceFind.mockResolvedValue({ tenantId: null });
  h.logAction.mockResolvedValue(undefined);
  h.subsCreate.mockResolvedValue({ id: "sub_test" });
  h.capEventDirectCreate.mockResolvedValue({ id: "evt-direct" });
  h.ordersCreate.mockResolvedValue({ id: `order_${Math.random().toString(36).slice(2, 8)}`, amount: 100, currency: "INR", receipt: "r" });
  h.findPlanByCode.mockImplementation(async (code: string) => ({
    id: `plan-${code}`,
    code,
    price: code === "partner_solo" ? 4999 : code === "partner_scale" ? 14999 : code === "creator_grow" ? 999 : 1999,
  }));
  // capacity defaults
  h.agencyFindUnique.mockResolvedValue({ id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", status: "ACTIVE" });
  h.workspaceFindFirst.mockResolvedValue({ id: "ws-agency" });
  h.capEventFindUnique.mockResolvedValue(null);
});

const paidEvent = (overrides: Record<string, unknown> = {}) =>
  service.handleSubscriptionWebhook({
    eventName: "payment.captured",
    workspaceId: "ws-p",
    providerReference: "pay_1",
    idempotencyKey: "k1",
    ...overrides,
  });

// ── Provider routing: one-time ORDER, never a subscription ───────────────────

describe("RCCF-73 — provider routing (one-time vs recurring)", () => {
  it("Partner Solo checkout creates a single ₹4,999 ORDER — never a subscription", async () => {
    const res = await provider.createCheckout({ planCode: "partner_solo", accountId: "ws-a", price: 4999, currency: "INR" });
    expect(res.success).toBe(true);
    expect(h.subsCreate).not.toHaveBeenCalled();
    expect(h.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 499900, currency: "INR", notes: expect.objectContaining({ planCode: "partner_solo", accountId: "ws-a" }) }));
    expect(res.subscriptionId).toBeUndefined();
  });

  it("Partner Scale checkout creates a single ₹14,999 ORDER — never a subscription", async () => {
    const res = await provider.createCheckout({ planCode: "partner_scale", accountId: "ws-a", price: 14999, currency: "INR" });
    expect(res.success).toBe(true);
    expect(h.subsCreate).not.toHaveBeenCalled();
    expect(h.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({ amount: 1499900 }));
  });

  it("a STALE DB subscription plan id cannot resurrect recurring billing for a one-time plan", async () => {
    await provider.createCheckout({ planCode: "partner_solo", accountId: "ws-a", price: 4999, currency: "INR", razorpayPlanId: "plan_stale_legacy" });
    expect(h.subsCreate).not.toHaveBeenCalled();
    expect(h.ordersCreate).toHaveBeenCalled();
  });

  it("Creator Growth keeps its RECURRING subscription contract (regression)", async () => {
    const res = await provider.createCheckout({ planCode: "creator_grow", accountId: "ws-c", razorpayPlanId: "plan_TLTGQBU1EXkseF" });
    expect(res.success).toBe(true);
    expect(h.subsCreate).toHaveBeenCalledWith(expect.objectContaining({ plan_id: "plan_TLTGQBU1EXkseF", total_count: 12 }));
    expect(h.ordersCreate).not.toHaveBeenCalled();
  });

  it("capacity-addon orders are priced server-side (unit × quantity) and carry the purpose tag", async () => {
    const res = await provider.createCapacityAddonOrder({ agencyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", quantity: 2, unitPriceInr: 2000 });
    expect(res.success).toBe(true);
    expect(res.amountPaise).toBe(400000);
    expect(h.ordersCreate).toHaveBeenCalledWith(expect.objectContaining({
      amount: 400000,
      notes: expect.objectContaining({ purpose: "partner_capacity_addon", agencyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", quantity: "2" }),
    }));
  });

  it("capacity-addon order rejects an invalid quantity before any provider call", async () => {
    const res = await provider.createCapacityAddonOrder({ agencyId: "a", quantity: 0, unitPriceInr: 2000 });
    expect(res.success).toBe(false);
    expect(h.ordersCreate).not.toHaveBeenCalled();
  });
});

// ── Webhook activation: price integrity + lifecycle ──────────────────────────

describe("RCCF-73 — Partner Solo one-time activation (price integrity)", () => {
  it("₹4,999 capture → ACTIVE, renewsAt never set, PAID invoice minted once", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_solo", amount: 4999 });
    expect(result.handled).toBe(true);
    expect(result.status).toBe("ACTIVE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-p", expect.objectContaining({ status: "ACTIVE", planId: "plan-partner_solo", renewsAt: null }));
    expect(h.createInvoice).toHaveBeenCalledTimes(1);
  });

  it("₹4,998 capture → DENIED (no activation, no invoice, durable ignored-event)", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_solo", amount: 4998, idempotencyKey: "k-low" });
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
    expect(h.createEvent).toHaveBeenCalledWith(expect.objectContaining({ payload: expect.objectContaining({ note: "one_time_amount_mismatch:no_activation" }) }));
  });

  it("₹5,000 capture → DENIED", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_solo", amount: 5000, idempotencyKey: "k-high" });
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });
});

describe("RCCF-73 — Partner Scale one-time activation (price integrity)", () => {
  it("₹14,999 capture → ACTIVE exactly once", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_scale", amount: 14999 });
    expect(result.status).toBe("ACTIVE");
    expect(h.createInvoice).toHaveBeenCalledTimes(1);
  });

  it("₹14,998 capture → DENIED", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_scale", amount: 14998, idempotencyKey: "k-s-low" });
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("₹15,000 capture → DENIED", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_scale", amount: 15000, idempotencyKey: "k-s-high" });
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("duplicate delivery of the same payment → handled:false, zero mutation", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    h.isDuplicate.mockResolvedValue(true);
    const result = await paidEvent({ planCode: "partner_solo", amount: 4999, idempotencyKey: "k-dup" });
    expect(result.handled).toBe(false);
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("failed/zero-amount capture grants nothing (payment guard unchanged)", async () => {
    h.findSubByWorkspace.mockResolvedValue(null);
    const result = await paidEvent({ planCode: "partner_solo", amount: 0, idempotencyKey: "k-zero" });
    expect(result.status).toBeNull();
    expect(h.upsertSub).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });
});

describe("RCCF-73 — one-time purchase state machine (no renewal lifecycle)", () => {
  it("re-checking out an ALREADY-ACTIVE one-time plan is refused (no second charge)", async () => {
    h.findSubWithPlan.mockResolvedValue({ plan: { code: "partner_solo" }, status: "ACTIVE" });
    const res = await service.changePlan("ws-p", "partner_solo");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already active|does not renew/i);
  });

  it("upgrading Solo → Scale while Solo is ACTIVE is allowed (own one-time checkout)", async () => {
    h.findSubWithPlan.mockResolvedValue({ plan: { code: "partner_solo" }, status: "ACTIVE" });
    const res = await service.changePlan("ws-p", "partner_scale");
    expect(res.success).toBe(true);
  });

  it("Creator renewals keep their existing renewsAt extension semantics (regression)", async () => {
    h.findSubByWorkspace.mockResolvedValue({ id: "sub-c", planId: "plan-creator_grow", status: "ACTIVE" });
    const renewsAt = new Date(Date.now() + 30 * 86400000);
    const result = await service.handleSubscriptionWebhook({
      eventName: "subscription.charged",
      workspaceId: "ws-c",
      planCode: "creator_grow",
      providerReference: "pay_renew_c",
      idempotencyKey: "k-renew-c",
      renewsAt,
      amount: 999,
    });
    expect(result.status).toBe("ACTIVE");
    expect(h.upsertSub).toHaveBeenCalledWith("ws-c", expect.objectContaining({ status: "ACTIVE", renewsAt }));
    expect(h.createInvoice).toHaveBeenCalledWith(expect.objectContaining({ amount: 999 }), expect.anything());
  });
});

// ── Additional-client capacity: payment-gated grant ──────────────────────────

describe("RCCF-73 — additional-client capacity purchase (webhook-gated)", () => {
  const handler = async (amountPaise: number, notesOverride?: Record<string, string>) => {
    const { partnerCapacityPurchase } = await import("@/modules/billing/application/partner-capacity-purchase");
    return partnerCapacityPurchase.handleCapture({
      paymentId: "pay_cap_1",
      orderId: "order_cap_1",
      capturedAmountPaise: amountPaise,
      notes: notesOverride ?? { purpose: "partner_capacity_addon", agencyId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", quantity: "2" },
    });
  };

  it("valid ₹2,000 × 2 capture → +2 capacity ACTIVE, PAID invoice, dedupe event (exactly once)", async () => {
    const res = await handler(400000);
    expect(res.handled).toBe(true);
    expect(res.granted).toBe(true);
    expect(h.addonCreateTx).toHaveBeenCalledWith({ data: expect.objectContaining({ quantity: 2, unitPriceInr: 2000, status: "ACTIVE", idempotencyKey: "capacity_pay_cap_1" }) });
    expect(h.createInvoice).toHaveBeenCalledWith({ data: expect.objectContaining({ planCode: "partner_capacity_addon", amount: 4000, status: "PAID", providerReference: "pay_cap_1" }) });
    expect(h.eventCreateTx).toHaveBeenCalledWith({ data: expect.objectContaining({ type: "PARTNER_CAPACITY_PURCHASED", idempotencyKey: "partner_capacity_captured_pay_cap_1" }) });
  });

  it("₹1,999-equivalent capture → DENIED, no capacity, rejection recorded", async () => {
    const res = await handler(399800);
    expect(res.granted).toBe(false);
    expect(res.reason).toBe("amount_mismatch");
    expect(h.addonCreateTx).not.toHaveBeenCalled();
    expect(h.createInvoice).not.toHaveBeenCalled();
  });

  it("₹2,001-per-unit capture → DENIED, no capacity", async () => {
    const res = await handler(400200);
    expect(res.granted).toBe(false);
    expect(res.reason).toBe("amount_mismatch");
    expect(h.addonCreateTx).not.toHaveBeenCalled();
  });

  it("duplicate capture of the same payment → no-op (+0 additional capacity)", async () => {
    h.capEventFindUnique.mockResolvedValue({ id: "existing" });
    const res = await handler(400000);
    expect(res.handled).toBe(true);
    expect(res.granted).toBe(false);
    expect(res.reason).toBe("already_captured");
    expect(h.addonCreateTx).not.toHaveBeenCalled();
  });

  it("concurrent duplicate losing the unique race rolls back to a safe no-op", async () => {
    const mod = (await import("@/lib/prisma")) as unknown as { prisma: { $transaction: (cb: unknown) => Promise<unknown> } };
    mod.prisma.$transaction = (async () => {
      throw Object.assign(new Error("unique constraint"), { code: "P2002" });
    }) as typeof mod.prisma.$transaction;
    const res = await handler(400000);
    expect(res.granted).toBe(false);
    expect(res.reason).toBe("already_captured");
    // restore the default transaction for subsequent tests
    mod.prisma.$transaction = prismaMock.prisma.$transaction;
  });

  it("unknown/inactive agency in the order notes → rejected, zero mutation", async () => {
    h.agencyFindUnique.mockResolvedValue(null);
    const res = await handler(400000, { purpose: "partner_capacity_addon", agencyId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", quantity: "2" });
    expect(res.granted).toBe(false);
    expect(h.addonCreateTx).not.toHaveBeenCalled();
  });

  it("tampered/garbage notes → rejected without touching anything", async () => {
    const res = await handler(2000, { purpose: "partner_capacity_addon" });
    expect(res.granted).toBe(false);
    expect(res.reason).toBe("invalid_order_notes");
  });

  it("the constant is ₹2,000 and the module derives amounts ONLY from it", () => {
    expect(PARTNER_ADDON_UNIT_PRICE_INR).toBe(2000);
    const src = readFileSync(join(process.cwd(), "src/modules/billing/application/partner-capacity-purchase.ts"), "utf8");
    expect(src).toMatch(/PARTNER_ADDON_UNIT_PRICE_INR/);
    expect(src).not.toMatch(/1499/);
  });

  it("legacy un-gated grant is gone — no direct ACTIVE addon creation outside the gated handler", () => {
    const actions = readFileSync(join(process.cwd(), "src/actions/partner.actions.ts"), "utf8");
    expect(actions).not.toMatch(/addAgencyCapacityAction/);
    expect(actions).toMatch(/createAdditionalClientCheckoutAction/);
    expect(actions).not.toMatch(/agencyCapacityAddon\.upsert/);
  });
});

// ── Commission eligibility gate (free partner = 0) ───────────────────────────

describe("RCCF-73 — commission eligibility gate", () => {
  it("predicate: paid partner plans eligible; partner_free NEVER eligible", async () => {
    const { isCommissionEligiblePartnerPlan } = await import("@/lib/commission/runtime");
    expect(isCommissionEligiblePartnerPlan("partner_solo")).toBe(true);
    expect(isCommissionEligiblePartnerPlan("partner_scale")).toBe(true);
    expect(isCommissionEligiblePartnerPlan("partner_enterprise")).toBe(true);
    expect(isCommissionEligiblePartnerPlan("partner_free")).toBe(false);
    expect(isCommissionEligiblePartnerPlan("creator_grow")).toBe(false);
    expect(isCommissionEligiblePartnerPlan(null)).toBe(false);
  });

  it("resolver: FREE/TRIALING partner → ineligible; ACTIVE paid partner → eligible", async () => {
    const { resolvePartnerCommissionEligibility } = await import("@/lib/commission/runtime");
    const accountFindUnique = prismaMock.prisma.billingAccount.findUnique as ReturnType<typeof vi.fn>;
    const subFindMany = prismaMock.prisma.billingSubscription.findMany as ReturnType<typeof vi.fn>;
    accountFindUnique.mockResolvedValue({ id: "acc-1" });
    subFindMany.mockResolvedValue([{ status: "TRIALING", plan: { code: "partner_free", family: "partner" } }]);
    expect((await resolvePartnerCommissionEligibility("p1")).eligible).toBe(false);

    // A TRIALING PAID plan has not been paid yet → not eligible.
    subFindMany.mockResolvedValue([{ status: "TRIALING", plan: { code: "partner_solo", family: "partner" } }]);
    expect((await resolvePartnerCommissionEligibility("p2")).eligible).toBe(false);

    // ACTIVE paid partner → eligible.
    subFindMany.mockResolvedValue([{ status: "ACTIVE", plan: { code: "partner_scale", family: "partner" } }]);
    expect((await resolvePartnerCommissionEligibility("p3")).eligible).toBe(true);

    // No billing account at all → conservative ineligible.
    accountFindUnique.mockResolvedValueOnce(null);
    expect((await resolvePartnerCommissionEligibility("p4")).eligible).toBe(false);

    // The recording path consults this gate BEFORE any ledger write.
    const runtimeSrc = readFileSync(join(process.cwd(), "src/lib/commission/runtime.ts"), "utf8");
    expect(runtimeSrc).toMatch(/resolvePartnerCommissionEligibility\(partnerId\)/);
    expect(runtimeSrc).toMatch(/skipped: "free-partner"/);
    const gateIdx = runtimeSrc.indexOf("resolvePartnerCommissionEligibility(partnerId)");
    const ledgerIdx = runtimeSrc.indexOf("commissionEntry.create", gateIdx);
    expect(gateIdx).toBeGreaterThan(-1);
    expect(ledgerIdx).toBeGreaterThan(gateIdx);
  });
});

// ── F2 — provisioned clients carry a real Creator BillingSubscription ────────

describe("RCCF-73 — F2 provisioning truth (committed fix pinned)", () => {
  const provSrc = () => readFileSync(join(process.cwd(), "src/modules/provisioning/application/provisioning-service.ts"), "utf8");

  it("agency-provisioned clients receive a REAL TRIALING Creator BillingSubscription inside the provisioning transaction", () => {
    const src = provSrc();
    expect(src).toMatch(/input\.creatorPlan\?\.planId/);
    expect(src).toMatch(/status:\s*"TRIALING"/);
    expect(src).toMatch(/getTrialEndDate\(new Date\(\),\s*15\)/);
    expect(src).toMatch(/upsertSubscription\(\s*ws\.id/);
    const txIdx = src.indexOf("prisma.$transaction(async (tx)");
    const trialIdx = src.indexOf('status: "TRIALING"');
    expect(txIdx).toBeGreaterThan(-1);
    expect(trialIdx).toBeGreaterThan(txIdx);
  });

  it("provisioned client plans are validated against the agency minimum (no phantom Launch)", () => {
    const actionsSrc = readFileSync(join(process.cwd(), "src/actions/super-admin-provision.actions.ts"), "utf8");
    expect(actionsSrc).toMatch(/validateAgencyCreatorPlanCode/);
    expect(actionsSrc).toMatch(/creatorPlan/);
  });

  it("commission consumes only PAID invoices (unpaid/trialing clients generate none)", () => {
    const svcSrc = readFileSync(join(process.cwd(), "src/modules/billing/application/service.ts"), "utf8");
    expect(svcSrc).toMatch(/validPaidAmount !== null/);
    expect(svcSrc).toMatch(/recordSubscriptionCommission/);
    expect(svcSrc.indexOf("validPaidAmount === null")).toBeLessThan(svcSrc.indexOf("recordSubscriptionCommission"));
  });
});

// ── Webhook security surface (unchanged + purpose routing) ───────────────────

describe("RCCF-73 — webhook security surface", () => {
  const routeSrc = () => readFileSync(join(process.cwd(), "src/app/api/webhooks/razorpay/route.ts"), "utf8");

  it("signature verification still guards EVERY event before any parsing/mutation", () => {
    const src = routeSrc();
    expect(src).toMatch(/x-razorpay-signature/);
    expect(src).toMatch(/timingSafeEqual/);
    expect(src.indexOf("timingSafeEqual")).toBeLessThan(src.indexOf("JSON.parse"));
  });

  it("capacity purchases route BEFORE generic subscription handling (both captured and order.paid)", () => {
    const src = routeSrc();
    const idxPurpose = src.indexOf('purpose === "partner_capacity_addon"');
    const idxSubscription = src.indexOf("SUBSCRIPTION_EVENTS.has(event)");
    expect(idxPurpose).toBeGreaterThan(-1);
    expect(idxSubscription).toBeGreaterThan(idxPurpose);
    expect(src).toMatch(/order\.paid/);
  });

  it("idempotency still keys on the PROVIDER PAYMENT id (multi-event collapse preserved)", async () => {
    const { buildRazorpayIdempotencyKey } = await import("@/modules/billing/domain/webhook");
    const payload = { payload: { payment: { entity: { id: "pay_same" } } } };
    expect(buildRazorpayIdempotencyKey(payload as never, "order.paid", "x")).toBe("razorpay_payment_pay_same");
    expect(buildRazorpayIdempotencyKey(payload as never, "payment.captured", "y")).toBe("razorpay_payment_pay_same");
  });
});

// ── Pricing Center + Super Admin regression ──────────────────────────────────

describe("RCCF-73 — Super Admin pricing center (family/billing-form aware)", () => {
  it("one-time plans are excluded from recurring Razorpay provisioning", () => {
    const src = readFileSync(join(process.cwd(), "src/actions/super-admin-pricing.actions.ts"), "utf8");
    expect(src).toMatch(/newPrice > 0 && !isManual && priceChanged && !isOneTimePlan\(input\.code\)/);
    expect(src).toMatch(/from "@\/config\/commerce\/plans"/);
  });

  it("Creator catalog invariants untouched: Growth ₹999/month w/ live contract, Scale ₹1,999/month", () => {
    const grow = getCommercePlan("creator_grow")!;
    const scale = getCommercePlan("creator_scale")!;
    expect(grow.price).toBe(999);
    expect(grow.cycle).toBe("monthly");
    expect(grow.billingForm).toBeUndefined();
    expect(grow.razorpayPlanId).toBe("plan_TLTGQBU1EXkseF");
    expect(scale.price).toBe(1999);
    expect(scale.cycle).toBe("monthly");
    expect(scale.billingForm).toBeUndefined();
    expect(COMMERCE_PLANS.filter((p) => p.family === "creator")).toHaveLength(4);
  });
});
