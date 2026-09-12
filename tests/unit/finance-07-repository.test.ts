/**
 * FINANCE-07 — Repository paise persistence (P3)
 *
 * Verifies billingRepository.createInvoice persists amountPaise as exact
 * paise via BigInt, preserving amount compatibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  invoiceCreate: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingInvoice: { create: h.invoiceCreate },
    workspace: { findUnique: vi.fn() },
    billingAccount: { findUnique: vi.fn(), create: vi.fn() },
    billingPlan: { findUnique: vi.fn() },
    billingPlanFeature: { findMany: vi.fn() },
    billingSubscription: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
    billingEvent: { create: vi.fn(), findUnique: vi.fn() },
  },
}));

import { billingRepository } from "@/modules/billing/infrastructure/repository";

beforeEach(() => vi.clearAllMocks());

async function createAndCapture(args: { amount: number; amountPaise?: number }) {
  h.invoiceCreate.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
    id: "inv-1",
    ...data,
  }));
  const result = await billingRepository.createInvoice({
    workspaceId: "ws-1",
    accountId: "acc-1",
    planCode: "partner_solo",
    amount: args.amount,
    status: "PAID",
    providerReference: "pay_1",
    ...(args.amountPaise !== undefined ? { amountPaise: args.amountPaise } : {}),
  });
  const data = h.invoiceCreate.mock.calls[0]?.[0]?.data as Record<string, unknown>;
  return { data, result };
}

describe("FINANCE-07 — billingRepository.createInvoice paise", () => {
  it("monthly Partner Solo ₹4,999 → amountPaise 499900", async () => {
    const { data } = await createAndCapture({ amount: 4999 });
    expect(data.amount).toBe(4999);
    expect(data.amountPaise).toBe(499900);
  });

  it("yearly Partner Solo ₹49,990 → amountPaise 4999000", async () => {
    const { data } = await createAndCapture({ amount: 49990 });
    expect(data.amount).toBe(49990);
    expect(data.amountPaise).toBe(4999000);
  });

  it("preserves rupee amount compatibility", async () => {
    const { data } = await createAndCapture({ amount: 14999 });
    expect(data.amount).toBe(14999);
    expect(data.amountPaise).toBe(1499900);
    expect(typeof data.amount).toBe("number");
    expect(typeof data.amountPaise).toBe("number");
  });

  it("19.99 → 1999 paise without float drift", async () => {
    const { data } = await createAndCapture({ amount: 19.99 });
    expect(data.amountPaise).toBe(1999);
  });

  it("0.01 → 1 paise", async () => {
    const { data } = await createAndCapture({ amount: 0.01 });
    expect(data.amountPaise).toBe(1);
  });

  it("explicit amountPaise honored (capacity authoritative)", async () => {
    const { data } = await createAndCapture({ amount: 4000, amountPaise: 400000 });
    expect(data.amountPaise).toBe(400000);
    expect(data.amount).toBe(4000);
  });

  it("invalid explicit amountPaise falls back to computed", async () => {
    const { data } = await createAndCapture({ amount: 4999, amountPaise: NaN as unknown as number });
    expect(data.amountPaise).toBe(499900);
  });
});
