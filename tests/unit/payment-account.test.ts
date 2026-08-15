import { describe, it, expect } from "vitest";
import { PAYMENT_PROVIDERS, getPaymentProviderAdapter, getPaymentProviderLabel } from "@/modules/payment-account";
import { PRODUCT_TYPE_REGISTRY, PRODUCT_TYPE_BY_ID } from "@/modules/product-types";
import { RazorpayPaymentAdapter } from "@/modules/payment-account/providers/razorpay";

describe("RCCF-IMPLEMENTATION-74 — provider registry", () => {
  it("launches Razorpay and reserves the future providers", () => {
    const active = PAYMENT_PROVIDERS.filter((p) => p.status === "active").map((p) => p.id);
    expect(active).toEqual(["razorpay"]);
    for (const id of ["stripe", "phonepe", "cashfree", "payu", "manual"]) {
      expect(PAYMENT_PROVIDERS.some((p) => p.id === id)).toBe(true);
    }
  });

  it("resolves the Razorpay adapter and labels", () => {
    expect(getPaymentProviderAdapter("razorpay")).not.toBeNull();
    expect(getPaymentProviderAdapter("stripe")).toBeNull();
    expect(getPaymentProviderLabel("razorpay")).toBe("Razorpay");
  });
});

describe("RCCF-IMPLEMENTATION-74 — product type runtime", () => {
  it("declares the seven canonical types", () => {
    const ids = PRODUCT_TYPE_REGISTRY.map((t) => t.id);
    expect(ids).toEqual(["digital", "physical", "course", "service", "booking", "affiliate", "donation"]);
  });

  it("declares fulfillment requirements per type", () => {
    expect(PRODUCT_TYPE_BY_ID["digital"]!.requiresDownload).toBe(true);
    expect(PRODUCT_TYPE_BY_ID["physical"]!.requiresShipping).toBe(true);
    expect(PRODUCT_TYPE_BY_ID["booking"]!.requiresBooking).toBe(true);
    expect(PRODUCT_TYPE_BY_ID["affiliate"]!.requiresPayment).toBe(false);
    expect(PRODUCT_TYPE_BY_ID["donation"]!.requiresPayment).toBe(true);
  });
});

describe("RCCF-IMPLEMENTATION-74 — Razorpay adapter", () => {
  const adapter = new RazorpayPaymentAdapter();

  it("treats valid keys as configuration-validated (no provider verification claim)", async () => {
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_abc", providerKeySecret: "secret" });
    expect(r.success).toBe(true);
    // RCCF-69.2 — truthfulness: format validation only, never "verified".
    expect(r.verified).toBe(false);
    expect(r.status).toBe("configured");
  });

  it("rejects missing or malformed keys", async () => {
    expect((await adapter.getAccountStatus({ providerKeyId: null, providerKeySecret: "x" })).success).toBe(false);
    expect((await adapter.getAccountStatus({ providerKeyId: "bad_key", providerKeySecret: "x" })).success).toBe(false);
  });
});
