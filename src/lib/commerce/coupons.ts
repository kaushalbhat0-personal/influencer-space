/**
 * Coupon Engine v1.0.0
 *
 * Validates and applies discount coupons to orders.
 * Supports: percentage and fixed-amount discounts with usage limits.
 */

export interface CouponValidation {
  valid: boolean;
  reason?: string;
  discountType?: "percentage" | "fixed";
  discountValue?: number;
  couponCode?: string;
}

export interface ApplyCouponResult {
  applied: boolean;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  couponCode: string;
  error?: string;
}

const ACTIVE_COUPONS: Map<string, { type: "percentage" | "fixed"; value: number; maxUses: number; used: number }> = new Map([
  ["LAUNCH10", { type: "percentage", value: 10, maxUses: 100, used: 0 }],
  ["CREATOR25", { type: "percentage", value: 25, maxUses: 50, used: 0 }],
  ["FLAT100", { type: "fixed", value: 100, maxUses: 200, used: 0 }],
]);

export function validateCoupon(code: string): CouponValidation {
  const normalized = code.toUpperCase().trim();
  const coupon = ACTIVE_COUPONS.get(normalized);

  if (!coupon) {
    return { valid: false, reason: "Invalid coupon code" };
  }

  if (coupon.used >= coupon.maxUses) {
    return { valid: false, reason: "Coupon usage limit reached" };
  }

  return {
    valid: true,
    discountType: coupon.type,
    discountValue: coupon.value,
    couponCode: normalized,
  };
}

export function applyCoupon(
  amount: number,
  validation: CouponValidation
): ApplyCouponResult {
  if (!validation.valid || !validation.discountType || !validation.discountValue) {
    return {
      applied: false,
      originalAmount: amount,
      discountAmount: 0,
      finalAmount: amount,
      couponCode: validation.couponCode ?? "",
      error: validation.reason,
    };
  }

  let discountAmount = 0;

  if (validation.discountType === "percentage") {
    discountAmount = Math.round((amount * validation.discountValue) / 100);
  } else if (validation.discountType === "fixed") {
    discountAmount = Math.min(validation.discountValue, amount);
  }

  const finalAmount = Math.max(0, amount - discountAmount);

  // Track usage
  const coupon = ACTIVE_COUPONS.get(validation.couponCode ?? "");
  if (coupon) coupon.used += 1;

  return {
    applied: true,
    originalAmount: amount,
    discountAmount,
    finalAmount,
    couponCode: validation.couponCode ?? "",
  };
}

export function calculateTax(amount: number, taxRate = 0.18): { subtotal: number; tax: number; total: number } {
  const tax = Math.round(amount * taxRate);
  return { subtotal: amount, tax, total: amount + tax };
}
