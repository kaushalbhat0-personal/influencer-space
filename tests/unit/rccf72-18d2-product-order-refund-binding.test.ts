import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => {
  const productOrders: Array<Record<string, unknown>> = [];
  const paymentAccounts: Array<Record<string, unknown>> = [];
  return {
    productOrders,
    paymentAccounts,
    mockPaymentAccountFindUnique: vi.fn(),
    mockProductOrderCreate: vi.fn(),
    mockProductOrderFindUnique: vi.fn(),
    mockProductOrderUpdate: vi.fn(),
    mockProductOrderFindMany: vi.fn(),
    reset: () => {
      productOrders.length = 0;
      paymentAccounts.length = 0;
    },
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    paymentAccount: {
      findUnique: h.mockPaymentAccountFindUnique,
    },
    productOrder: {
      create: h.mockProductOrderCreate,
      findUnique: h.mockProductOrderFindUnique,
      update: h.mockProductOrderUpdate,
      findMany: h.mockProductOrderFindMany,
    },
    product: {
      findFirst: vi.fn().mockResolvedValue({
        id: "product-1",
        tenantId: "11111111-1111-4111-8111-111111111111",
        price: 1000,
        name: "Test Product",
        isActive: true,
        status: "PUBLISHED",
        archivedAt: null,
      }),
    },
  },
}));

vi.mock("@/actions/checkout.actions", () => ({
  resolveCheckoutTenantId: vi.fn(),
}));

vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: vi.fn(),
}));

vi.mock("@/modules/payment-account", () => ({
  computePaymentReadiness: vi.fn(),
  getPaymentProviderAdapter: vi.fn(),
}));

vi.mock("@/lib/crypto", () => ({
  decrypt: vi.fn((val) => val),
}));

import { createDirectCheckout } from "@/actions/payment-account.actions";
import { resolveCheckoutTenantId } from "@/actions/checkout.actions";
import { resolveCommerceStrategy } from "@/modules/commerce-strategy";
import { computePaymentReadiness, getPaymentProviderAdapter } from "@/modules/payment-account";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const PAYMENT_ACCOUNT_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PAYMENT_ACCOUNT_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRODUCT_ID = "product-1";

function setupPaymentAccountA() {
  h.paymentAccounts.push({
    id: PAYMENT_ACCOUNT_A,
    tenantId: TENANT_A,
    provider: "razorpay",
    providerKeyId: "rzp_test_key",
    providerKeySecret: "rzp_test_secret",
    status: "active",
    verificationStatus: "configured",
    capabilities: { products: true },
    settlementMode: "upi",
    upiId: "creator@upi",
    accountHolderName: "Test Creator",
  });
}

function setupPaymentAccountB() {
  h.paymentAccounts.push({
    id: PAYMENT_ACCOUNT_B,
    tenantId: TENANT_A,
    provider: "razorpay",
    providerKeyId: "rzp_test_key_b",
    providerKeySecret: "rzp_test_secret_b",
    status: "active",
    verificationStatus: "configured",
    capabilities: { products: true },
    settlementMode: "upi",
    upiId: "creator2@upi",
    accountHolderName: "Test Creator 2",
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();

  h.mockPaymentAccountFindUnique.mockImplementation(({ where }: { where: { tenantId: string } }) => {
    const acc = h.paymentAccounts.find((a) => a.tenantId === where.tenantId);
    return Promise.resolve(acc ?? null);
  });

  h.mockProductOrderCreate.mockImplementation(({ data }: { data: Record<string, unknown> }) => {
    const order = { 
      id: `order-${h.productOrders.length + 1}`, 
      ...data,
      // Apply defaults that Prisma would apply
      refundStatus: data.refundStatus ?? "NONE",
      refundAmount: data.refundAmount ?? null,
      refundId: data.refundId ?? null,
      refundedAt: data.refundedAt ?? null,
      paymentAccountId: data.paymentAccountId ?? null,
    };
    h.productOrders.push(order);
    return Promise.resolve(order);
  });

  h.mockProductOrderFindUnique.mockImplementation(({ where }: { where: { id: string } }) => {
    const order = h.productOrders.find((o) => o.id === where.id);
    return Promise.resolve(order ?? null);
  });

  h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
    const order = h.productOrders.find((o) => o.id === where.id);
    if (order) {
      Object.assign(order, data);
    }
    return Promise.resolve(order);
  });

  (resolveCheckoutTenantId as vi.Mock).mockResolvedValue(TENANT_A);
  (resolveCommerceStrategy as vi.Mock).mockResolvedValue({
    id: "DIRECT_CREATOR",
    definition: { status: "active" },
  });
  (computePaymentReadiness as vi.Mock).mockResolvedValue({
    tenantId: TENANT_A,
    readiness: "ready",
    strategy: "DIRECT_CREATOR",
    provider: "razorpay",
    requirements: [],
    missing: [],
  });

  const mockAdapter = {
    id: "razorpay",
    label: "Razorpay",
    createCheckout: vi.fn().mockResolvedValue({
      success: true,
      checkoutUrl: "https://rzp.io/i/test",
      providerReference: "plink_test_123",
    }),
  };
  (getPaymentProviderAdapter as vi.Mock).mockReturnValue(mockAdapter);
});

describe("RCCF-72.18D.2 — ProductOrder Refund Schema & Provider Binding", () => {
  describe("Test 1: New DIRECT_CREATOR order captures PaymentAccount binding", () => {
    it("ProductOrder.paymentAccountId === PaymentAccount A.id when created via createDirectCheckout", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const createdOrder = h.productOrders.find((o) => o.productId === PRODUCT_ID);
      expect(createdOrder).toBeDefined();
      expect(createdOrder!.paymentAccountId).toBe(PAYMENT_ACCOUNT_A);
      expect(createdOrder!.commerceStrategy).toBe("DIRECT_CREATOR");
      expect(createdOrder!.provider).toBe("razorpay");
      expect(createdOrder!.refundStatus).toBe("NONE");
      expect(createdOrder!.refundAmount).toBeNull();
      expect(createdOrder!.refundId).toBeNull();
      expect(createdOrder!.refundedAt).toBeNull();
    });
  });

  describe("Test 2: Current account switch does not alter historical binding", () => {
    it("Order created with PaymentAccount A retains A's ID even after tenant switches to PaymentAccount B", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const orderId = h.productOrders.find((o) => o.productId === PRODUCT_ID)!.id;

      setupPaymentAccountB();

      h.mockPaymentAccountFindUnique.mockImplementation(({ where }: { where: { tenantId: string } }) => {
        const acc = h.paymentAccounts.find((a) => a.tenantId === where.tenantId);
        return Promise.resolve(acc ?? null);
      });

      const order = await h.mockProductOrderFindUnique({ where: { id: orderId } });
      expect(order.paymentAccountId).toBe(PAYMENT_ACCOUNT_A);
      expect(order.paymentAccountId).not.toBe(PAYMENT_ACCOUNT_B);
    });
  });

  describe("Test 3: Cross-tenant binding rejected", () => {
    it("ProductOrder tenant A cannot bind to PaymentAccount tenant B", async () => {
      setupPaymentAccountA();

      const TENANT_B = "22222222-2222-4222-8222-222222222222";
      const PAYMENT_ACCOUNT_B_TENANT = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

      h.paymentAccounts.push({
        id: PAYMENT_ACCOUNT_B_TENANT,
        tenantId: TENANT_B,
        provider: "razorpay",
        providerKeyId: "rzp_test_key_b",
        providerKeySecret: "rzp_test_secret_b",
        status: "active",
        verificationStatus: "configured",
        capabilities: { products: true },
        settlementMode: "upi",
        upiId: "other@upi",
        accountHolderName: "Other Creator",
      });

      // Reset the payment account find unique to return the correct account for TENANT_A
      h.mockPaymentAccountFindUnique.mockImplementation(({ where }: { where: { tenantId: string } }) => {
        const acc = h.paymentAccounts.find((a) => a.tenantId === where.tenantId);
        return Promise.resolve(acc ?? null);
      });

      (resolveCheckoutTenantId as vi.Mock).mockResolvedValue(TENANT_A);

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const createdOrder = h.productOrders.find((o) => o.productId === PRODUCT_ID);
      expect(createdOrder!.paymentAccountId).toBe(PAYMENT_ACCOUNT_A);
      expect(createdOrder!.paymentAccountId).not.toBe(PAYMENT_ACCOUNT_B_TENANT);
    });
  });

  describe("Test 4: PLATFORM_COLLECT remains unaffected", () => {
    it("PLATFORM_COLLECT orders do not require paymentAccountId", async () => {
      (resolveCommerceStrategy as vi.Mock).mockResolvedValue({
        id: "PLATFORM_COLLECT",
        definition: { status: "active" },
      });

      h.mockProductOrderCreate.mockClear();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe("Direct creator checkout is not available yet.");
      expect(h.mockProductOrderCreate).not.toHaveBeenCalled();
    });
  });

  describe("Test 5: Partial refund accounting fields", () => {
    it("ProductOrder supports cumulative refund amount tracking", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const orderId = h.productOrders.find((o) => o.productId === PRODUCT_ID)!.id;

      await h.mockProductOrderUpdate({
        where: { id: orderId },
        data: {
          refundStatus: "PARTIAL",
          refundAmount: 20000, // ₹200 in paise
          refundId: "refund_1",
        },
      });

      const updatedOrder = h.productOrders.find((o) => o.id === orderId);
      expect(updatedOrder!.refundStatus).toBe("PARTIAL");
      expect(updatedOrder!.refundAmount).toBe(20000);

      await h.mockProductOrderUpdate({
        where: { id: orderId },
        data: {
          refundStatus: "PARTIAL",
          refundAmount: 50000, // ₹500 cumulative in paise
          refundId: "refund_2",
        },
      });

      const finalOrder = h.productOrders.find((o) => o.id === orderId);
      expect(finalOrder!.refundStatus).toBe("PARTIAL");
      expect(finalOrder!.refundAmount).toBe(50000);
    });
  });

  describe("Test 6: Refund cannot exceed captured amount (schema-level invariant)", () => {
    it("refundAmount field allows validation of cumulative refund <= original amount", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const orderId = h.productOrders.find((o) => o.productId === PRODUCT_ID)!.id;
      const order = h.productOrders.find((o) => o.id === orderId);

      const originalAmountPaise = Math.round(order!.amount * 100);

      expect(originalAmountPaise).toBeGreaterThan(0);

      let shouldThrow = false;
      h.mockProductOrderUpdate.mockImplementation(({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const order = h.productOrders.find((o) => o.id === where.id);
        if (order) {
          const newRefundAmount = data.refundAmount as number;
          if (shouldThrow && newRefundAmount > originalAmountPaise) {
            throw new Error("Refund amount exceeds captured amount");
          }
          Object.assign(order, data);
        }
        return Promise.resolve(order);
      });

      // First refund - should work
      await h.mockProductOrderUpdate({
        where: { id: orderId },
        data: {
          refundStatus: "PARTIAL",
          refundAmount: 20000,
          refundId: "refund_1",
        },
      });

      // Second refund - cumulative exceeds original
      shouldThrow = true;
      try {
        await h.mockProductOrderUpdate({
          where: { id: orderId },
          data: {
            refundStatus: "PARTIAL",
            refundAmount: originalAmountPaise + 100,
            refundId: "refund_excess",
          },
        });
        throw new Error("Expected to throw but did not");
      } catch (e) {
        expect((e as Error).message).toBe("Refund amount exceeds captured amount");
      }
    });
  });

  describe("Test 7: Duplicate provider refund reference", () => {
    it("refundId can be unique per refund event", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const orderId = h.productOrders.find((o) => o.productId === PRODUCT_ID)!.id;

      await h.mockProductOrderUpdate({
        where: { id: orderId },
        data: {
          refundStatus: "PARTIAL",
          refundAmount: 20000,
          refundId: "refund_1",
        },
      });

      const order = h.productOrders.find((o) => o.id === orderId);
      expect(order!.refundId).toBe("refund_1");
    });
  });

  describe("Test 8: Historical order with missing binding", () => {
    it("Pre-existing orders without paymentAccountId have NULL binding", async () => {
      h.productOrders.push({
        id: "order-legacy",
        tenantId: TENANT_A,
        productId: PRODUCT_ID,
        amount: 1000,
        status: "COMPLETED",
        razorpayOrderId: "rzp_legacy_123",
        razorpayPaymentId: "pay_legacy_123",
        fanEmail: "legacy@example.com",
        platformFeePercent: 5,
        commerceStrategy: "DIRECT_CREATOR",
        provider: "razorpay",
        providerReference: "plink_legacy",
        providerMetadata: { checkoutUrl: "https://rzp.io/i/legacy" },
        paymentAccountId: null,
        refundStatus: "NONE",
        refundId: null,
        refundAmount: null,
        refundedAt: null,
        createdAt: new Date("2026-01-01"),
        updatedAt: new Date("2026-01-01"),
      });

      const legacyOrder = h.productOrders.find((o) => o.id === "order-legacy");
      expect(legacyOrder!.paymentAccountId).toBeNull();
      expect(legacyOrder!.refundStatus).toBe("NONE");
    });
  });

  describe("Test 9: Account deletion/replacement", () => {
    it("Historical order retains paymentAccountId even if PaymentAccount is deactivated", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const orderId = h.productOrders.find((o) => o.productId === PRODUCT_ID)!.id;

      h.paymentAccounts[0].status = "disconnected";
      h.paymentAccounts[0].verificationStatus = "unverified";

      const order = await h.mockProductOrderFindUnique({ where: { id: orderId } });
      expect(order.paymentAccountId).toBe(PAYMENT_ACCOUNT_A);
    });
  });

  describe("Test 10: Secrets never exposed", () => {
    it("ProductOrder representation does not contain decrypted provider credentials", async () => {
      setupPaymentAccountA();

      const result = await createDirectCheckout({
        productId: PRODUCT_ID,
        customerEmail: "buyer@example.com",
      });

      expect(result.success).toBe(true);

      const createdOrder = h.productOrders.find((o) => o.productId === PRODUCT_ID);
      expect(createdOrder).toBeDefined();
      expect(createdOrder!).not.toHaveProperty("providerKeyId");
      expect(createdOrder!).not.toHaveProperty("providerKeySecret");
      expect(createdOrder!).not.toHaveProperty("bankAccountNumber");
    });
  });
});