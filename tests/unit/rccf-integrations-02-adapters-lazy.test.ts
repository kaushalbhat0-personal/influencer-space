import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: { create: vi.fn(async () => ({})) },
  },
}));

describe("RCCF-INTEGRATIONS-02 — communicationAdapters lazy email resolution", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  afterEach(() => {
    process.env = { ...origEnv };
    vi.resetModules();
  });

  it("getAdapter(email) is lazy — reflects env change without module re-import", async () => {
    const mod = await import("@/modules/communication/application/adapters");
    // Initially no keys → log adapter
    expect(mod.getAdapter("email")?.constructor.name).toBe("EmailLogAdapter");
    expect(mod.__testables.resolveEmailAdapter().constructor.name).toBe("EmailLogAdapter");

    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "Pendallo <noreply@pendallo.in>";

    // Same module instance, fresh env → should now resolve to Resend
    expect(mod.getAdapter("email")?.constructor.name).toBe("ResendEmailAdapter");
    expect(mod.__testables.resolveEmailAdapter().constructor.name).toBe("ResendEmailAdapter");

    delete process.env.RESEND_API_KEY;
    expect(mod.getAdapter("email")?.constructor.name).toBe("EmailLogAdapter");
  });

  it("communicationAdapters.email getter is also lazy", async () => {
    const mod = await import("@/modules/communication/application/adapters");
    expect(mod.communicationAdapters.email.constructor.name).toBe("EmailLogAdapter");

    process.env.RESEND_API_KEY = "re_test_999";
    process.env.EMAIL_FROM = "Pendallo <noreply@pendallo.in>";
    expect(mod.communicationAdapters.email.constructor.name).toBe("ResendEmailAdapter");
  });

  it("in_app and alert adapters remain singletons (not env-dependent)", async () => {
    const mod = await import("@/modules/communication/application/adapters");
    const a1 = mod.getAdapter("in_app");
    const a2 = mod.getAdapter("in_app");
    expect(a1).toBe(a2);
    const b1 = mod.getAdapter("alert");
    const b2 = mod.getAdapter("alert");
    expect(b1).toBe(b2);
  });

  it("preserves EmailLogAdapter fallback when RESEND config incomplete", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    // EMAIL_FROM missing → still log
    const mod = await import("@/modules/communication/application/adapters");
    expect(mod.getAdapter("email")?.constructor.name).toBe("EmailLogAdapter");
  });

  it("Resend behavior unchanged — deliver returns resend provider on success", async () => {
    process.env.RESEND_API_KEY = "re_test_123";
    process.env.EMAIL_FROM = "Pendallo <noreply@pendallo.in>";
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response));
    const { __testables } = await import("@/modules/communication/application/adapters");
    const adapter = new __testables.ResendEmailAdapter();
    const res = await adapter.deliver({
      templateId: "order.customer_confirmed",
      recipient: { audience: "customer", recipientId: "r1", email: "a@b.com" },
      channel: "email",
      subject: "s",
      body: "b",
      payload: {},
    });
    expect(res.provider).toBe("resend");
    expect(res.success).toBe(true);
  });
});
