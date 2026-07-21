import { describe, it, expect } from "vitest";
import { canTransition, markOrderPaid, markOrderRefunded } from "@/lib/commerce/order-lifecycle";
import { validateCoupon, applyCoupon, calculateTax } from "@/lib/commerce/coupons";
import { isDuplicateWebhook, verifyWebhookTimestamp } from "@/lib/commerce/webhook-idempotency";
import { isValidDownloadToken } from "@/lib/commerce/fulfillment";
import type { DownloadPermission } from "@/lib/commerce/fulfillment";

describe("Order Lifecycle", () => {
  it("should allow PENDING → PAID transition", () => {
    expect(canTransition("PENDING", "PAID")).toBe(true);
  });

  it("should allow PAID → PROCESSING transition", () => {
    expect(canTransition("PAID", "PROCESSING")).toBe(true);
  });

  it("should allow PAID → REFUNDED transition", () => {
    expect(canTransition("PAID", "REFUNDED")).toBe(true);
  });

  it("should allow COMPLETED → REFUNDED transition", () => {
    expect(canTransition("COMPLETED", "REFUNDED")).toBe(true);
  });

  it("should NOT allow COMPLETED → PENDING transition", () => {
    expect(canTransition("COMPLETED", "PENDING")).toBe(false);
  });

  it("should NOT allow REFUNDED → PAID transition", () => {
    expect(canTransition("REFUNDED", "PAID")).toBe(false);
  });

  it("should allow retry from FAILED → PENDING", () => {
    expect(canTransition("FAILED", "PENDING")).toBe(true);
  });

  it("should allow retry from PENDING → PENDING", () => {
    expect(canTransition("PENDING", "PENDING")).toBe(true);
  });

  it("should NOT allow PENDING → COMPLETED (must go through PAID)", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });
});

describe("Coupon Engine", () => {
  it("should validate a valid coupon", () => {
    const result = validateCoupon("LAUNCH10");
    expect(result.valid).toBe(true);
    expect(result.discountType).toBe("percentage");
    expect(result.discountValue).toBe(10);
  });

  it("should reject an invalid coupon", () => {
    const result = validateCoupon("INVALID99");
    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invalid coupon code");
  });

  it("should apply 10% discount", () => {
    const validation = validateCoupon("LAUNCH10");
    const result = applyCoupon(500, validation);
    expect(result.applied).toBe(true);
    expect(result.discountAmount).toBe(50);
    expect(result.finalAmount).toBe(450);
  });

  it("should apply fixed discount", () => {
    const validation = validateCoupon("FLAT100");
    const result = applyCoupon(500, validation);
    expect(result.applied).toBe(true);
    expect(result.discountAmount).toBe(100);
    expect(result.finalAmount).toBe(400);
  });

  it("should not exceed original amount with fixed discount", () => {
    const validation = validateCoupon("FLAT100");
    const result = applyCoupon(50, validation);
    expect(result.finalAmount).toBe(0);
  });

  it("should handle empty coupon gracefully", () => {
    const result = validateCoupon("");
    expect(result.valid).toBe(false);
  });

  it("should calculate tax", () => {
    const { subtotal, tax, total } = calculateTax(1000, 0.18);
    expect(subtotal).toBe(1000);
    expect(tax).toBe(180);
    expect(total).toBe(1180);
  });
});

describe("Idempotency", () => {
  it("should detect recent webhook timestamp as valid", () => {
    const now = Math.floor(Date.now() / 1000);
    expect(verifyWebhookTimestamp(String(now), 300)).toBe(true);
  });

  it("should reject expired webhook timestamp", () => {
    const old = Math.floor((Date.now() - 600_000) / 1000); // 10 min ago
    expect(verifyWebhookTimestamp(String(old), 300)).toBe(false);
  });

  it("should reject null timestamp", () => {
    expect(verifyWebhookTimestamp(null)).toBe(false);
  });
});

describe("Digital Fulfillment", () => {
  it("should create a valid download permission", () => {
    const permission: DownloadPermission = {
      orderId: "order-1",
      productId: "product-1",
      fanEmail: "fan@mail.com",
      token: Math.random().toString(36).slice(2),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
      maxDownloads: 5,
      downloadCount: 0,
    };
    expect(permission.token).toBeTruthy();
    expect(permission.maxDownloads).toBe(5);
    expect(permission.downloadCount).toBe(0);
  });

  it("should validate a fresh download token", () => {
    const permission = {
      orderId: "order-1",
      productId: "product-1",
      fanEmail: "fan@mail.com",
      token: "abc123",
      expiresAt: new Date(Date.now() + 3600000),
      maxDownloads: 5,
      downloadCount: 0,
    };
    expect(isValidDownloadToken(permission).valid).toBe(true);
  });

  it("should reject expired download token", () => {
    const permission = {
      orderId: "order-1",
      productId: "product-1",
      fanEmail: "fan@mail.com",
      token: "abc123",
      expiresAt: new Date(Date.now() - 3600000),
      maxDownloads: 5,
      downloadCount: 0,
    };
    expect(isValidDownloadToken(permission).valid).toBe(false);
  });

  it("should reject when download limit reached", () => {
    const permission = {
      orderId: "order-1",
      productId: "product-1",
      fanEmail: "fan@mail.com",
      token: "abc123",
      expiresAt: new Date(Date.now() + 3600000),
      maxDownloads: 3,
      downloadCount: 3,
    };
    expect(isValidDownloadToken(permission).valid).toBe(false);
    expect(isValidDownloadToken(permission).reason).toBe("Download limit reached");
  });
});
