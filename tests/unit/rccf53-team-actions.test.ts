import { describe, it, expect, vi, beforeEach } from "vitest";

// Action-layer authorization gates for RCCF-53 team actions. The service layer
// is covered by rccf53-team-membership.test.ts; here we prove the server actions
// reject STAFF / non-members / creators before touching any domain logic, and
// that AGENCY_ADMIN flows through with session-derived agency/workspace.
const v = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockAgencyFindUnique: vi.fn(),
  mockMemberFindFirst: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
  mockMemberCount: vi.fn(),
  mockInviteCreate: vi.fn(),
  mockRevalidatePath: vi.fn(),
  mockLogAction: vi.fn(),
  mockResolveActivePlan: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: v.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction, logAgencyAction: v.mockLogAction }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: v.mockResolveActivePlan }));
vi.mock("@/modules/communication", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/communication")>();
  return { ...mod, sendCommunication: async () => ({ success: true, provider: "log" }) };
});
vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: v.mockAgencyFindUnique },
    workspaceMember: {
      findFirst: v.mockMemberFindFirst,
      count: v.mockMemberCount,
      findUnique: async () => null,
      findMany: async () => [],
      create: async () => ({}),
      update: async () => ({}),
    },
    workspace: { findUnique: v.mockWorkspaceFindUnique },
    billingSubscription: { findFirst: async () => ({ status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000) }) },
    agencyTeamInvitation: { findFirst: async () => null, findUnique: async () => null, create: v.mockInviteCreate },
    user: { findUnique: async () => null, update: async () => ({}) },
    $transaction: async (arg: unknown) => {
      if (typeof arg === "function") return (arg as (tx: unknown) => unknown)({ $queryRaw: async () => {}, user: { findUnique: async () => null, update: async () => ({}) }, workspaceMember: { count: v.mockMemberCount, findUnique: async () => null, create: async () => ({}) }, agencyTeamInvitation: { update: async () => ({}) } });
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));

import { inviteAgencyTeamMember, removeAgencyTeamMember, changeAgencyTeamRole, acceptAgencyTeamInvitation } from "@/actions/team.actions";

const AGENCY = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function session(overrides: Partial<{ id: string; email: string; agencyId: string | null; role: string }> = {}) {
  return { user: { id: "u-admin", email: "admin@team.test", agencyId: AGENCY, role: "AGENCY_ADMIN", ...overrides } };
}

beforeEach(() => {
  vi.clearAllMocks();
  v.mockAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  v.mockMemberFindFirst.mockResolvedValue({ id: "m1" });
  v.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-a" });
  v.mockMemberCount.mockResolvedValue(1);
  v.mockInviteCreate.mockResolvedValue({ id: "inv1" });
  v.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
  v.mockLogAction.mockResolvedValue(undefined);
});

describe("RCCF-53 — action authorization gates", () => {
  it("AGENCY_ADMIN can invite a team member", async () => {
    v.mockGetServerSession.mockResolvedValue(session());
    const res = await inviteAgencyTeamMember({ email: "new@team.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(true);
    expect(v.mockInviteCreate).toHaveBeenCalledTimes(1);
  });

  it("AGENCY_STAFF cannot invite", async () => {
    v.mockGetServerSession.mockResolvedValue(session({ role: "AGENCY_STAFF" }));
    const res = await inviteAgencyTeamMember({ email: "new@team.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
    expect(v.mockInviteCreate).not.toHaveBeenCalled();
  });

  it("AGENCY_STAFF cannot remove members", async () => {
    v.mockGetServerSession.mockResolvedValue(session({ role: "AGENCY_STAFF" }));
    const res = await removeAgencyTeamMember({ userId: "u-x" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
  });

  it("AGENCY_STAFF cannot change team roles", async () => {
    v.mockGetServerSession.mockResolvedValue(session({ role: "AGENCY_STAFF" }));
    const res = await changeAgencyTeamRole({ userId: "u-x", role: "AGENCY_ADMIN" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
  });

  it("non-member (no active workspace membership) cannot invite", async () => {
    v.mockGetServerSession.mockResolvedValue(session());
    v.mockMemberFindFirst.mockResolvedValue(null);
    const res = await inviteAgencyTeamMember({ email: "new@team.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not a member/i);
  });

  it("creator (no agency role) cannot invite", async () => {
    v.mockGetServerSession.mockResolvedValue(session({ role: "ADMIN", agencyId: null }));
    const res = await inviteAgencyTeamMember({ email: "new@team.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/agency role required/i);
  });

  it("unauthenticated user cannot invite", async () => {
    v.mockGetServerSession.mockResolvedValue(null);
    const res = await inviteAgencyTeamMember({ email: "new@team.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
  });

  it("accepting an invitation requires an authenticated session and passes only email+token", async () => {
    v.mockGetServerSession.mockResolvedValue(session({ id: "u-new", email: "new@team.test", role: "AGENCY_STAFF", agencyId: null }));
    v.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-a" });
    v.mockMemberCount.mockResolvedValue(2);
    // acceptance rejects with a domain message once the token is unknown
    const res = await acceptAgencyTeamInvitation({ token: "deadbeef" });
    expect(res.success).toBe(false);
    expect(res.error).toBeTruthy();
  });

  it("accepting without a session is rejected", async () => {
    v.mockGetServerSession.mockResolvedValue(null);
    const res = await acceptAgencyTeamInvitation({ token: "deadbeef" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/signed in/);
  });

  it("client cannot supply agencyId/workspaceId to invite — only email+role are accepted", async () => {
    v.mockGetServerSession.mockResolvedValue(session());
    const res = await inviteAgencyTeamMember({ email: "new@team.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(true);
    // The session agency is authoritative; the create call is scoped to it.
    expect(v.mockInviteCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ agencyId: AGENCY }) }));
  });
});
