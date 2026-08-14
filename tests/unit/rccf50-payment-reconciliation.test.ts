import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const invoices: Array<Record<string, unknown>> = [];
  const commissionRows: Array<Record<string, unknown>> = [];
  const events: Array<Record<string, unknown>> = [];
  const required: Record<string, unknown> | null = null;
  return {
    invoices, commissionRows, events, required,
    mockRequired: vi.fn(),
    mockSubFind: vi.fn(),
    mockCreateInvoice: vi.fn(),
    mockRecordCommission: vi.fn(),
    mockCreateEvent: vi.fn(),
    mockGetServerSession: vi.fn(),
    reset: () => { invoices.length = 0; commissionRows.length = 0; events.length = 0; },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingEvent: {
      findUnique: async ({ where }: { where: { idempotencyKey: string } }) => {
        if (where.idempotencyKey.startsWith("reconcile_required_")) return h.mockRequired();
        if (where.idempotencyKey.startsWith("reconcile_resolved_")) return h.events.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null;
        return h.events.find((e) => e.idempotencyKey === where.idempotencyKey) ?? null;
      },
    },
    billingInvoice: {
      findFirst: async ({ where }: { where: { providerReference?: string } }) =>
        h.invoices.find((i) => i.providerReference === where.providerReference) ?? null,
    },
    workspace: { findUnique: async () => ({ tenantId: "t1" }) },
    commissionEntry: { create: async ({ data }: { data: Record<string, unknown> }) => { const r = { id: "ce-1", ...data }; h.commissionRows.push(r); return r; } },
    $transaction: async (cb: (tx: unknown) => unknown) => cb({}),
  },
}));
vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    isDuplicateEvent: vi.fn().mockResolvedValue(false),
    findSubscriptionByWorkspaceId: h.mockSubFind,
    createInvoice: h.mockCreateInvoice,
    createEvent: h.mockCreateEvent,
    findPlanByCode: vi.fn(),
    findSubscriptionWithPlan: vi.fn(),
    upsertSubscription: vi.fn(),
  },
}));
vi.mock("@/lib/commission/runtime", () => ({ recordSubscriptionCommission: h.mockRecordCommission }));
vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({ razorpayProvider: { createCheckout: vi.fn() } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/lib/commission", () => ({ commissionService: { processCommission: vi.fn() } }));
vi.mock("@/lib/partners", () => ({ partnerService: { get: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { BillingService } from "@/modules/billing/application/service";
import { adminReconcilePayment } from "@/actions/super-admin-billing.actions";

const billingService = new BillingService();

function requiredEvent(overrides: Record<string, unknown> = {}) {
  return { workspaceId: "ws-1", accountId: "acc-1", payload: { paymentId: "pay_1", planCode: "creator_grow", amount: 999, eventName: "payment.captured" }, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockRequired.mockResolvedValue(null);
  h.mockSubFind.mockResolvedValue({ id: "sub-1" });
  h.mockCreateInvoice.mockImplementation(async (data: Record<string, unknown>) => { const r = { id: `inv-${h.invoices.length + 1}`, ...data }; h.invoices.push(r); return r; });
  h.mockRecordCommission.mockResolvedValue({ success: true });
  h.mockCreateEvent.mockImplementation(async (data: Record<string, unknown>) => {
    if (data.idempotencyKey && h.events.some((e) => e.idempotencyKey === data.idempotencyKey)) throw { code: "P2002" };
    const r = { id: `evt-${h.events.length + 1}`, ...data };
    h.events.push(r);
    return r;
  });
  h.mockGetServerSession.mockResolvedValue({ user: { role: "SUPER_ADMIN", id: "sa" } });
});

describe("RCCF-50 — failed-webhook reconciliation", () => {
  it("repairs a missing invoice+commission for a payment with a RECONCILIATION_REQUIRED event", async () => {
    h.mockRequired.mockResolvedValue(requiredEvent());

    const res = await billingService.reconcileFailedPayment("pay_1");

    expect(res).toEqual({ handled: true, repaired: true });
    expect(h.mockCreateInvoice).toHaveBeenCalledWith(expect.objectContaining({ providerReference: "pay_1", amount: 999, planCode: "creator_grow", status: "PAID" }), expect.anything());
    expect(h.mockRecordCommission).toHaveBeenCalledWith(expect.objectContaining({ workspaceId: "ws-1", invoiceId: h.invoices[0].id, amount: 999 }), expect.anything());
    expect(h.events.some((e) => e.type === "RECONCILIATION_RESOLVED")).toBe(true);
  });

  it("is idempotent — an existing invoice means no duplicate repair", async () => {
    h.mockRequired.mockResolvedValue(requiredEvent());
    h.invoices.push({ id: "inv-existing", providerReference: "pay_1", amount: 999 });

    const res = await billingService.reconcileFailedPayment("pay_1");

    expect(res).toEqual({ handled: true, repaired: false });
    expect(h.mockCreateInvoice).not.toHaveBeenCalled();
    expect(h.mockRecordCommission).not.toHaveBeenCalled();
  });

  it("unknown payment (no required event) is a safe no-op", async () => {
    const res = await billingService.reconcileFailedPayment("unknown_pay");
    expect(res.handled).toBe(false);
    expect(res.error).toMatch(/no reconciliation required/i);
    expect(h.mockCreateInvoice).not.toHaveBeenCalled();
  });

  it("refuses to fabricate when the recorded payload cannot be safely reconstructed", async () => {
    h.mockRequired.mockResolvedValue(requiredEvent({ payload: { paymentId: "pay_1", planCode: "creator_grow", amount: 0 } }));

    const res = await billingService.reconcileFailedPayment("pay_1");

    expect(res.handled).toBe(false);
    expect(res.error).toMatch(/cannot safely reconstruct/i);
    expect(h.mockCreateInvoice).not.toHaveBeenCalled();
    expect(h.mockRecordCommission).not.toHaveBeenCalled();
  });

  it("repeated reconciliation produces the same state (no duplicate invoice/commission)", async () => {
    h.mockRequired.mockResolvedValue(requiredEvent());
    await billingService.reconcileFailedPayment("pay_1");
    await billingService.reconcileFailedPayment("pay_1");

    expect(h.invoices.filter((i) => i.providerReference === "pay_1").length).toBe(1);
    expect(h.events.filter((e) => e.type === "RECONCILIATION_RESOLVED" && e.payload?.paymentId === "pay_1").length).toBe(1);
  });
});

describe("RCCF-50 — Super Admin reconciliation authorization", () => {
  it("SUPER_ADMIN may trigger reconciliation", async () => {
    h.mockRequired.mockResolvedValue(requiredEvent());
    const res = await adminReconcilePayment("pay_1");
    expect(res.success).toBe(true);
  });

  it("CREATOR is denied (zero reconciliation)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { role: "CREATOR", id: "c" } });
    const res = await adminReconcilePayment("pay_1");
    expect(res.success).toBe(false);
    expect(h.mockCreateInvoice).not.toHaveBeenCalled();
  });
});
