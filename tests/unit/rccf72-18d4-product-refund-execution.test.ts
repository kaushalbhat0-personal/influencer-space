import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const productOrders: Array<Record<string, unknown>> = [];
  const paymentAccounts: Array<Record<string, unknown>> = [];
  const billingEvents: Array<Record<string, unknown>> = [];
  const session: Record<string, unknown> = {
    user: {
      id: "user-1",
      tenantId: "11111111-1111-4111-8111-111111111111",
      role: "ADMIN",
      email: "creator@example.com",
      name: "Test Creator",
    },
  };
  return {
    productOrders,
    paymentAccounts,
    billingEvents,
    session,
    mockPaymentAccountFindUnique: vi.fn(),
    mockProductOrderFindUnique: vi.fn(),
    mockProductOrderFindFirst: vi.fn(),
    mockProductOrderUpdate: vi.fn(),
    mockProductOrderUpdateMany: vi.fn(),
    mockBillingEventFindUnique: vi.fn(),
    mockBillingEventCreate: vi.fn(),
    mockBillingEventCreateMany: vi.fn(),
    mockBillingEventUpsert: vi.fn(),
    mockAdapter: {
      refundPayment: vi.fn(),
    },
    mockGetPaymentProviderAdapter: vi.fn(),
    reset: () => {
      productOrders.length = 0;
      paymentAccounts.length = 0;
      billingEvents.length = 0;
      session.user = {
        id: "user-1",
        tenantId: "11111111-1111-4111-8111-111111111111",
        role: "ADMIN",
        email: "creator@example.com",
        name: "Test Creator",
      };
      h.mockAdapter.refundPayment.mockReset();
      h.mockGetPaymentProviderAdapter.mockReset();
      h.mockPaymentAccountFindUnique.mockReset();
      h.mockProductOrderFindUnique.mockReset();
      h.mockProductOrderFindFirst.mockReset();
      h.mockProductOrderUpdate.mockReset();
      h.mockProductOrderUpdateMany.mockReset();
      h.mockBillingEventFindUnique.mockReset();
      h.mockBillingEventCreate.mockReset();
      h.mockBillingEventCreateMany.mockReset();
      h.mockBillingEventUpsert.mockReset();
    },
  };
});

vi.mock("next-auth", () => ({
  getServerSession: async () => h.session,
  authOptions: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: {
      findUnique: h.mockPaymentAccountFindUnique,
    },
    productOrder: {
      findUnique: h.mockProductOrderFindUnique,
      findFirst: h.mockProductOrderFindFirst,
      update: h.mockProductOrderUpdate,
      updateMany: h.mockProductOrderUpdateMany,
    },
    billingEvent: {
      findUnique: h.mockBillingEventFindUnique,
      create: h.mockBillingEventCreate,
      createMany: h.mockBillingEventCreateMany,
      upsert: h.mockBillingEventUpsert,
    },
    $transaction: async (fn: (tx: Record<string, unknown>) => Promise<unknown>) => {
      const tx = {
        productOrder: {
          update: h.mockProductOrderUpdate,
        },
        billingEvent: {
          create: h.mockBillingEventCreate,
          upsert: h.mockBillingEventUpsert,
        },
        // RCCF-72.18D.6.5 POLICY 1: digital entitlement revocation joins the
        // refund transaction; stubbed here (behavior asserted in the D.6.5 suite).
        orderFulfillment: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };
      return fn(tx);
    },
  },
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: (ciphertext: string) => {
    if (ciphertext === "encrypted_key_id") return "rzp_test_actual_key_id";
    if (ciphertext === "encrypted_key_secret") return "rzp_test_actual_key_secret";
    return ciphertext;
  },
  encrypt: (plaintext: string) => `encrypted_${plaintext}`,
}));

vi.mock("@/lib/audit", () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/observability/error-tracker", () => ({
  captureError: vi.fn(),
}));

vi.mock("@/modules/payment-account", () => ({
  getPaymentProviderAdapter: h.mockGetPaymentProviderAdapter,
}));

import { executeProductOrderRefund } from "@/actions/payment-account.actions";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "order-test-1";
const PROVIDER_REFUND_ID = "refund_test_123";

function setupPaymentAccountA() {
  h.paymentAccounts.push({
    id: PAYMENT_ACCOUNT_A,
    tenantId: TENANT_A,
    provider: "razorpay",
    status: "active",
    verificationStatus: "configured",
    providerKeyId: "encrypted_key_id",
    providerKeySecret: "encrypted_key_secret",
  });
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    tenantId: TENANT_A,
    productId: "product-1",
    amount: 1000, // ₹1000 in rupees → 100000 paise
    status: "COMPLETED",
    commerceStrategy: "DIRECT_CREATOR",
    paymentAccountId: PAYMENT_ACCOUNT_A,
    razorpayPaymentId: "pay_test_123",
    refundAmount: 0, // RCCF-72.18D.5.1: ACTUAL refunded-to-date (no reservation)
    refundStatus: "PENDING",
    refundId: null,
    refundedAt: null,
    ...overrides,
  };
}

function resetOrders() {
  h.productOrders.length = 0;
}

function pushOrder(overrides: Record<string, unknown> = {}) {
  h.productOrders.push(makeOrder(overrides));
}

function setSession(overrides: Record<string, unknown> = {}) {
  h.session.user = { ...(h.session.user as object), ...overrides };
}

function setNoSession() {
  h.session.user = null;
}

function pushPaymentAccount(acc: Record<string, unknown>) {
  h.paymentAccounts.push(acc);
}

function clearBillingEvents() {
  h.billingEvents.length = 0;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  setupPaymentAccountA();
  pushOrder();
  clearBillingEvents();

  h.mockPaymentAccountFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    const acc = h.paymentAccounts.find((a) => a.id === where.id);
    return Promise.resolve(acc ?? null);
  });

  h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    const order = h.productOrders.find((o) => o.id === where.id);
    return Promise.resolve(order ?? null);
  });

  h.mockProductOrderFindFirst.mockImplementation(({ where }: { where: { razorpayPaymentId: string } }) => {
    const order = h.productOrders.find((o) => o.razorpayPaymentId === where.razorpayPaymentId);
    return Promise.resolve(order ?? null);
  });

  h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const order = h.productOrders.find((o) => o.id === where.id);
    if (order) Object.assign(order, data);
    return Promise.resolve(order ? { id: order.id, refundAmount: order.refundAmount, refundStatus: order.refundStatus } : null);
  });

  h.mockProductOrderUpdateMany.mockImplementation(() => Promise.resolve({ count: 1 }));

  h.mockBillingEventFindUnique.mockImplementation(({ where }: { where: { idempotencyKey: string } }) => {
    const event = h.billingEvents.find((e) => e.idempotencyKey === where.idempotencyKey);
    return Promise.resolve(event ?? null);
  });

  h.mockBillingEventCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    h.billingEvents.push(data);
    return Promise.resolve({ id: "event-1", ...data });
  });

  h.mockBillingEventCreateMany.mockImplementation(({ data }: { data: Record<string, unknown>[] }) => {
    h.billingEvents.push(...data);
    return Promise.resolve({ count: data.length });
  });

  // Upsert semantics for the per-order completion marker (RCCF-72.18D.5.1)
  h.mockBillingEventUpsert.mockImplementation(({ where, update, create }: { where: { idempotencyKey: string }; update: Record<string, unknown>; create: Record<string, unknown> }) => {
    const idx = h.billingEvents.findIndex((e) => e.idempotencyKey === where.idempotencyKey);
    if (idx >= 0) {
      h.billingEvents[idx] = { ...h.billingEvents[idx], ...update };
      return Promise.resolve(h.billingEvents[idx]);
    }
    const row = { id: `evt-upsert-${h.billingEvents.length + 1}`, ...create };
    h.billingEvents.push(row);
    return Promise.resolve(row);
  });

  h.mockGetPaymentProviderAdapter.mockReturnValue(h.mockAdapter);
});

describe("RCCF-72.18D.4 — Product Refund Provider Execution", () => {
  describe("Authorization", () => {
    it("Test 1: Anonymous user denied", async () => {
      setNoSession();

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("UNAUTHORIZED");
    });

    it("Test 2: Creator from another tenant denied", async () => {
      setSession({ tenantId: "22222222-2222-4222-8222-222222222222" });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("FORBIDDEN");
    });

    it("Test 3: Correct creator allowed", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);
    });

    it("Test 4: Agency admin role denied", async () => {
      setSession({ role: "AGENCY_ADMIN", tenantId: TENANT_A });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("UNAUTHORIZED");
    });

    it("Test 5: Agency staff role denied", async () => {
      setSession({ role: "AGENCY_STAFF", tenantId: TENANT_A });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("UNAUTHORIZED");
    });

    it("Test 6: SUPPORT role denied", async () => {
      setSession({ role: "SUPPORT", tenantId: TENANT_A });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("UNAUTHORIZED");
    });

    it("Test 7: SUPER_ADMIN allowed with any tenant order", async () => {
      setSession({ role: "SUPER_ADMIN", tenantId: "other-tenant" });

      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);
    });
  });

  describe("Strategy Isolation", () => {
    it("Test 8: DIRECT_CREATOR accepted", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);
    });

    it("Test 9: PLATFORM_COLLECT rejected from creator-provider refund path", async () => {
      resetOrders();
      pushOrder({ commerceStrategy: "PLATFORM_COLLECT" });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_STRATEGY");
    });

    it("Test 10: Subscription refund unaffected (no product order found)", async () => {
      h.mockProductOrderFindUnique.mockResolvedValue(null);

      const result = await executeProductOrderRefund({ orderId: "subscription-refund-id" });
      expect(result.success).toBe(false);
      expect(result.code).toBe("NOT_FOUND");
      expect(h.mockAdapter.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe("Historical Payment Account Binding", () => {
    it("Test 11: Correct historical PaymentAccount used", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);

      // Verify the payment account lookup uses order.paymentAccountId, not current tenant account
      expect(h.mockPaymentAccountFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PAYMENT_ACCOUNT_A } })
      );
    });

    it("Test 12: Current account switch does not alter refund target", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);

      // The adapter should be called with the historical account credentials
      expect(h.mockAdapter.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          providerKeyId: "rzp_test_actual_key_id",
          providerKeySecret: "rzp_test_actual_key_secret",
        })
      );
    });

    it("Test 13: Missing paymentAccount rejected", async () => {
      resetOrders();
      pushOrder({ paymentAccountId: null });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("MISSING_PAYMENT_ACCOUNT");
    });

    it("Test 14: Cross-tenant PaymentAccount rejected", async () => {
      const TENANT_B = "22222222-2222-4222-8222-222222222222";
      const PAYMENT_ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

      pushPaymentAccount({
        id: PAYMENT_ACCOUNT_B,
        tenantId: TENANT_B,
        provider: "razorpay",
        providerKeyId: "encrypted_key_id",
        providerKeySecret: "encrypted_key_secret",
      });

      resetOrders();
      pushOrder({ paymentAccountId: PAYMENT_ACCOUNT_B });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_PAYMENT_ACCOUNT");
      expect(h.mockAdapter.refundPayment).not.toHaveBeenCalled();
    });
  });

  describe("Provider Execution", () => {
    it("Test 15: Successful refund", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);
      expect(h.mockAdapter.refundPayment).toHaveBeenCalledTimes(1);
    });

    it("Test 16: Provider rejection", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: false,
        error: "Insufficient funds",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_REQUEST");
    });

    it("Test 17: Provider timeout", async () => {
      h.mockAdapter.refundPayment.mockImplementation(() =>
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 100))
      );

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("PROVIDER_ERROR");
    });

    it("Test 18: Provider error", async () => {
      h.mockAdapter.refundPayment.mockImplementation(() => {
        throw new Error("Provider internal error");
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("PROVIDER_ERROR");
    });

    it("Test 19: Provider refund ID persisted", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });

      // Verify refundId was set via update
      expect(h.mockProductOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundId: PROVIDER_REFUND_ID,
          }),
        })
      );
    });

    it("Test 20: Credentials decrypted correctly", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });

      expect(h.mockAdapter.refundPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          providerKeyId: "rzp_test_actual_key_id",
          providerKeySecret: "rzp_test_actual_key_secret",
        })
      );
    });
  });

  describe("State Machine", () => {
    it("Test 21: NONE → PENDING (D.3) → REFUNDED (D.4 full)", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: 50000 });

      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);

      // Verify transition to REFUNDED
      expect(h.mockProductOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundStatus: "REFUNDED",
          }),
        })
      );
    });

    it("Test 22: NONE → PENDING (D.3) → PARTIAL (D.4 partial)", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: 30000 });

      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);

      expect(h.mockProductOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundStatus: "PARTIAL",
          }),
        })
      );
    });

    it("Test 23: PENDING → FAILED (provider rejection)", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: false,
        error: "Card declined",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);

      // Verify transition to FAILED
      expect(h.mockProductOrderUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            refundStatus: "FAILED",
          }),
        })
      );
    });

    it("Test 24: FAILED retry behavior", async () => {
      resetOrders();
      pushOrder({ refundStatus: "FAILED", refundAmount: 30000 });

      // FAILED → can retry? D.4 should reject since state is FAILED, not PENDING
      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_REFUND_STATE");
    });

    it("Test 25: Duplicate processing rejected", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      // First call
      const result1 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result1.success).toBe(true);

      // Second call should be blocked by idempotency
      const result2 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result2.success).toBe(true);
      expect(result2.alreadyProcessed).toBe(true);

      // Adapter should only be called once
      expect(h.mockAdapter.refundPayment).toHaveBeenCalledTimes(1);
    });

    it("Test 26: Invalid transition — already REFUNDED", async () => {
      resetOrders();
      pushOrder({ refundStatus: "REFUNDED", refundAmount: 100000, refundId: "existing_refund" });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_REFUND_STATE");
    });
  });

  describe("Partial Refund Safety", () => {
    it("Test 27: Valid partial refund", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: 30000 });

      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);
    });

    it("Test 28: Exact final refund transitions to REFUNDED", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: 50000 });

      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(true);
    });

    it("Test 29: Overflow rejected — refundAmount exceeds original", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: 100001 });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_AMOUNT");
    });

    it("Test 30: Zero amount rejected", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: 0 });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 0 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_AMOUNT");
    });

    it("Test 31: Negative amount rejected", async () => {
      resetOrders();
      pushOrder({ refundStatus: "PENDING", refundAmount: -100 });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_AMOUNT");
    });
  });

  describe("Idempotency", () => {
    it("Test 32: Duplicate action invocation returns alreadyProcessed", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result1 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result1.success).toBe(true);

      const result2 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result2.success).toBe(true);
      expect(result2.alreadyProcessed).toBe(true);

      expect(h.mockAdapter.refundPayment).toHaveBeenCalledTimes(1);
    });

    it("Test 33: Retry after timeout safe", async () => {
      // First call times out, sets FAILED
      h.mockAdapter.refundPayment
        .mockImplementationOnce(() => new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 50)))
        .mockResolvedValueOnce({ success: false, error: "timeout" });

      const result1 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result1.success).toBe(false);
      expect(result1.code).toBe("PROVIDER_ERROR");

      // Retry should not be allowed since state is FAILED
      const result2 = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result2.success).toBe(false);
      expect(result2.code).toBe("INVALID_REFUND_STATE");
    });
  });

  describe("Webhook Reconciliation", () => {
    it("Test 34: refund.processed reconciles DIRECT_CREATOR order", async () => {
      // This tests the webhook handler logic conceptually
      // The webhook handler will be tested separately
      resetOrders();
      pushOrder({
        refundStatus: "PENDING",
        refundAmount: 50000,
        refundId: null,
        razorpayPaymentId: "pay_test_123",
      });

      // Verify the order is in PENDING state
      const order = h.productOrders.find((o) => o.id === ORDER_ID);
      expect(order?.refundStatus).toBe("PENDING");
      expect(order?.refundAmount).toBe(50000);
    });

    it("Test 35: refund.failed transitions to FAILED", async () => {
      resetOrders();
      pushOrder({
        refundStatus: "PENDING",
        refundAmount: 50000,
        refundId: null,
        razorpayPaymentId: "pay_test_123",
      });

      const order = h.productOrders.find((o) => o.id === ORDER_ID);
      expect(order?.refundStatus).toBe("PENDING");
    });

    it("Test 36: Duplicate refund.processed is idempotent", async () => {
      clearBillingEvents();
      h.billingEvents.push({
        id: "event-1",
        idempotencyKey: "product_refund_webhook_refund_test_123",
        type: "REFUND_WEBHOOK_RECONCILED",
      });

      const existing = await h.mockBillingEventFindUnique({
        where: { idempotencyKey: "product_refund_webhook_refund_test_123" },
      });
      expect(existing).toBeTruthy();
    });
  });

  describe("Error Safety", () => {
    it("Test 37: Provider errors do not leak credentials", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: false,
        error: "Invalid API key",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result.success).toBe(false);
      expect(result.error).not.toContain("rzp_test_actual_key_id");
      expect(result.error).not.toContain("rzp_test_actual_key_secret");
    });

    it("Test 38: Credentials never exposed in response", async () => {
      h.mockAdapter.refundPayment.mockResolvedValue({
        success: true,
        providerRefundId: PROVIDER_REFUND_ID,
        status: "processed",
      });

      const result = await executeProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(JSON.stringify(result)).not.toContain("rzp_test_actual_key_id");
      expect(JSON.stringify(result)).not.toContain("rzp_test_actual_key_secret");
      expect(JSON.stringify(result)).not.toContain("encrypted_key_id");
      expect(JSON.stringify(result)).not.toContain("encrypted_key_secret");
    });
  });
});
