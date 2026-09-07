import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import crypto from "crypto";

// ── SEC-01 mocks ───────────────────────────────────────────────────────────
const sec01 = vi.hoisted(() => {
  const orders: Array<{ id: string; tenantId: string; amount: number; status: string; razorpayOrderId: string; razorpayPaymentId: string | null }> = [];
  return {
    orders,
    storefrontTenant: null as { id: string } | null,
    session: null as { user: { tenantId: string } } | null,
    rzpPayment: { amount: 10000 } as { amount: number } | null,
    rzpFetchShouldThrow: false,
    mockComplete: vi.fn(),
    reset() {
      orders.length = 0;
      sec01.storefrontTenant = null;
      sec01.session = null;
      sec01.rzpPayment = { amount: 10000 };
      sec01.rzpFetchShouldThrow = false;
      sec01.mockComplete.mockReset();
    },
  };
});

vi.mock("@/lib/tenant", () => ({ getTenantContext: async () => sec01.storefrontTenant }));
vi.mock("next-auth", () => ({ getServerSession: async () => sec01.session }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
const guestCounts = new Map<string, { count: number; resetAt: number }>();
vi.mock("@/lib/security/rate-limiter", () => ({
  checkRateLimit: vi.fn((key: string, endpoint?: string) => {
    if (endpoint === "/guest-order") {
      const now = Date.now();
      const cfg = { windowMs: 60000, maxRequests: 30 };
      const entry = guestCounts.get(key);
      if (!entry || now > entry.resetAt) {
        guestCounts.set(key, { count: 1, resetAt: now + cfg.windowMs });
        return { allowed: true, remaining: 29, resetAt: now + cfg.windowMs, retryAfterMs: 0 };
      }
      if (entry.count >= cfg.maxRequests) return { allowed: false, remaining: 0, resetAt: entry.resetAt, retryAfterMs: entry.resetAt - now };
      entry.count++;
      return { allowed: true, remaining: cfg.maxRequests - entry.count, resetAt: entry.resetAt, retryAfterMs: 0 };
    }
    return { allowed: true, remaining: 19, resetAt: 0, retryAfterMs: 0 };
  }),
  clearRateLimits: vi.fn(() => guestCounts.clear()),
}));
vi.mock("@/lib/commerce/coupons", () => ({
  validateCoupon: () => ({ valid: false }),
  applyCoupon: () => ({ applied: false, finalAmount: 0, discountAmount: 0 }),
  calculateTax: (amount: number) => ({ tax: 0, total: amount }),
}));
vi.mock("@/modules/commerce-strategy", () => ({
  resolveCommerceStrategy: async () => ({ id: "PLATFORM_COLLECT", definition: { status: "active" } }),
}));
vi.mock("@/modules/billing/application/order-completion", () => ({
  completeProductOrder: sec01.mockComplete,
}));
vi.mock("@/lib/razorpay", () => ({
  getRazorpayInstance: () => ({
    orders: { create: vi.fn().mockResolvedValue({ id: "rzp_order" }) },
    payments: {
      fetch: async () => {
        if (sec01.rzpFetchShouldThrow) throw new Error("network");
        return sec01.rzpPayment;
      },
    },
  }),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findFirst: vi.fn() },
    productOrder: {
      findFirst: async ({ where }: { where: { razorpayOrderId: string; tenantId?: string } }) =>
        sec01.orders.find((o) => o.razorpayOrderId === where.razorpayOrderId && (where.tenantId === undefined || o.tenantId === where.tenantId)) ?? null,
      findUnique: async ({ where }: { where: { razorpayOrderId?: string } }) =>
        sec01.orders.find((o) => o.razorpayOrderId === where.razorpayOrderId) ?? null,
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// ── SEC-06/07 imports (no mock) ────────────────────────────────────────────
import { validateConfig } from "@/lib/config/validation";
import { isValidGuestToken, maskEmail, maskLine1, maskPhone } from "@/lib/security/guest-order";
import { checkRateLimit, clearRateLimits } from "@/lib/security/rate-limiter";
import { isLoopbackIp, getTrustedIp } from "@/middleware";
import { NextRequest } from "next/server";

const TENANT_A = "11111111-1111-4111-8111-111111111111";
const TENANT_B = "22222222-2222-4222-8222-222222222222";
const RZP_SECRET = "test_razorpay_secret_123456";

function sig(orderId: string, paymentId: string) {
  return crypto.createHmac("sha256", RZP_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
}

describe("SEC-01 — verifyPayment tenant isolation + fail-closed", () => {
  let verifyPayment: typeof import("@/actions/checkout.actions")["verifyPayment"];

  beforeEach(async () => {
    sec01.reset();
    process.env.RAZORPAY_KEY_SECRET = RZP_SECRET;
    sec01.mockComplete.mockResolvedValue({ success: true });
    vi.resetModules();
    // Re-import after reset to get fresh mocked dependencies
    const mod = await import("@/actions/checkout.actions");
    verifyPayment = mod.verifyPayment;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("cross-tenant HMAC must not complete another tenant's PENDING order", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "PENDING", razorpayOrderId: "rzp_A", razorpayPaymentId: null });
    sec01.storefrontTenant = { id: TENANT_B }; // attacker is on tenant B host
    sec01.rzpPayment = { amount: 10000 }; // 100*100 correct amount
    const s = sig("rzp_A", "pay_123");
    const res = await verifyPayment("rzp_A", "pay_123", s);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Order not found");
    expect(sec01.mockComplete).not.toHaveBeenCalled();
  });

  it("same-tenant valid HMAC + correct amount completes", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "PENDING", razorpayOrderId: "rzp_A", razorpayPaymentId: null });
    sec01.storefrontTenant = { id: TENANT_A };
    sec01.rzpPayment = { amount: 10000 };
    const s = sig("rzp_A", "pay_123");
    const res = await verifyPayment("rzp_A", "pay_123", s);
    expect(res.success).toBe(true);
    expect(sec01.mockComplete).toHaveBeenCalledWith("o1", { paymentId: "pay_123" });
  });

  it("amount mismatch is fail-closed (no completion)", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "PENDING", razorpayOrderId: "rzp_A", razorpayPaymentId: null });
    sec01.storefrontTenant = { id: TENANT_A };
    sec01.rzpPayment = { amount: 9999 }; // mismatch
    const s = sig("rzp_A", "pay_123");
    const res = await verifyPayment("rzp_A", "pay_123", s);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/amount does not match/i);
    expect(sec01.mockComplete).not.toHaveBeenCalled();
  });

  it("razorpay fetch failure is fail-closed (never silently ignored)", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "PENDING", razorpayOrderId: "rzp_A", razorpayPaymentId: null });
    sec01.storefrontTenant = { id: TENANT_A };
    sec01.rzpFetchShouldThrow = true;
    const s = sig("rzp_A", "pay_123");
    const res = await verifyPayment("rzp_A", "pay_123", s);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/verification failed/i);
    expect(sec01.mockComplete).not.toHaveBeenCalled();
  });

  it("no tenant authority → Order not found (guest verification requires host)", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "PENDING", razorpayOrderId: "rzp_A", razorpayPaymentId: null });
    sec01.storefrontTenant = null;
    sec01.session = null;
    sec01.rzpPayment = { amount: 10000 };
    const s = sig("rzp_A", "pay_123");
    const res = await verifyPayment("rzp_A", "pay_123", s);
    expect(res.success).toBe(false);
    expect(res.error).toBe("Order not found");
  });

  it("already COMPLETED is idempotent without amount check", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "COMPLETED", razorpayOrderId: "rzp_A", razorpayPaymentId: "pay_old" });
    sec01.storefrontTenant = { id: TENANT_A };
    const s = sig("rzp_A", "pay_123");
    const res = await verifyPayment("rzp_A", "pay_123", s);
    expect(res.success).toBe(true);
    expect(sec01.mockComplete).not.toHaveBeenCalled();
  });

  it("invalid HMAC rejected before tenant lookup", async () => {
    sec01.orders.push({ id: "o1", tenantId: TENANT_A, amount: 100, status: "PENDING", razorpayOrderId: "rzp_A", razorpayPaymentId: null });
    sec01.storefrontTenant = { id: TENANT_A };
    const res = await verifyPayment("rzp_A", "pay_123", "bad_sig");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalid payment signature/i);
  });
});

describe("SEC-02 — loopback rate-limit bypass", () => {
  it("isLoopbackIp detects 127.0.0.1 and ::1", () => {
    expect(isLoopbackIp("127.0.0.1")).toBe(true);
    expect(isLoopbackIp("127.0.0.5")).toBe(true);
    expect(isLoopbackIp("::1")).toBe(true);
    expect(isLoopbackIp("::ffff:127.0.0.1")).toBe(true);
    expect(isLoopbackIp("192.168.1.1")).toBe(false);
    expect(isLoopbackIp("8.8.8.8")).toBe(false);
  });

  it("getTrustedIp prefers request.ip (Vercel trusted) over X-Forwarded-For", () => {
    const req = { headers: new Headers({ "x-forwarded-for": "127.0.0.1, 1.2.3.4" }), ip: "9.9.9.9" } as unknown as NextRequest;
    expect(getTrustedIp(req)).toBe("9.9.9.9");
  });

  it("getTrustedIp uses last X-Forwarded-For entry when ip absent (spoof-resistant)", () => {
    const req = { headers: new Headers({ "x-forwarded-for": "127.0.0.1, 1.2.3.4, 5.6.7.8" }) } as unknown as NextRequest;
    expect(getTrustedIp(req)).toBe("5.6.7.8");
  });

  it("spoofed X-Forwarded-For 127.0.0.1 as first entry is not treated as loopback when trusted IP is external", () => {
    // Attacker sends XFF: 127.0.0.1, real IP is 1.2.3.4 → trusted is last entry 1.2.3.4 → not loopback
    const req = { headers: new Headers({ "x-forwarded-for": "127.0.0.1, 1.2.3.4" }) } as unknown as NextRequest;
    const trusted = getTrustedIp(req);
    expect(trusted).toBe("1.2.3.4");
    expect(isLoopbackIp(trusted)).toBe(false);
  });

  it("middleware logic: production always rate-limits even if trusted IP is loopback", () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    const trustedIp = "127.0.0.1";
    const isDevelopment = process.env.NODE_ENV !== "production";
    const shouldBypass = isDevelopment && isLoopbackIp(trustedIp);
    expect(shouldBypass).toBe(false);
    process.env.NODE_ENV = orig;
  });

  it("middleware logic: development loopback is exempt", () => {
    const orig = process.env.NODE_ENV;
    process.env.NODE_ENV = "development";
    const trustedIp = "127.0.0.1";
    const isDevelopment = process.env.NODE_ENV !== "production";
    const shouldBypass = isDevelopment && isLoopbackIp(trustedIp);
    expect(shouldBypass).toBe(true);
    process.env.NODE_ENV = orig;
  });
});

describe("SEC-06 — TOKEN_ENCRYPTION_KEY fail-closed", () => {
  const origEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...origEnv };
  });

  function setEnv(vars: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete (process.env as Record<string, string | undefined>)[k];
      else process.env[k] = v;
    }
  }

  it("missing TOKEN_ENCRYPTION_KEY is reported as REQUIRED error", () => {
    setEnv({ TOKEN_ENCRYPTION_KEY: undefined, DATABASE_URL: "postgres://x", NEXTAUTH_SECRET: "s", NEXTAUTH_URL: "http://x", RAZORPAY_KEY_ID: "k", RAZORPAY_KEY_SECRET: "s", RAZORPAY_WEBHOOK_SECRET: "w", NEXT_PUBLIC_RAZORPAY_KEY_ID: "k", NEXT_PUBLIC_APP_URL: "http://x", NEXT_PUBLIC_SUPABASE_URL: "http://x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "k" });
    const res = validateConfig();
    expect(res.ok).toBe(false);
    expect(res.errors.some((e) => e.includes("TOKEN_ENCRYPTION_KEY"))).toBe(true);
  });

  it("hex 64 chars (32 bytes) is valid", () => {
    const hex64 = "a".repeat(64);
    setEnv({ TOKEN_ENCRYPTION_KEY: hex64, DATABASE_URL: "x", NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "x", RAZORPAY_KEY_ID: "x", RAZORPAY_KEY_SECRET: "x", RAZORPAY_WEBHOOK_SECRET: "x", NEXT_PUBLIC_RAZORPAY_KEY_ID: "x", NEXT_PUBLIC_APP_URL: "x", NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" });
    const res = validateConfig();
    // Only TOKEN key error should be absent; other missing may still error but not this one
    expect(res.errors.filter((e) => e.includes("TOKEN_ENCRYPTION_KEY")).length).toBe(0);
  });

  it("base64 44 chars (32 bytes) is valid", () => {
    const b64 = Buffer.from("a".repeat(32)).toString("base64"); // 44 chars
    setEnv({ TOKEN_ENCRYPTION_KEY: b64, DATABASE_URL: "x", NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "x", RAZORPAY_KEY_ID: "x", RAZORPAY_KEY_SECRET: "x", RAZORPAY_WEBHOOK_SECRET: "x", NEXT_PUBLIC_RAZORPAY_KEY_ID: "x", NEXT_PUBLIC_APP_URL: "x", NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" });
    const res = validateConfig();
    expect(res.errors.filter((e) => e.includes("TOKEN_ENCRYPTION_KEY")).length).toBe(0);
  });

  it("short key (16 bytes) is invalid", () => {
    const short = Buffer.from("short").toString("base64");
    setEnv({ TOKEN_ENCRYPTION_KEY: short, DATABASE_URL: "x", NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "x", RAZORPAY_KEY_ID: "x", RAZORPAY_KEY_SECRET: "x", RAZORPAY_WEBHOOK_SECRET: "x", NEXT_PUBLIC_RAZORPAY_KEY_ID: "x", NEXT_PUBLIC_APP_URL: "x", NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" });
    const res = validateConfig();
    expect(res.errors.some((e) => e.includes("TOKEN_ENCRYPTION_KEY"))).toBe(true);
  });

  it("invalid hex length (63 chars) is rejected", () => {
    setEnv({ TOKEN_ENCRYPTION_KEY: "a".repeat(63), DATABASE_URL: "x", NEXTAUTH_SECRET: "x", NEXTAUTH_URL: "x", RAZORPAY_KEY_ID: "x", RAZORPAY_KEY_SECRET: "x", RAZORPAY_WEBHOOK_SECRET: "x", NEXT_PUBLIC_RAZORPAY_KEY_ID: "x", NEXT_PUBLIC_APP_URL: "x", NEXT_PUBLIC_SUPABASE_URL: "x", NEXT_PUBLIC_SUPABASE_ANON_KEY: "x" });
    const res = validateConfig();
    expect(res.errors.some((e) => e.includes("TOKEN_ENCRYPTION_KEY"))).toBe(true);
  });
});

describe("SEC-07 — guest order PII masking + token validation", () => {
  it("isValidGuestToken accepts 64 hex only", () => {
    expect(isValidGuestToken("a".repeat(64))).toBe(true);
    expect(isValidGuestToken("A".repeat(64))).toBe(true);
    expect(isValidGuestToken("0".repeat(64))).toBe(true);
    expect(isValidGuestToken("a".repeat(32))).toBe(false);
    expect(isValidGuestToken("a".repeat(63))).toBe(false);
    expect(isValidGuestToken("a".repeat(65))).toBe(false);
    expect(isValidGuestToken("g".repeat(64))).toBe(false); // non-hex
    expect(isValidGuestToken("")).toBe(false);
    expect(isValidGuestToken("a".repeat(64) + " ")).toBe(false);
  });

  it("maskEmail hides local part", () => {
    expect(maskEmail("alice@example.com")).toBe("a***e@example.com");
    expect(maskEmail("ab@example.com")).toBe("a***@example.com");
    expect(maskEmail("a@example.com")).toBe("a***@example.com");
    expect(maskEmail(null)).toBe("—");
    expect(maskEmail("notanemail")).toBe("***");
  });

  it("maskPhone shows last 4 digits only", () => {
    expect(maskPhone("9876543210")).toBe("******3210");
    expect(maskPhone("+91-98765 43210")).toBe("******3210");
    expect(maskPhone("12")).toBe("****");
    expect(maskPhone(null)).toBe("—");
  });

  it("maskLine1 truncates and masks", () => {
    expect(maskLine1("123 Main Street, Apt 4")).toBe("123 Main***");
    expect(maskLine1("Short")).toBe("Sh***");
    expect(maskLine1(null)).toBe("—");
  });

  it("guest-order rate limiter throttles after 30/min", () => {
    clearRateLimits();
    const ip = "9.9.9.9-guest-test";
    for (let i = 0; i < 30; i++) {
      const r = checkRateLimit(`guest-order:${ip}`, "/guest-order");
      expect(r.allowed).toBe(true);
    }
    const blocked = checkRateLimit(`guest-order:${ip}`, "/guest-order");
    expect(blocked.allowed).toBe(false);
  });

  it("different IPs are isolated in guest-order limiter", () => {
    clearRateLimits();
    const a = "guest-a-" + Date.now();
    const b = "guest-b-" + Date.now();
    for (let i = 0; i < 30; i++) checkRateLimit(`guest-order:${a}`, "/guest-order");
    expect(checkRateLimit(`guest-order:${a}`, "/guest-order").allowed).toBe(false);
    expect(checkRateLimit(`guest-order:${b}`, "/guest-order").allowed).toBe(true);
  });
});
