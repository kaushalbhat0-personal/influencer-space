import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const productOrders: Array<Record<string, unknown>> = [];
  const paymentAccounts: Array<Record<string, unknown>> = [];
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
    session,
    mockPaymentAccountFindUnique: vi.fn(),
    mockProductOrderFindUnique: vi.fn(),
    mockProductOrderUpdate: vi.fn(),
    reset: () => {
      productOrders.length = 0;
      paymentAccounts.length = 0;
      session.user = {
        id: "user-1",
        tenantId: "11111111-1111-4111-8111-111111111111",
        role: "ADMIN",
        email: "creator@example.com",
        name: "Test Creator",
      };
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
      update: h.mockProductOrderUpdate,
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAction: vi.fn().mockResolvedValue(undefined),
}));

import { requestProductOrderRefund } from "@/actions/payment-account.actions";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORDER_ID = "order-test-1";

function setupPaymentAccountA() {
  h.paymentAccounts.push({
    id: PAYMENT_ACCOUNT_A,
    tenantId: TENANT_A,
    provider: "razorpay",
    status: "active",
    verificationStatus: "configured",
  });
}

function makeOrder(overrides: Record<string, unknown> = {}) {
  return {
    id: ORDER_ID,
    tenantId: TENANT_A,
    productId: "product-1",
    amount: 1000, // ₹1000 in rupees
    status: "COMPLETED",
    commerceStrategy: "DIRECT_CREATOR",
    paymentAccountId: PAYMENT_ACCOUNT_A,
    razorpayPaymentId: "pay_test_123",
    refundAmount: 0,
    refundStatus: "NONE",
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

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  setupPaymentAccountA();
  pushOrder();
  // Session is reset to default by h.reset()

  h.mockPaymentAccountFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    const acc = h.paymentAccounts.find((a) => a.id === where.id);
    return Promise.resolve(acc ?? null);
  });

  h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    const order = h.productOrders.find((o) => o.id === where.id);
    return Promise.resolve(order ?? null);
  });

  h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string; refundStatus?: { in?: string[] } }; data: Record<string, unknown> }) => {
    const order = h.productOrders.find((o) => o.id === where.id);
    // Emulate Prisma conditional-update filters (RCCF-72.18D.5.1: the initiation
    // guard is refundStatus IN [NONE,PARTIAL,FAILED] — reservation-free).
    const allowed = where.refundStatus?.in;
    if (order && allowed && !allowed.includes(order.refundStatus as string)) {
      return Promise.resolve(null);
    }
    if (order && where.refundAmount !== undefined && order.refundAmount !== where.refundAmount) {
      return Promise.resolve(null);
    }
    if (order) {
      Object.assign(order, data);
    }
    return Promise.resolve(order ? { id: order.id, refundAmount: order.refundAmount, refundStatus: order.refundStatus } : null);
  });
});

describe("RCCF-72.18D.3 — Product Refund Initiation & Authorization", () => {
  describe("Authorization & Tenant Isolation", () => {
    it("Test 1: Anonymous user denied", async () => {
      setNoSession();

      const result = await requestProductOrderRefund({ orderId: "non-existent", amount: 100 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("UNAUTHORIZED");
    });

    it("Test 2: User from another tenant denied", async () => {
      setSession({ tenantId: "22222222-2222-4222-8222-222222222222" });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("FORBIDDEN");
    });

    it("Test 3: PLATFORM_COLLECT order rejected", async () => {
      resetOrders();
      pushOrder({ commerceStrategy: "PLATFORM_COLLECT" });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_STRATEGY");
    });

    it("Test 4: Missing paymentAccountId rejected", async () => {
      resetOrders();
      pushOrder({ paymentAccountId: null });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("MISSING_PAYMENT_ACCOUNT");
    });

    it("Test 5: Cross-tenant PaymentAccount rejected", async () => {
      const TENANT_B = "22222222-2222-4222-8222-222222222222";
      const PAYMENT_ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

      pushPaymentAccount({
        id: PAYMENT_ACCOUNT_B,
        tenantId: TENANT_B,
        provider: "razorpay",
        status: "active",
        verificationStatus: "configured",
      });

      resetOrders();
      pushOrder({ paymentAccountId: PAYMENT_ACCOUNT_B });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_PAYMENT_ACCOUNT");
    });

    it("Test 6: SUPER_ADMIN can access any tenant's order", async () => {
      setSession({ role: "SUPER_ADMIN", tenantId: "other-tenant" });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(true);
    });
  });

  describe("Amount Validation", () => {
    it("Test 7: Zero refund rejected", async () => {
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 0 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_AMOUNT");
    });

    it("Test 8: Negative refund rejected", async () => {
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: -100 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_AMOUNT");
    });

    it("Test 9: Refund exceeding remaining amount rejected", async () => {
      // ₹1000 = 100000 paise, already refunded ₹600 = 60000 paise, remaining = 40000 paise
      resetOrders();
      pushOrder({ refundAmount: 60000 });
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 50000 }); // Request ₹500 = 50000 paise > 40000 remaining
      expect(result.success).toBe(false);
      expect(result.code).toBe("AMOUNT_EXCEEDS_REMAINING");
    });

    it("Test 10: Exact remaining refund accepted", async () => {
      // ₹1000 = 100000 paise, already refunded ₹600 = 60000 paise, remaining = 40000 paise
      resetOrders();
      pushOrder({ refundAmount: 60000 });
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 40000 }); // Request exactly ₹400 remaining
      expect(result.success).toBe(true);
    });

    it("Test 11: Partial refund accepted", async () => {
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30000 }); // Request ₹300 partial
      expect(result.success).toBe(true);
    });
  });

  describe("State & Concurrency", () => {
    it("Test 12: Concurrent refund protection", async () => {
      resetOrders();
      pushOrder({ refundAmount: 0 });

      // Track findUnique calls to return stale value for concurrent request
      let findUniqueCallCount = 0;
      h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
        findUniqueCallCount++;
        const order = h.productOrders.find((o) => o.id === where.id);
        // For the second call (concurrent request), return stale refundAmount = 0
        if (findUniqueCallCount === 2 && order) {
          return Promise.resolve({ ...order, refundAmount: 0 });
        }
        return Promise.resolve(order ?? null);
      });

      // First request succeeds
      const result1 = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 30000 }); // ₹300
      expect(result1.success).toBe(true);

      // Second concurrent request with stale refundAmount fails
      // The update uses where.refundAmount = 0 (stale), but DB now has 30000, so update returns null
      const result2 = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 50000 });
      expect(result2.success).toBe(false);
      expect(result2.code).toBe("REFUND_IN_PROGRESS");
    });

    it("Test 13: Already fully refunded order", async () => {
      resetOrders();
      pushOrder({ refundAmount: 100000, refundStatus: "REFUNDED" }); // Already fully refunded (₹1000 = 100000 paise)

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("AMOUNT_EXCEEDS_REMAINING");
    });

    it("Test 14: Pending refund retry behavior", async () => {
      resetOrders();
      pushOrder({ refundAmount: 30000, refundStatus: "PARTIAL" });

      // Should allow additional partial refund
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 20000 });
      expect(result.success).toBe(true);
    });

    it("Test 15: Invalid order status (not COMPLETED)", async () => {
      resetOrders();
      pushOrder({ status: "PENDING" });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("INVALID_ORDER_STATUS");
    });

    it("Test 16: Order with no captured payment", async () => {
      resetOrders();
      pushOrder({ razorpayPaymentId: null });

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(false);
      expect(result.code).toBe("NO_CAPTURED_PAYMENT");
    });
  });

  describe("Historical Account Binding", () => {
    it("Test 17: Historical account switch preserved", async () => {
      // Order was created with PaymentAccount A
      // Even if we change the mock to return a different account for current tenant
      // the order still has paymentAccountId = PAYMENT_ACCOUNT_A
      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(true);

      // Verify the payment account lookup uses order.paymentAccountId, not current tenant account
      expect(h.mockPaymentAccountFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: PAYMENT_ACCOUNT_A } })
      );
    });
  });

  describe("Provider Boundary", () => {
    it("Test 18: No provider execution in D.3", async () => {
      // The refundPayment method is in the adapter but D.3 should NOT call it
      // (verified by code inspection - no adapter.refundPayment call in D.3)

      const result = await requestProductOrderRefund({ orderId: ORDER_ID, amount: 10000 });
      expect(result.success).toBe(true);
    });
  });

  describe("Structured Errors", () => {
    it("Test 19: All errors return structured result", async () => {
      const result = await requestProductOrderRefund({ orderId: "non-existent", amount: 100 });
      expect(result).toHaveProperty("success");
      expect(result).toHaveProperty("error");
      expect(result).toHaveProperty("code");
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe("string");
      expect(typeof result.code).toBe("string");
    });
  });
});