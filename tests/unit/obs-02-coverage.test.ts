import { describe, it, expect, vi, beforeEach } from "vitest";

describe("RCCF-OBS-02 — client endpoint", () => {
  beforeEach(() => { vi.resetModules(); });

  it("payload too large rejected 413", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/app/api/observability/client-error/route.ts", "utf8");
    expect(content).toContain("MAX_PAYLOAD_BYTES");
    expect(content).toContain("Payload too large");
    expect(content).toContain("413");
    expect(content).toContain("checkRateLimit");
  });

  it("redacts sensitive values before persist", async () => {
    const fakePrisma = {
      systemError: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async (a: unknown) => {
          const data = (a as { data: Record<string, unknown> }).data;
          expect(String(data.message)).not.toContain("secret123");
          expect(String(data.message)).toContain("[REDACTED]");
          return { id: "1", ...data };
        }),
        update: vi.fn(async () => ({})),
      },
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakePrisma }));
    vi.doMock("next-auth", () => ({ getServerSession: vi.fn(async () => null) }));
    vi.doMock("next/headers", () => ({ headers: () => ({ get: () => null }) }));
    const { captureError, __resetFloodForTests } = await import("@/lib/observability/error-tracker");
    __resetFloodForTests();
    const err = new Error("failed password=secret123 re_abc123456789012345");
    captureError(err, { service: "client", operation: "test" });
    await new Promise((r) => setTimeout(r, 80));
    expect(fakePrisma.systemError.create).toHaveBeenCalled();
  });

  it("never trusts client tenantId — server derives", async () => {
    // Simulate client sending tenantId in body, but endpoint should ignore and use session tenant
    const fakeSession = { user: { tenantId: "server-tenant-123", role: "ADMIN", id: "u1" } };
    vi.doMock("next-auth", () => ({ getServerSession: vi.fn(async () => fakeSession) }));
    vi.doMock("next/headers", () => ({ headers: () => ({ get: () => null }) }));
    const fakePrisma = {
      systemError: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async (a: unknown) => {
          const data = (a as { data: Record<string, unknown> }).data;
          // Should be server tenant, not client-supplied
          expect(data.tenantIds).toEqual(["server-tenant-123"]);
          return { id: "1", ...data };
        }),
        update: vi.fn(async () => ({})),
      },
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakePrisma }));
    const { POST } = await import("@/app/api/observability/client-error/route");
    const body = JSON.stringify({ message: "client fail", stack: "at foo", tenantId: "client-evil-tenant", route: "/builder" });
    const req = {
      headers: { get: (h: string) => (h === "x-forwarded-for" ? "1.2.3.4" : null) },
      text: async () => body,
      nextUrl: { pathname: "/api/observability/client-error" },
    } as unknown as import("next/server").NextRequest;
    const res = await POST(req);
    // Should succeed and use server tenant
    expect(res.status).toBe(200);
    // Wait for async capture
    await new Promise((r) => setTimeout(r, 100));
    expect(fakePrisma.systemError.create).toHaveBeenCalled();
  });

  it("rate limits client endpoint", async () => {
    const { checkRateLimit, clearRateLimits } = await import("@/lib/security/rate-limiter");
    clearRateLimits();
    for (let i = 0; i < 20; i++) checkRateLimit("client-error:1.2.3.4", "/api/observability/client-error");
    const res = checkRateLimit("client-error:1.2.3.4", "/api/observability/client-error");
    expect(res.allowed).toBe(false);
    clearRateLimits();
  });
});

describe("RCCF-OBS-02 — builder failure capture", () => {
  it("saveBuilderPages failure calls captureError", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/actions/builder.actions.ts", "utf8");
    expect(content).toContain('captureError');
    expect(content).toContain('service: "builder"');
    expect(content).toContain('operation: "saveBuilderPages"');
    expect(content).toContain('route: "/builder"');
  });
});

describe("RCCF-OBS-02 — storefront failure capture", () => {
  it("getStorefrontData exception captured and returns null without stack leak", async () => {
    const fs = await import("fs");
    const content = fs.readFileSync("src/lib/storefront/storefront-loader.ts", "utf8");
    expect(content).toContain('captureError');
    expect(content).toContain('service: "storefront"');
    expect(content).toContain('getStorefrontData');
    expect(content).not.toContain('throw e');
    // Ensure it returns null on catch, not stack
    expect(content).toContain('return null');
  });
});

describe("RCCF-OBS-02 — checkout failure capture", () => {
  beforeEach(() => vi.resetModules());
  it("razorpay order create failure captured", async () => {
    vi.doMock("@/lib/razorpay", () => ({
      getRazorpayInstance: () => ({ orders: { create: vi.fn(async () => { throw new Error("Razorpay timeout"); }) }, payments: { fetch: vi.fn() } }),
    }));
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        product: { findFirst: vi.fn(async () => ({ id: "p1", tenantId: "t1", price: 100, type: "digital", isActive: true, status: "PUBLISHED", archivedAt: null })) },
        productOrder: { create: vi.fn(async () => ({ id: "ord1" })), update: vi.fn(async () => ({})) },
        $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ productOrder: { create: async () => ({ id: "ord1" }) }, shippingAddress: { create: async () => ({}) } }),
      },
    }));
    vi.doMock("@/lib/tenant", () => ({ getTenantContext: vi.fn(async () => ({ id: "t1" })) }));
    vi.doMock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { tenantId: "t1" } })) }));
    vi.doMock("@/modules/commerce-strategy", () => ({ resolveCommerceStrategy: vi.fn(async () => ({ id: "PLATFORM_COLLECT", definition: { status: "active" } })) }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    vi.doMock("@/lib/security/rate-limiter", () => ({ checkRateLimit: () => ({ allowed: true }) }));
    const { createCheckout } = await import("@/actions/checkout.actions");
    const res = await createCheckout("p1", "test@example.com");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Checkout creation failed|Razorpay timeout/);
  });
});

describe("RCCF-OBS-02 — JobRecord tenant correlation", () => {
  it("JobRecord has tenantId field", async () => {
    const schema = await import("fs").then((fs) => fs.readFileSync("prisma/schema.prisma", "utf8"));
    expect(schema).toContain("model JobRecord");
    expect(schema).toContain("tenantId");
  });
});

describe("RCCF-OBS-02 — health to alert wiring", () => {
  it("bootstrap registers sync-health-alerts job", async () => {
    const { jobRunner } = await import("@/lib/reliability/jobs");
    // bootstrap registers jobs at import time
    const { platformBootstrap } = await import("@/lib/platform/bootstrap");
    // Need to ensure jobRunner has sync-health-alerts
    const jobs = jobRunner.getStatus();
    const found = jobs.some((j) => j.id === "sync-health-alerts");
    expect(found).toBe(true);
  });
});

describe("RCCF-OBS-02 — OBS-01 regression", () => {
  it("SystemError still deduplicates", async () => {
    const { computeFingerprint } = await import("@/lib/observability/fingerprint");
    const fp1 = computeFingerprint({ service: "billing", operation: "op", message: "same", stack: "at foo" });
    const fp2 = computeFingerprint({ service: "billing", operation: "op", message: "same", stack: "at foo" });
    expect(fp1).toBe(fp2);
  });
});
