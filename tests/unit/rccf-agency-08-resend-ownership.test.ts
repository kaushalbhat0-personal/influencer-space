import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { randomBytes } from "node:crypto";

const TEST_KEY_B64 = randomBytes(32).toString("base64");

// Helper to reset modules and env
async function resetEnv() {
  vi.resetModules();
  process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  vi.clearAllMocks();
}

describe("RCCF-AGENCY-08 — Agency-owned Resend cost isolation", () => {
  beforeEach(async () => {
    await resetEnv();
  });
  afterEach(async () => {
    vi.resetModules();
    delete process.env.TOKEN_ENCRYPTION_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });

  it("claim.invitation with agency verified Resend → provider tenant_resend", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const enc = encrypt("re_verified_agency_key_123");
    const verifiedRow = {
      id: "ti_agency", tenantId: "agency-tenant-1", provider: "resend", status: "verified", verificationStatus: "verified",
      credentials: { apiKey: enc }, metadata: { emailFrom: "Agency <noreply@agency.com>", domain: "agency.com", domainVerified: true },
      lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    };
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async (a: { where: { tenantId_provider: { tenantId: string } } }) => a.where.tenantId_provider.tenantId === "agency-tenant-1" ? verifiedRow : null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl1", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response)) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const prismaMock = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    const res = await sendCommunication("claim.invitation", { audience: "customer", recipientId: "prospect-tenant", email: "prospect@test.com" }, { agencyName: "Acme", prospectName: "Prospect", previewUrl: "https://a.com/p", claimUrl: "https://a.com/claim?token=abc&email=x", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-1" });
    expect(res.success).toBe(true);
    expect((prismaMock.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("tenant_resend");
  });

  it("claim.invitation with agency absent → provider log (never platform)", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl2", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => { throw new Error("should not be called for agency fallback"); }) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const prismaMock = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    const res = await sendCommunication("claim.invitation", { audience: "customer", recipientId: "t1", email: "p@test.com" }, { agencyName: "Acme", prospectName: "P", previewUrl: "https://a.com", claimUrl: "https://a.com/claim", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-no-config" });
    expect(res.success).toBe(true);
    expect((prismaMock.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("log");
  });

  it("claim.invitation with unverified agency → provider log", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const enc = encrypt("re_unverified_key");
    const pendingRow = {
      id: "ti1", tenantId: "agency-tenant-unverified", provider: "resend", status: "pending", verificationStatus: "unverified",
      credentials: { apiKey: enc }, metadata: { emailFrom: "Agency <noreply@agency.com>", domain: "agency.com", domainVerified: false },
      lastVerifiedAt: null, createdAt: new Date(), updatedAt: new Date(),
    };
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => pendingRow) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl3", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => { throw new Error("should not be called for unverified"); }) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const prismaMock = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    const res = await sendCommunication("claim.invitation", { audience: "customer", recipientId: "t1", email: "p@test.com" }, { agencyName: "Acme", prospectName: "P", previewUrl: "https://a.com", claimUrl: "https://a.com/claim", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-unverified" });
    expect(res.success).toBe(true);
    expect((prismaMock.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("log");
  });

  it("global platform Resend present + agency absent → still log (never platform_resend) for claim.invitation", async () => {
    process.env.RESEND_API_KEY = "re_platform_key";
    process.env.EMAIL_FROM = "Platform <noreply@platform.com>";
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl4", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => { throw new Error("platform should not be called for agency-owned"); }) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const prismaMock = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    const res = await sendCommunication("claim.invitation", { audience: "customer", recipientId: "t1", email: "p@test.com" }, { agencyName: "Acme", prospectName: "P", previewUrl: "https://a.com", claimUrl: "https://a.com/claim", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-no-config" });
    expect(res.success).toBe(true);
    expect((prismaMock.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("log");
  });

  it("global platform Resend present + agency configured → still tenant_resend (never platform)", async () => {
    process.env.RESEND_API_KEY = "re_platform_key";
    process.env.EMAIL_FROM = "Platform <noreply@platform.com>";
    const { encrypt } = await import("@/lib/crypto");
    const enc = encrypt("re_agency_verified");
    const verifiedRow = {
      id: "ti_agency", tenantId: "agency-tenant-1", provider: "resend", status: "verified", verificationStatus: "verified",
      credentials: { apiKey: enc }, metadata: { emailFrom: "Agency <noreply@agency.com>", domain: "agency.com", domainVerified: true },
      lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    };
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async (a: { where: { tenantId_provider: { tenantId: string } } }) => a.where.tenantId_provider.tenantId === "agency-tenant-1" ? verifiedRow : null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl5", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response)) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const prismaMock = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    const res = await sendCommunication("claim.invitation", { audience: "customer", recipientId: "t1", email: "p@test.com" }, { agencyName: "Acme", prospectName: "P", previewUrl: "https://a.com", claimUrl: "https://a.com/claim", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-1" });
    expect(res.success).toBe(true);
    expect((prismaMock.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("tenant_resend");
  });

  it("team.invitation mirrors agency-owned behavior (verified → tenant_resend, absent → log never platform)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const enc = encrypt("re_team_verified");
    const verifiedRow = {
      id: "ti_team", tenantId: "agency-tenant-team", provider: "resend", status: "verified", verificationStatus: "verified",
      credentials: { apiKey: enc }, metadata: { emailFrom: "Agency <noreply@agency.com>", domain: "agency.com", domainVerified: true },
      lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    };
    // verified case
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => verifiedRow) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl6", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response)) as unknown as typeof fetch;
    let { sendCommunication } = await import("@/modules/communication/application/runtime");
    let pm = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    let r = await sendCommunication("team.invitation", { audience: "agency", recipientId: "agency-1", email: "member@test.com" }, { agencyName: "Acme", roleLabel: "Team member", acceptUrl: "https://a.com/accept?token=abc", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-team" });
    expect(r.success).toBe(true);
    expect((pm.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("tenant_resend");

    // absent -> log even with global platform key
    vi.resetModules();
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    process.env.RESEND_API_KEY = "re_platform_key";
    process.env.EMAIL_FROM = "Platform <noreply@platform.com>";
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl7", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => { throw new Error("should not call platform for team absent"); }) as unknown as typeof fetch;
    ({ sendCommunication } = await import("@/modules/communication/application/runtime"));
    pm = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    r = await sendCommunication("team.invitation", { audience: "agency", recipientId: "agency-1", email: "member2@test.com" }, { agencyName: "Acme", roleLabel: "Team member", acceptUrl: "https://a.com/accept?token=abc", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-no-config" });
    expect(r.success).toBe(true);
    expect((pm.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("log");
  });

  it("order.customer_confirmed remains tenant-owned (verified → tenant_resend, absent → log)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const enc = encrypt("re_customer_verified");
    const verifiedRow = {
      id: "ti_cust", tenantId: "creator-tenant-1", provider: "resend", status: "verified", verificationStatus: "verified",
      credentials: { apiKey: enc }, metadata: { emailFrom: "Store <noreply@store.com>", domain: "store.com", domainVerified: true },
      lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    };
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async (a: { where: { tenantId_provider: { tenantId: string } } }) => a.where.tenantId_provider.tenantId === "creator-tenant-1" ? verifiedRow : null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl8", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response)) as unknown as typeof fetch;
    let { sendCommunication } = await import("@/modules/communication/application/runtime");
    let pm = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    let r = await sendCommunication("order.customer_confirmed", { audience: "customer", recipientId: "o1", email: "buyer@test.com" }, { orderId: "o1", productName: "P", amount: "99", storeName: "S", orderStatusUrl: "http://x" }, { tenantId: "creator-tenant-1" });
    expect((pm.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("tenant_resend");

    // absent still log, not platform, even with global key
    vi.resetModules();
    process.env.TOKEN_ENCRYPTION_KEY = TEST_KEY_B64;
    process.env.RESEND_API_KEY = "re_platform_key";
    process.env.EMAIL_FROM = "Platform <noreply@platform.com>";
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl9", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => { throw new Error("platform should not be called for tenant template absent"); }) as unknown as typeof fetch;
    ({ sendCommunication } = await import("@/modules/communication/application/runtime"));
    pm = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    r = await sendCommunication("order.customer_confirmed", { audience: "customer", recipientId: "o2", email: "buyer2@test.com" }, { orderId: "o2", productName: "P", amount: "99", storeName: "S", orderStatusUrl: "http://x" }, { tenantId: "creator-tenant-no-config" });
    expect((pm.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("log");
  });

  it("subscription.trial_ending remains platform-owned (uses global when present)", async () => {
    process.env.RESEND_API_KEY = "re_platform_key";
    process.env.EMAIL_FROM = "Platform <noreply@platform.com>";
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: { findUnique: vi.fn(async () => null) },
        communicationLog: { create: vi.fn(async () => ({ id: "cl10", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response)) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const pm = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    const r = await sendCommunication("subscription.trial_ending", { audience: "creator", recipientId: "t1", email: "creator@test.com" }, { plan: "Scale", days: "3" });
    expect(r.success).toBe(true);
    expect((pm.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("platform_resend");
  });

  it("Agency A cannot access Agency B credentials (tenant isolation)", async () => {
    const { encrypt } = await import("@/lib/crypto");
    const encA = encrypt("re_agency_A_key");
    const rowA = {
      id: "ti_A", tenantId: "agency-tenant-A", provider: "resend", status: "verified", verificationStatus: "verified",
      credentials: { apiKey: encA }, metadata: { emailFrom: "Agency A <noreply@a.com>", domain: "a.com", domainVerified: true },
      lastVerifiedAt: new Date(), createdAt: new Date(), updatedAt: new Date(),
    };
    // Mock findUnique to return rowA only for tenant A, null for B
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        tenantIntegration: {
          findUnique: vi.fn(async (a: { where: { tenantId_provider: { tenantId: string } } }) => a.where.tenantId_provider.tenantId === "agency-tenant-A" ? rowA : null),
        },
        communicationLog: { create: vi.fn(async () => ({ id: "cl11", retries: 0 })), update: vi.fn(async () => ({})) },
        notification: { create: vi.fn(async () => ({})) },
      },
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    global.fetch = vi.fn(async () => ({ ok: true, status: 200, text: async () => "{}", json: async () => ({}) } as unknown as Response)) as unknown as typeof fetch;
    const { sendCommunication } = await import("@/modules/communication/application/runtime");
    const pm = (await import("@/lib/prisma")).prisma as unknown as { communicationLog: { update: ReturnType<typeof vi.fn> } };
    // Agency B tries to use Agency A's tenantId — but we pass B's tenant which has no config, so log
    const r = await sendCommunication("claim.invitation", { audience: "customer", recipientId: "t1", email: "p@test.com" }, { agencyName: "Acme", prospectName: "P", previewUrl: "https://a.com", claimUrl: "https://a.com/claim", expiryDate: "2026-09-30" }, { tenantId: "agency-tenant-B" });
    expect((pm.communicationLog.update as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0].data.provider).toBe("log");
    expect(r.success).toBe(true);
  });

  it("AGENCY_STAFF cannot manage agency Resend (save → Forbidden)", async () => {
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        workspace: { findUnique: vi.fn(async () => ({ id: "ws-agency", agencyId: "agency-1" })) },
        websiteAgency: { findUnique: vi.fn(async () => ({ id: "agency-1", status: "ACTIVE" })) },
        workspaceMember: { findFirst: vi.fn(async () => ({ id: "m1", status: "ACTIVE" })) },
        tenant: { findUnique: vi.fn(async () => ({ id: "t-agency", name: "Agency" })), create: vi.fn(), update: vi.fn() },
        billingSubscription: { findFirst: vi.fn(async () => null) },
      },
    }));
    // Mock next-auth session as STAFF
    vi.doMock("next-auth", () => ({
      getServerSession: vi.fn(async () => ({ user: { id: "user-staff", role: "AGENCY_STAFF", agencyId: "agency-1", email: "staff@test.com" } })),
    }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    const mod = await import("@/actions/agency-integration.actions");
    const res = await mod.saveAgencyResendIntegration({ apiKey: "re_test_key_12345", emailFrom: "Agency <noreply@agency.com>" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
  });

});
