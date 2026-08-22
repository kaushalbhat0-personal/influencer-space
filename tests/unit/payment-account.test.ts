import { describe, it, expect, vi, beforeEach } from "vitest";
import { PAYMENT_PROVIDERS, getPaymentProviderAdapter, getPaymentProviderLabel } from "@/modules/payment-account";
import { PRODUCT_TYPE_REGISTRY, PRODUCT_TYPE_BY_ID } from "@/modules/product-types";
import { RazorpayPaymentAdapter } from "@/modules/payment-account/providers/razorpay";

// RCCF-72.18D.6.2 — the adapter now performs a REAL provider probe
// (authenticated read-only GET /v1/orders?count=1). The razorpay SDK is
// stubbed so tests are deterministic and never touch the network.
const h = vi.hoisted(() => ({
  rzpOrdersAll: vi.fn(),
}));

vi.mock("razorpay", () => ({
  default: class {
    orders = { all: h.rzpOrdersAll };
  },
}));

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

  beforeEach(() => {
    h.rzpOrdersAll.mockReset();
  });

  // RCCF-72.18D.6.2 — superseded guardrail: format-only validation is gone;
  // verification is REAL and only claims success when Razorpay authenticates.
  it("reports VERIFIED only when the provider authenticates the key pair", async () => {
    h.rzpOrdersAll.mockResolvedValue({ entity: "collection", count: 0, items: [] });
    const r = await adapter.getAccountStatus({ providerKeyId: "rzp_live_abc", providerKeySecret: "secret" });
    expect(r.success).toBe(true);
    expect(r.verified).toBe(true);
    expect(r.status).toBe("verified");
    expect(h.rzpOrdersAll).toHaveBeenCalledWith({ count: 1 });
  });

  it("rejects missing or malformed keys without a provider call", async () => {
    const missing = await adapter.getAccountStatus({ providerKeyId: null, providerKeySecret: "x" });
    expect(missing.success).toBe(false);
    expect(missing.classification).toBe("credential_failed");
    const malformed = await adapter.getAccountStatus({ providerKeyId: "bad_key", providerKeySecret: "x" });
    expect(malformed.success).toBe(false);
    expect(malformed.classification).toBe("credential_failed");
    expect(h.rzpOrdersAll).not.toHaveBeenCalled();
  });
});
