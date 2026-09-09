import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const h = vi.hoisted(() => {
  const creatorSettings = new Map<string, { tenantId: string; key: string; value: unknown }>();
  const teamInvites: Array<{ id: string; workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string }> = [];
  const workspaces: Array<{ id: string; agencyId: string }> = [];
  const sendCalls: Array<unknown> = [];
  return {
    creatorSettings,
    teamInvites,
    workspaces,
    sendCalls,
    mockSendCommunication: vi.fn(),
    mockLogAction: vi.fn(),
    mockResolveActivePlan: vi.fn(),
    reset() {
      creatorSettings.clear();
      teamInvites.length = 0;
      workspaces.length = 0;
      sendCalls.length = 0;
      this.mockSendCommunication.mockReset();
      this.mockLogAction.mockReset();
      this.mockResolveActivePlan.mockReset();
      this.mockSendCommunication.mockResolvedValue({ success: true });
      this.mockLogAction.mockResolvedValue(undefined);
      this.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    },
  };
});

vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction, logAgencyAction: h.mockLogAction }));
vi.mock("@/modules/communication", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/communication")>();
  return { ...mod, sendCommunication: h.mockSendCommunication };
});
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findFirst: vi.fn(async ({ where }: { where: { tenantId: string; key: string } }) => {
        const key = `${where.tenantId}:${where.key}`;
        return h.creatorSettings.get(key) ?? null;
      }),
      findUnique: vi.fn(async ({ where }: { where: { tenantId_key: { tenantId: string; key: string } } }) => {
        const key = `${where.tenantId_key.tenantId}:${where.tenantId_key.key}`;
        return h.creatorSettings.get(key) ?? null;
      }),
      upsert: vi.fn(async ({ where, update, create }: { where: { tenantId_key: { tenantId: string; key: string } }; update: { value: unknown }; create: { tenantId: string; key: string; value: unknown } }) => {
        const key = `${where.tenantId_key.tenantId}:${where.tenantId_key.key}`;
        const val = (update.value ?? create.value) as unknown;
        const rec = { tenantId: where.tenantId_key.tenantId, key: where.tenantId_key.key, value: val };
        h.creatorSettings.set(key, rec);
        return rec;
      }),
      update: vi.fn(async ({ where, data }: { where: { tenantId_key: { tenantId: string; key: string } }; data: { value: unknown } }) => {
        const key = `${where.tenantId_key.tenantId}:${where.tenantId_key.key}`;
        const rec = h.creatorSettings.get(key);
        if (rec) rec.value = data.value as unknown;
        return rec;
      }),
      findMany: vi.fn(async () => Array.from(h.creatorSettings.values())),
    },
    tenant: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ subdomain: "pilot-acme", customDomain: null, id: where.id })),
    },
    websiteAgency: {
      findUnique: vi.fn(async ({ where }: { where: { id: string } }) => ({ name: "Acme Agency", id: where.id })),
    },
    website: { findUnique: vi.fn(async () => null) },
    workspace: {
      findUnique: vi.fn(async ({ where }: { where: { agencyId: string } }) => h.workspaces.find((w) => w.agencyId === where.agencyId) ?? null),
    },
    workspaceMember: {
      count: vi.fn(async ({ where }: { where: { workspaceId: string; status: string } }) => 0),
      findUnique: vi.fn(async () => null),
    },
    agencyTeamInvitation: {
      findFirst: vi.fn(async ({ where }: { where: { workspaceId: string; email: string; status: string } }) => h.teamInvites.find((i) => i.workspaceId === where.workspaceId && i.email === where.email && i.status === where.status) ?? null),
      findUnique: vi.fn(async ({ where }: { where: { token: string } }) => h.teamInvites.find((i) => i.token === where.token) ?? null),
      create: vi.fn(async ({ data }: { data: { workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string } }) => {
        const inv = { id: `inv-${h.teamInvites.length + 1}`, ...data };
        h.teamInvites.push(inv);
        return inv;
      }),
      update: vi.fn(async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        const inv = h.teamInvites.find((i) => i.id === where.id);
        if (inv) Object.assign(inv, data);
        return inv;
      }),
    },
    user: { findUnique: vi.fn(async () => null) },
    publishStatus: { findUnique: vi.fn(async () => null) },
    publishSnapshot: { findFirst: vi.fn(async () => null) },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === "function") return (arg as (tx: unknown) => unknown)({ $queryRaw: async () => {}, user: { findUnique: async () => null, update: async () => ({}) }, workspaceMember: { count: async () => 0, findUnique: async () => null, create: async () => ({}) }, agencyTeamInvitation: { update: async () => ({}) } });
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    }),
  },
}));

import { creatorInvitationService } from "@/modules/partner/application/invitation";
import { partnerTeamService } from "@/modules/partner/application/team-membership";

const TENANT = "tenant-1";
const AGENCY = "agency-1";
const WS = "ws-1";

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  process.env.NEXT_PUBLIC_APP_URL = "https://pendallo.vercel.app";
  h.workspaces.push({ id: WS, agencyId: AGENCY });
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("RCCF-PILOT-03 A — expired creator invitation can be replaced", () => {
  it("expired pending allows new invitation (marks expired)", async () => {
    const expiredInvite = {
      token: "oldtoken1234567890oldtoken1234567890oldtoken12",
      email: "prospect@test.com",
      creatorName: "Prospect",
      agencyId: AGENCY,
      tenantId: TENANT,
      workspaceId: null,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
      status: "pending" as const,
      createdBy: "u1",
    };
    h.creatorSettings.set(`${TENANT}:creator_invite`, { tenantId: TENANT, key: "creator_invite", value: expiredInvite });

    const res = await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "prospect@test.com",
      creatorName: "Prospect",
      createdBy: "u1",
    });
    expect(res.success).toBe(true);
    expect(res.invite?.token).not.toBe(expiredInvite.token);
    expect(res.invite?.status).toBe("pending");
  });

  it("non-expired pending remains protected", async () => {
    const pendingInvite = {
      token: "pendingtoken1234567890pendingtoken123456",
      email: "prospect@test.com",
      creatorName: "Prospect",
      agencyId: AGENCY,
      tenantId: TENANT,
      workspaceId: null,
      expiresAt: new Date(Date.now() + 86400000).toISOString(),
      status: "pending" as const,
      createdBy: "u1",
    };
    h.creatorSettings.set(`${TENANT}:creator_invite`, { tenantId: TENANT, key: "creator_invite", value: pendingInvite });

    const res = await creatorInvitationService.createInvitation({
      agencyId: AGENCY,
      tenantId: TENANT,
      email: "prospect@test.com",
      creatorName: "Prospect",
      createdBy: "u1",
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/already exists/i);
  });
});

describe("RCCF-PILOT-03 A — expired agency team invitation can be replaced", () => {
  it("expired pending allows new team invitation", async () => {
    // seed expired team invite
    h.teamInvites.push({
      id: "inv-old",
      workspaceId: WS,
      agencyId: AGENCY,
      email: "new@test.com",
      role: "AGENCY_STAFF",
      token: "tok-old",
      status: "pending",
      expiresAt: new Date(Date.now() - 1000),
      invitedById: "u1",
    });
    const res = await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u1", email: "new@test.com", role: "AGENCY_STAFF" });
    expect(res.token).toBeTruthy();
    expect(res.token).not.toBe("tok-old");
    // old should be marked expired
    expect(h.teamInvites.find((i) => i.id === "inv-old")?.status).toBe("expired");
  });

  it("non-expired pending blocks duplicate team invitation", async () => {
    h.teamInvites.push({
      id: "inv-pending",
      workspaceId: WS,
      agencyId: AGENCY,
      email: "new@test.com",
      role: "AGENCY_STAFF",
      token: "tok-pending",
      status: "pending",
      expiresAt: new Date(Date.now() + 86400000),
      invitedById: "u1",
    });
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u1", email: "new@test.com", role: "AGENCY_STAFF" })).rejects.toThrow(/pending invitation/i);
  });
});
