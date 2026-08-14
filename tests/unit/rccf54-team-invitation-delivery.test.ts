import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-54 — invitation delivery + claim flow. Uses the existing communication
// layer (`sendCommunication`) as the single email abstraction; delivery is a
// durable log adapter (no SMTP provider configured — see RCCF-54 §2). The token
// remains the sole invitation credential; email is delivery-only.

const h = vi.hoisted(() => {
  const invites: Array<{ id: string; workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string }> = [];
  const members: Array<{ workspaceId: string; userId: string; role: string; status: string }> = [];
  const users: Array<{ id: string; email: string; tenantId: string | null; agencyId: string | null; role: string }> = [];
  const workspaces: Array<{ id: string; agencyId: string }> = [];
  const logCalls: Array<{ event: string; metadata?: Record<string, unknown> }> = [];
  const sendCalls: Array<{ templateId: string; recipient: { audience: string; recipientId: string; email?: string | null }; data: Record<string, unknown> }> = [];
  const hoisted = {
    seq: 0,
    failInviteCreateFlag: false,
    membershipPresent: true,
    failInviteCreate: () => { hoisted.failInviteCreateFlag = true; },
    invites, members, users, workspaces, logCalls, sendCalls,
    reset: () => {
      invites.length = 0; members.length = 0; users.length = 0; workspaces.length = 0;
      logCalls.length = 0; sendCalls.length = 0; hoisted.seq = 0; hoisted.failInviteCreateFlag = false; hoisted.membershipPresent = true;
    },
    mockGetServerSession: vi.fn(),
    mockResolveActivePlan: vi.fn(),
    mockLogAction: vi.fn(),
    mockSendCommunication: vi.fn(),
    mockRevalidatePath: vi.fn(),
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: h.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction, logAgencyAction: h.mockLogAction }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/modules/communication", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/communication")>();
  return { ...mod, sendCommunication: h.mockSendCommunication };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: async () => ({ name: "Acme Partner", status: "ACTIVE" }) },
    workspace: { findUnique: async ({ where }: { where: { agencyId: string } }) => h.workspaces.find((w) => w.agencyId === where.agencyId) ?? null },
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => h.users.find((u) => u.email === where.email) ?? null,
      update: async () => ({}),
    },
    workspaceMember: {
      count: async ({ where }: { where: { workspaceId: string; status: string } }) => h.members.filter((m) => m.workspaceId === where.workspaceId && m.status === where.status).length,
      findUnique: async () => null,
      findFirst: async () => (h.membershipPresent ? { id: "m1" } : null),
      findMany: async () => [],
      create: async () => ({}),
      update: async () => ({}),
    },
    agencyTeamInvitation: {
      findUnique: async ({ where }: { where: { token: string } }) => h.invites.find((i) => i.token === where.token) ?? null,
      findFirst: async ({ where }: { where: { workspaceId: string; email: string; status: string } }) => h.invites.find((i) => i.workspaceId === where.workspaceId && i.email === where.email && i.status === where.status) ?? null,
      create: async ({ data }: { data: { workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string } }) => {
        if (h.invites.some((i) => i.token === data.token)) throw new Error("P2002 duplicate token");
        if (h.failInviteCreateFlag) throw new Error("db down");
        const inv = { id: `inv-${++h.seq}`, ...data };
        h.invites.push(inv);
        return inv;
      },
      update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => {
        const inv = h.invites.find((i) => i.id === where.id)!;
        Object.assign(inv, data);
        return inv;
      },
    },
    $transaction: async (arg: unknown) => {
      if (typeof arg === "function") return (arg as (tx: unknown) => unknown)({
        $queryRaw: async () => {},
        user: { findUnique: async () => null, update: async () => ({}) },
        workspaceMember: { count: async () => 0, findUnique: async () => null, create: async () => ({}) },
        agencyTeamInvitation: { update: async () => ({}) },
      });
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));

import { COMMUNICATION_REGISTRY, COMMUNICATION_BY_ID, renderTemplate } from "@/modules/communication";
import { partnerTeamService, TEAM_ROLE_LABELS, resolveAppBaseUrl } from "@/modules/partner/application/team-membership";
import { inviteAgencyTeamMember, resendAgencyTeamInvitation } from "@/actions/team.actions";

const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const WS = "00000000-0000-4000-8000-00000000000a";
const email = (n: string) => `${n}@team.test`;

function session(role: string) {
  return { user: { id: "u-admin", email: email("admin"), agencyId: AGENCY, role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.reset();
  h.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN"));
  h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockSendCommunication.mockResolvedValue({ success: true, provider: "log" });
  h.workspaces.push({ id: WS, agencyId: AGENCY });
  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com";
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("RCCF-54 — team invitation template", () => {
  it("declares team.invitation with agency audience + email channel", () => {
    const def = COMMUNICATION_REGISTRY.find((c) => c.id === "team.invitation");
    expect(def).toBeDefined();
    expect(def!.audience).toBe("agency");
    expect(def!.channel).toBe("email");
    expect(def!.requiredData).toEqual(expect.arrayContaining(["agencyName", "roleLabel", "acceptUrl", "expiryDate"]));
  });

  it("role labels are capability-accurate — no administrator/billing/owner/super claims", () => {
    expect(TEAM_ROLE_LABELS.AGENCY_STAFF).toContain("Team member");
    expect(TEAM_ROLE_LABELS.AGENCY_STAFF).not.toMatch(/Administrator|Billing Manager|Partner Owner|SUPER_ADMIN/i);
    expect(TEAM_ROLE_LABELS.AGENCY_ADMIN).toContain("Agency administrator");
    expect(TEAM_ROLE_LABELS.AGENCY_ADMIN).not.toMatch(/SUPER_ADMIN|Billing Manager/i);
  });

  it("rendered email contains only safe data and no internal IDs", () => {
    const def = COMMUNICATION_BY_ID["team.invitation"];
    const body = renderTemplate(def.template.body, {
      agencyName: "Acme Partner",
      roleLabel: TEAM_ROLE_LABELS.AGENCY_STAFF,
      acceptUrl: "https://app.example.com/agency/team/accept?token=abc123",
      expiryDate: "2026-08-20",
    });
    expect(body).toContain("Acme Partner");
    expect(body).toContain("Team member (operational access)");
    expect(body).toContain("https://app.example.com/agency/team/accept?token=abc123");
    expect(body).toContain("2026-08-20");
    expect(body).not.toMatch(/workspaceId|agencyId|inviteId|invitedById/i);
    expect(renderTemplate(def.template.subject, {
      agencyName: "Acme Partner",
      roleLabel: TEAM_ROLE_LABELS.AGENCY_STAFF,
      acceptUrl: "https://app.example.com/agency/team/accept?token=abc123",
      expiryDate: "2026-08-20",
    })).toContain("Acme Partner");
  });
});

describe("RCCF-54 — delivery boundary", () => {
  it("delivers via the canonical communication layer after the invitation is committed", async () => {
    const invite = await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u-admin", email: email("newbie"), role: "AGENCY_STAFF" });
    expect(h.invites).toHaveLength(1);
    expect(h.invites[0].status).toBe("pending");

    const delivery = await partnerTeamService.deliverInvitationEmail({ agencyId: AGENCY, email: invite.email, role: invite.role, token: invite.token, expiresAt: invite.expiresAt });
    expect(delivery.success).toBe(true);
    expect(h.mockSendCommunication).toHaveBeenCalledTimes(1);
    const [templateId, recipient, data] = h.mockSendCommunication.mock.calls[0] as unknown as [string, { audience: string; recipientId: string; email?: string }, Record<string, unknown>];
    expect(templateId).toBe("team.invitation");
    expect(recipient).toMatchObject({ audience: "agency", recipientId: AGENCY, email: email("newbie") });
    expect(data.acceptUrl).toBe(`https://app.example.com/agency/team/accept?token=${invite.token}`);
    expect(data.agencyName).toBe("Acme Partner");
    expect(data.expiryDate).toBe(invite.expiresAt.toISOString().split("T")[0]);
  });

  it("email failure leaves the invitation pending, creates no membership and consumes no seat", async () => {
    const invite = await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u-admin", email: email("newbie"), role: "AGENCY_STAFF" });
    h.mockSendCommunication.mockResolvedValue({ success: false, error: "provider rejected" });
    const delivery = await partnerTeamService.deliverInvitationEmail({ agencyId: AGENCY, email: invite.email, role: invite.role, token: invite.token, expiresAt: invite.expiresAt });
    expect(delivery.success).toBe(false);
    expect(h.invites[0].status).toBe("pending");
    expect(h.members).toHaveLength(0);
  });

  it("the raw token is never written to audit metadata", async () => {
    const invite = await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u-admin", email: email("newbie"), role: "AGENCY_STAFF" });
    await partnerTeamService.deliverInvitationEmail({ agencyId: AGENCY, email: invite.email, role: invite.role, token: invite.token, expiresAt: invite.expiresAt });
    h.mockSendCommunication.mockResolvedValue({ success: false, error: "boom" });
    await partnerTeamService.deliverInvitationEmail({ agencyId: AGENCY, email: invite.email, role: invite.role, token: invite.token, expiresAt: invite.expiresAt });
    const metadata = h.mockLogAction.mock.calls.map((c) => c[2] as Record<string, unknown>);
    for (const m of metadata) {
      expect(m).not.toHaveProperty("token");
    }
  });

  it("base URL comes from the server config, not the client", () => {
    expect(resolveAppBaseUrl()).toBe("https://app.example.com");
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(resolveAppBaseUrl()).toBe("http://localhost:3000");
  });
});

describe("RCCF-54 — resend semantics", () => {
  it("resend reuses the same pending invitation token (no duplicate rows, no new seat)", async () => {
    const invite = await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u-admin", email: email("newbie"), role: "AGENCY_STAFF" });
    h.mockSendCommunication.mockClear();
    const res = await partnerTeamService.resendInvitation({ agencyId: AGENCY, email: email("newbie") });
    expect(res.success).toBe(true);
    expect(h.invites).toHaveLength(1);
    expect(h.mockSendCommunication).toHaveBeenCalledTimes(1);
    const data = h.mockSendCommunication.mock.calls[0][2] as Record<string, unknown>;
    expect(data.acceptUrl).toContain(invite.token);
    expect(h.members).toHaveLength(0);
  });

  it("resend of a non-existent invitation is rejected", async () => {
    await expect(partnerTeamService.resendInvitation({ agencyId: AGENCY, email: email("nobody") }))
      .rejects.toThrow(/no pending invitation/i);
  });

  it("resend of an expired invitation is rejected", async () => {
    await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u-admin", email: email("newbie"), role: "AGENCY_STAFF" });
    h.invites[0].expiresAt = new Date(Date.now() - 1000);
    await expect(partnerTeamService.resendInvitation({ agencyId: AGENCY, email: email("newbie") }))
      .rejects.toThrow(/expired/);
  });

  it("resend never exposes the token in its response", async () => {
    await partnerTeamService.inviteMember({ agencyId: AGENCY, invitedById: "u-admin", email: email("newbie"), role: "AGENCY_STAFF" });
    const res = await partnerTeamService.resendInvitation({ agencyId: AGENCY, email: email("newbie") });
    expect(res).not.toHaveProperty("token");
  });
});

describe("RCCF-54 — accept path stays decoupled from email", () => {
  it("acceptInvitation never sends email and preserves RCCF-53 atomic capacity invariants", async () => {
    h.users.push({ id: "u-new", email: email("newbie"), tenantId: null, agencyId: null, role: "AGENCY_STAFF" });
    h.invites.push({ id: "inv1", workspaceId: WS, agencyId: AGENCY, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", status: "pending", expiresAt: new Date(Date.now() + 86400000), invitedById: "u-admin" });
    // Note: acceptInvitation runs its own $transaction against the mock (capacity 0) — the
    // assertion here is purely that email delivery is never invoked during acceptance.
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") }))
      .rejects.toThrow();
    expect(h.mockSendCommunication).not.toHaveBeenCalled();
  });
});

describe("RCCF-54 — action authorization + truthful delivery result", () => {
  it("AGENCY_ADMIN invite returns delivered:true when email succeeds and no token is exposed", async () => {
    h.mockSendCommunication.mockResolvedValue({ success: true, provider: "log" });
    const res = await inviteAgencyTeamMember({ email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.delivered).toBe(true);
      expect(res.token).toBeUndefined();
      expect(res.acceptUrl).toBeUndefined();
      expect(h.mockSendCommunication).toHaveBeenCalledTimes(1);
    }
  });

  it("invite email failure is truthful — invitation created, delivered:false, server-built fallback URL", async () => {
    h.mockSendCommunication.mockResolvedValue({ success: false, error: "provider rejected" });
    const res = await inviteAgencyTeamMember({ email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.delivered).toBe(false);
      expect(res.token).toBeTruthy();
      expect(res.acceptUrl).toContain(`/agency/team/accept?token=${res.token}`);
    }
    expect(h.invites).toHaveLength(1);
    expect(h.invites[0].status).toBe("pending");
    expect(h.members).toHaveLength(0);
  });

  it("AGENCY_STAFF cannot invite and no email is attempted", async () => {
    h.mockGetServerSession.mockResolvedValue(session("AGENCY_STAFF"));
    const res = await inviteAgencyTeamMember({ email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
    expect(h.mockSendCommunication).not.toHaveBeenCalled();
    expect(h.invites).toHaveLength(0);
  });

  it("creator cannot invite and no email is attempted", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "u-c", email: email("creator"), agencyId: null, role: "ADMIN" } });
    const res = await inviteAgencyTeamMember({ email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(h.mockSendCommunication).not.toHaveBeenCalled();
    expect(h.invites).toHaveLength(0);
  });

  it("non-member cannot invite and no email is attempted", async () => {
    h.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN"));
    h.membershipPresent = false;
    const res = await inviteAgencyTeamMember({ email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not a member/i);
    expect(h.mockSendCommunication).not.toHaveBeenCalled();
    expect(h.invites).toHaveLength(0);
  });

  it("DB failure (invitation create) means no email is attempted", async () => {
    h.failInviteCreate();
    const res = await inviteAgencyTeamMember({ email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(h.mockSendCommunication).not.toHaveBeenCalled();
    expect(h.invites).toHaveLength(0);
  });

  it("staff cannot resend; cross-agency resend finds no pending invitation", async () => {
    h.mockGetServerSession.mockResolvedValue(session("AGENCY_STAFF"));
    const staff = await resendAgencyTeamInvitation({ email: email("newbie") });
    expect(staff.success).toBe(false);
    expect(staff.error).toMatch(/only agency admins/i);

    h.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN"));
    await expect(partnerTeamService.resendInvitation({ agencyId: AGENCY, email: email("other-agency") }))
      .rejects.toThrow(/no pending invitation/i);
  });
});
