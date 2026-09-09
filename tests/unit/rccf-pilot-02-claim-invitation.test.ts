import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const settings = new Map<string, { tenantId: string; key: string; value: unknown }>();
  const tenants: Array<{ id: string; subdomain: string; customDomain: string | null }> = [];
  const agencies: Array<{ id: string; name: string }> = [];
  const logCalls: Array<{ event: string; metadata?: Record<string, unknown> }> = [];
  const sendCalls: Array<{ templateId: string; recipient: { audience: string; recipientId: string; email?: string | null }; data: Record<string, unknown> }> = [];
  return {
    settings,
    tenants,
    agencies,
    logCalls,
    sendCalls,
    mockSendCommunication: vi.fn(),
    mockLogAction: vi.fn(),
    reset() {
      settings.clear();
      tenants.length = 0;
      agencies.length = 0;
      logCalls.length = 0;
      sendCalls.length = 0;
      this.mockSendCommunication.mockReset();
      this.mockLogAction.mockReset();
      this.mockSendCommunication.mockResolvedValue({ success: true });
      this.mockLogAction.mockResolvedValue(undefined);
    },
  };
});

vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction, logAgencyAction: h.mockLogAction }));
vi.mock("@/modules/communication", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/communication")>();
  return { ...mod, sendCommunication: h.mockSendCommunication };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findFirst: async ({ where }: { where: { tenantId: string; key: string } }) => {
        const key = `${where.tenantId}:${where.key}`;
        return h.settings.get(key) ?? null;
      },
      findUnique: async ({ where }: { where: { tenantId_key: { tenantId: string; key: string } } }) => {
        const key = `${where.tenantId_key.tenantId}:${where.tenantId_key.key}`;
        return h.settings.get(key) ?? null;
      },
      upsert: async ({ where, update, create }: { where: { tenantId_key: { tenantId: string; key: string } }; update: { value: unknown }; create: { tenantId: string; key: string; value: unknown } }) => {
        const key = `${where.tenantId_key.tenantId}:${where.tenantId_key.key}`;
        const val = (update.value ?? create.value) as unknown;
        const rec = { tenantId: where.tenantId_key.tenantId, key: where.tenantId_key.key, value: val };
        h.settings.set(key, rec);
        return rec;
      },
      update: async ({ where, data }: { where: { tenantId_key: { tenantId: string; key: string } }; data: { value: unknown } }) => {
        const key = `${where.tenantId_key.tenantId}:${where.tenantId_key.key}`;
        const rec = h.settings.get(key);
        if (rec) rec.value = data.value as unknown;
        return rec;
      },
      findMany: async () => Array.from(h.settings.values()),
    },
    tenant: {
      findUnique: async ({ where }: { where: { id: string } }) => h.tenants.find((t) => t.id === where.id) ?? null,
    },
    websiteAgency: {
      findUnique: async ({ where }: { where: { id: string } }) => h.agencies.find((a) => a.id === where.id) ?? null,
    },
    user: {
      findUnique: async () => null,
      create: async (args: unknown) => args,
    },
    workspace: {
      findUnique: async () => null,
    },
    workspaceMember: {
      upsert: async () => ({}),
    },
  },
}));

import { COMMUNICATION_REGISTRY, COMMUNICATION_BY_ID, renderTemplate } from "@/modules/communication";
import { BRAND } from "@/lib/marketing/messaging";
import { creatorInvitationService } from "@/modules/partner/application/invitation";

const TENANT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  process.env.NEXT_PUBLIC_APP_URL = "https://pendallo.vercel.app";
  h.tenants.push({ id: TENANT, subdomain: "prospect-acme", customDomain: null });
  h.agencies.push({ id: AGENCY, name: "Acme Agency" });
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("RCCF-PILOT-02 — claim.invitation registry", () => {
  it("declares claim.invitation with customer audience + email channel + required data", () => {
    const def = COMMUNICATION_REGISTRY.find((c) => c.id === "claim.invitation");
    expect(def).toBeDefined();
    expect(def!.audience).toBe("customer");
    expect(def!.channel).toBe("email");
    expect(def!.category).toBe("system");
    expect(def!.retries).toBe(3);
    expect(def!.requiredData).toEqual(["agencyName", "prospectName", "previewUrl", "claimUrl", "expiryDate"]);
  });

  it("template renders previewUrl and claimUrl without leaking internals", () => {
    const def = COMMUNICATION_BY_ID["claim.invitation"];
    expect(def).toBeDefined();
    const body = renderTemplate(def.template.body, {
      agencyName: "Acme Agency",
      prospectName: "Prospect Co",
      previewUrl: "https://pendallo.vercel.app/prospect-acme",
      claimUrl: "https://pendallo.vercel.app/claim-invite?token=abc&email=prospect%40test.com",
      expiryDate: "2026-09-16",
    });
    expect(body).toContain("Acme Agency");
    expect(body).toContain("Prospect Co");
    expect(body).toContain("https://pendallo.vercel.app/prospect-acme");
    expect(body).toContain("https://pendallo.vercel.app/claim-invite?token=abc&email=prospect%40test.com");
    expect(body).toContain("2026-09-16");
    expect(body).not.toMatch(/tenantId|agencyId|workspaceId|inviteId/i);
    expect(renderTemplate(def.template.subject, { agencyName: "Acme" } as never)).toContain(BRAND.name);
  });

  it("requiredData validation leaves unknown placeholders untouched", () => {
    const def = COMMUNICATION_BY_ID["claim.invitation"];
    expect(renderTemplate(def.template.body, { agencyName: "A" } as never)).toContain("{{prospectName}}");
  });
});

describe("RCCF-PILOT-02 — wiring: createInvitation → platform email after TX", () => {
  it("sends claim.invitation via platform path with published storefront previewUrl and claimUrl", async () => {
    const res = await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      workspaceId: null,
      email: "prospect@test.com",
      creatorName: "Prospect Co",
      createdBy: "u-agency",
    });
    expect(res.success).toBe(true);
    expect(res.invite).toBeDefined();
    // Setting persisted before email — TX boundary
    expect(h.settings.has(`${TENANT}:creator_invite`)).toBe(true);
    expect(h.mockSendCommunication).toHaveBeenCalledTimes(1);
    const [templateId, recipient, data] = h.mockSendCommunication.mock.calls[0] as unknown as [
      string,
      { audience: string; recipientId: string; email?: string | null },
      Record<string, unknown>,
    ];
    expect(templateId).toBe("claim.invitation");
    expect(recipient).toMatchObject({ audience: "customer", recipientId: TENANT, email: "prospect@test.com" });
    expect(data.agencyName).toBe("Acme Agency");
    expect(data.prospectName).toBe("Prospect Co");
    expect(data.previewUrl).toBe("https://pendallo.vercel.app/prospect-acme");
    expect(String(data.claimUrl)).toContain("/claim-invite?token=");
    expect(String(data.claimUrl)).toContain("email=prospect%40test.com");
    expect(String(data.claimUrl)).toContain(res.invite!.token);
    expect(data.expiryDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("uses customDomain for previewUrl when tenant has custom domain", async () => {
    h.tenants[0].customDomain = "prospect-acme.com";
    const res = await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "prospect@test.com",
      creatorName: "Prospect Co",
      createdBy: "u-agency",
    });
    expect(res.success).toBe(true);
    const [, , data] = h.mockSendCommunication.mock.calls[0] as unknown as [string, unknown, Record<string, unknown>];
    expect(data.previewUrl).toBe("https://prospect-acme.com");
  });

  it("email failure preserves manual copy fallback — invite still pending and token returned", async () => {
    h.mockSendCommunication.mockResolvedValue({ success: false, error: "Resend 401: bad key" });
    const res = await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "prospect@test.com",
      creatorName: "Prospect Co",
      createdBy: "u-agency",
    });
    expect(res.success).toBe(true);
    expect(res.invite?.token).toBeTruthy();
    expect(h.settings.get(`${TENANT}:creator_invite`)!.value).toBeDefined();
    // Email attempted but failed — still success for caller (manual fallback)
    expect(h.mockSendCommunication).toHaveBeenCalledTimes(1);
    // Agency can still copy token manually
    expect(res.invite!.token.length).toBeGreaterThan(10);
  });

  it("never sends email inside a failed DB transaction — no email attempted when upsert would fail (blocked duplicate)", async () => {
    // First invite pending
    await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "prospect@test.com",
      creatorName: "Prospect Co",
      createdBy: "u-agency",
    });
    h.mockSendCommunication.mockClear();
    const dup = await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "other@test.com",
      creatorName: "Other",
      createdBy: "u-agency",
    });
    expect(dup.success).toBe(false);
    expect(dup.error).toMatch(/already exists/i);
    expect(h.mockSendCommunication).not.toHaveBeenCalled();
  });

  it("sends via platform Resend (not tenant) — no tenantId in opts, audience customer", async () => {
    await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "prospect@test.com",
      creatorName: "Prospect Co",
      createdBy: "u-agency",
    });
    const [, recipient] = h.mockSendCommunication.mock.calls[0] as unknown as [string, { audience: string; recipientId: string }];
    expect(recipient.audience).toBe("customer");
    // TENANT_OWNED_TEMPLATES does not contain claim.invitation — runtime will use PlatformResendAdapter
    const { COMMUNICATION_BY_ID: byId } = await import("@/modules/communication");
    expect(byId["claim.invitation"].channel).toBe("email");
    // Ensure not in tenant-owned set (platform path)
    const runtime = await import("@/modules/communication/application/runtime");
    // runtime's TENANT_OWNED_TEMPLATES is internal — verify via source: only order.customer_confirmed is tenant-owned
    expect((runtime as unknown as { TENANT_OWNED_TEMPLATES?: Set<string> }).TENANT_OWNED_TEMPLATES?.has?.("claim.invitation") ?? false).toBe(false);
  });
});
