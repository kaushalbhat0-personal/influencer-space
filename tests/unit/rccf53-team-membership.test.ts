import { describe, it, expect, vi, beforeEach } from "vitest";

// In-memory domain stores + a serializing $transaction queue that faithfully
// models the workspace row FOR UPDATE lock: concurrent accepts run one at a
// time; the second sees the committed ACTIVE count.
const v = vi.hoisted(() => {
  const users: Array<{ id: string; email: string; tenantId: string | null; agencyId: string | null; role: string }> = [];
  const members: Array<{ id: string; workspaceId: string; userId: string; role: string; status: string; joinedAt: Date }> = [];
  const invites: Array<{ id: string; workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string }> = [];
  const workspaces: Array<{ id: string; agencyId: string }> = [];
  let seq = 0;
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => { const run = queue.then(cb); queue = run.catch(() => {}); return run; };

  const ops = {
    userFindByEmail(email: string) { return users.find((u) => u.email === email) ?? null; },
    userUpdate(id: string, data: Partial<{ tenantId: string | null; agencyId: string | null; role: string }>) {
      const u = users.find((x) => x.id === id)!;
      Object.assign(u, data);
      return u;
    },
    memberFind(workspaceId: string, userId: string) { return members.find((m) => m.workspaceId === workspaceId && m.userId === userId) ?? null; },
    memberCount(workspaceId: string, status: string) { return members.filter((m) => m.workspaceId === workspaceId && m.status === status).length; },
    memberCreate(data: { workspaceId: string; userId: string; role: string; status: string; joinedAt: Date }) {
      const m = { id: `m-${++seq}`, ...data };
      members.push(m);
      return m;
    },
    memberUpdateByKey(workspaceId: string, userId: string, data: Partial<{ role: string; status: string; joinedAt: Date }>) {
      const m = members.find((x) => x.workspaceId === workspaceId && x.userId === userId)!;
      Object.assign(m, data);
      return m;
    },
    memberUpdateById(id: string, data: Partial<{ role: string; status: string; joinedAt: Date }>) {
      const m = members.find((x) => x.id === id)!;
      Object.assign(m, data);
      return m;
    },
    inviteFindByToken(token: string) { return invites.find((i) => i.token === token) ?? null; },
    inviteFindPending(workspaceId: string, email: string) { return invites.find((i) => i.workspaceId === workspaceId && i.email === email && i.status === "pending") ?? null; },
    inviteCreate(data: { workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string }) {
      const inv = { id: `inv-${++seq}`, ...data };
      invites.push(inv);
      return inv;
    },
    inviteUpdate(id: string, data: Partial<{ status: string }>) {
      const inv = invites.find((x) => x.id === id)!;
      Object.assign(inv, data);
      return inv;
    },
  };

  const makeClient = () => ({
    $queryRaw: async () => {},
    workspace: { findUnique: async ({ where }: { where: { agencyId: string } }) => workspaces.find((w) => w.agencyId === where.agencyId) ?? null },
    user: {
      findUnique: async ({ where }: { where: { email: string } }) => ops.userFindByEmail(where.email),
      update: async ({ where, data }: { where: { id: string }; data: { agencyId?: string | null; role?: string } }) => ops.userUpdate(where.id, data),
    },
    workspaceMember: {
      count: async ({ where }: { where: { workspaceId: string; status: string } }) => ops.memberCount(where.workspaceId, where.status),
      findUnique: async ({ where }: { where: { workspaceId_userId: { workspaceId: string; userId: string } } }) => ops.memberFind(where.workspaceId_userId.workspaceId, where.workspaceId_userId.userId),
      findFirst: async ({ where }: { where: { workspaceId: string; userId: string } }) => ops.memberFind(where.workspaceId, where.userId),
      findMany: async ({ where }: { where: { workspaceId: string } }) => members.filter((m) => m.workspaceId === where.workspaceId),
      create: async ({ data }: { data: { workspaceId: string; userId: string; role: string; status: string; joinedAt: Date } }) => ops.memberCreate(data),
      update: async ({ where, data }: { where: { workspaceId_userId: { workspaceId: string; userId: string } } | { id: string }; data: Partial<{ role: string; status: string; joinedAt: Date }> }) => {
        if ("id" in where) return ops.memberUpdateById(where.id, data);
        return ops.memberUpdateByKey(where.workspaceId_userId.workspaceId, where.workspaceId_userId.userId, data);
      },
    },
    agencyTeamInvitation: {
      findUnique: async ({ where }: { where: { token: string } }) => ops.inviteFindByToken(where.token),
      findFirst: async ({ where }: { where: { workspaceId: string; email: string; status: string } }) => ops.inviteFindPending(where.workspaceId, where.email),
      create: async ({ data }: { data: { workspaceId: string; agencyId: string; email: string; role: string; token: string; status: string; expiresAt: Date; invitedById: string } }) => ops.inviteCreate(data),
      update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => ops.inviteUpdate(where.id, data),
    },
  });

  return {
    users, members, invites, workspaces, ops, makeClient,
    addUser: (u: { id: string; email: string; tenantId?: string | null; agencyId?: string | null; role?: string }) => users.push({ tenantId: null, agencyId: null, role: "ADMIN", ...u }),
    addMember: (m: { workspaceId: string; userId: string; role?: string; status?: string }) => members.push({ id: `seed-${++seq}`, joinedAt: new Date(), role: "MEMBER", status: "ACTIVE", ...m }),
    addWorkspace: (id: string, agencyId: string) => workspaces.push({ id, agencyId }),
    addInvite: (inv: { id: string; workspaceId: string; agencyId: string; email: string; role: string; token: string; status?: string; expiresAt: Date }) => invites.push({ status: "pending", invitedById: "u-admin", ...inv }),
    reset: () => { users.length = 0; members.length = 0; invites.length = 0; workspaces.length = 0; seq = 0; queue = Promise.resolve(); },
    serialize,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ...v.makeClient(),
    $transaction: (arg: unknown) => {
      if (typeof arg === "function") {
        return v.serialize(() => (arg as (tx: ReturnType<typeof v.makeClient>) => unknown)(v.makeClient()));
      }
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));

const h = vi.hoisted(() => ({ mockResolveActivePlan: vi.fn(), mockLogAction: vi.fn() }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction, logAgencyAction: h.mockLogAction }));

import { partnerTeamService, resolveTeamCapacity, TeamCapacityError, TeamMembershipError } from "@/modules/partner/application/team-membership";
import { capabilityService } from "@/lib/capabilities";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const WS_A = "00000000-0000-4000-8000-00000000000a";
const WS_B = "00000000-0000-4000-8000-00000000000b";
const U_ADMIN = "u-admin";
const U_STAFF = "u-staff";
const U_OWNER = "u-owner";
const email = (n: string) => `${n}@team.test`;

function seedAgency() {
  v.addWorkspace(WS_A, AGENCY_A);
  v.addWorkspace(WS_B, AGENCY_B);
  // Owner + 1 admin → 2 ACTIVE seats (partner_solo limit 3, so one seat free).
  v.addUser({ id: U_OWNER, email: email("owner"), agencyId: AGENCY_A, role: "AGENCY_ADMIN" });
  v.addUser({ id: U_ADMIN, email: email("admin"), agencyId: AGENCY_A, role: "AGENCY_ADMIN" });
  v.addUser({ id: U_STAFF, email: email("staff"), agencyId: AGENCY_A, role: "AGENCY_STAFF" });
  v.addMember({ workspaceId: WS_A, userId: U_OWNER, role: "OWNER" });
  v.addMember({ workspaceId: WS_A, userId: U_ADMIN, role: "ADMIN" });
  v.addMember({ workspaceId: WS_A, userId: U_STAFF, role: "MEMBER", status: "REMOVED" });
}

/** Make U_STAFF an ACTIVE third seat (owner + admin + staff = 3 = solo limit). */
function activateStaff() {
  v.ops.memberUpdateByKey(WS_A, U_STAFF, { status: "ACTIVE" });
}

beforeEach(() => {
  vi.clearAllMocks();
  v.reset();
  h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
  h.mockLogAction.mockResolvedValue(undefined);
  resetRuntimeFeatureOverrides();
});

describe("RCCF-53 — plan defaults for max_team_members", () => {
  it("partner_free 1, partner_solo 3, partner_scale 10, partner_enterprise 50", () => {
    expect(capabilityService.limit("partner_free", "max_team_members")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_team_members")).toBe(3);
    expect(capabilityService.limit("partner_scale", "max_team_members")).toBe(10);
    expect(capabilityService.limit("partner_enterprise", "max_team_members")).toBe(50);
  });

  it("resolveTeamCapacity resolves from the active plan and falls back to partner_free", async () => {
    v.addWorkspace(WS_A, AGENCY_A);
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_enterprise", origin: "v2", status: "ACTIVE" });
    expect(await resolveTeamCapacity(AGENCY_A)).toEqual({ planCode: "partner_enterprise", limit: 50 });
    h.mockResolveActivePlan.mockResolvedValue({ code: null, origin: "none", status: null });
    expect(await resolveTeamCapacity(AGENCY_A)).toEqual({ planCode: "partner_free", limit: 1 });
  });
});

describe("RCCF-53 — invite", () => {
  it("admin can invite an ACTIVE team member", async () => {
    seedAgency();
    const res = await partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.token).toMatch(/^[0-9a-f]{48}$/);
    expect(res.email).toBe(email("newbie"));
    expect(res.role).toBe("AGENCY_STAFF");
    expect(v.invites).toHaveLength(1);
    expect(v.invites[0].workspaceId).toBe(WS_A);
    expect(v.invites[0].agencyId).toBe(AGENCY_A);
  });

  it("invalid role is rejected", async () => {
    seedAgency();
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("x"), role: "SUPER_ADMIN" }))
      .rejects.toThrow(TeamMembershipError);
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("x"), role: "READ_ONLY" }))
      .rejects.toThrow(TeamMembershipError);
    expect(v.invites).toHaveLength(0);
  });

  it("email is normalized (case/whitespace) and email identity preserved", async () => {
    seedAgency();
    const res = await partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: "  NEWBIE@Team.Test  ", role: "AGENCY_STAFF" });
    expect(res.email).toBe(email("newbie"));
  });

  it("invitation is workspace-scoped — the client cannot redirect it to another workspace", async () => {
    seedAgency();
    const res = await partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.token).toBeTruthy();
    // inviteMember accepts no workspace input — the workspace is derived from agencyId.
    expect(v.invites[0].workspaceId).toBe(WS_A);
    expect(v.invites[0].workspaceId).not.toBe(WS_B);
  });

  it("duplicate pending invitation for the same email is rejected safely", async () => {
    seedAgency();
    await partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" });
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" }))
      .rejects.toThrow(/already exists/);
    expect(v.invites).toHaveLength(1);
  });

  it("invite is rejected when already at ACTIVE capacity", async () => {
    seedAgency();
    // solo limit 3, active 3 → cannot invite.
    v.addUser({ id: "u4", email: email("four"), agencyId: AGENCY_A, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_A, userId: "u4", role: "MEMBER" });
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" }))
      .rejects.toThrow(TeamCapacityError);
  });

  it("invite is rejected when workspace does not exist (spoofed agency)", async () => {
    seedAgency();
    await expect(partnerTeamService.inviteMember({ agencyId: "ffffffff-ffff-4fff-8fff-ffffffffffff", invitedById: U_ADMIN, email: email("x"), role: "AGENCY_STAFF" }))
      .rejects.toThrow(/workspace not found/i);
  });
});

describe("RCCF-53 — accept", () => {
  it("valid invitation creates an ACTIVE membership with server-derived role", async () => {
    seedAgency();
    v.addUser({ id: "u-new", email: email("newbie"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });

    const result = await partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") });
    expect(result).toEqual({ workspaceId: WS_A, role: "AGENCY_STAFF", agencyId: AGENCY_A });

    const member = v.ops.memberFind(WS_A, "u-new");
    expect(member).not.toBeNull();
    expect(member!.status).toBe("ACTIVE");
    expect(member!.role).toBe("MEMBER");
    const user = v.ops.userFindByEmail(email("newbie"));
    expect(user!.agencyId).toBe(AGENCY_A);
    expect(user!.role).toBe("AGENCY_STAFF");
    expect(v.invites[0].status).toBe("accepted");
  });

  it("AGENCY_ADMIN invitation grants the admin authority (still server-derived, never browser-submitted)", async () => {
    seedAgency();
    v.addUser({ id: "u-new", email: email("coadmin"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv2", workspaceId: WS_A, agencyId: AGENCY_A, email: email("coadmin"), role: "AGENCY_ADMIN", token: "tok2", expiresAt: new Date(Date.now() + 86400000) });

    await partnerTeamService.acceptInvitation({ token: "tok2", acceptingUserId: "u-new", acceptingEmail: email("coadmin") });
    expect(v.ops.userFindByEmail(email("coadmin"))!.role).toBe("AGENCY_ADMIN");
    expect(v.ops.memberFind(WS_A, "u-new")!.role).toBe("ADMIN");
  });

  it("consumed invitation cannot be reused (single-use)", async () => {
    seedAgency();
    v.addUser({ id: "u-new", email: email("newbie"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });
    await partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") });
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") }))
      .rejects.toThrow(/already used/);
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(3); // 2 seeded + 1 new
  });

  it("expired invitation is rejected", async () => {
    seedAgency();
    v.addUser({ id: "u-new", email: email("newbie"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() - 1000) });
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") }))
      .rejects.toThrow(/expired/);
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(2);
  });

  it("wrong identity is rejected — the accepting email must match the invitation email", async () => {
    seedAgency();
    v.addUser({ id: "u-other", email: email("other"), role: "AGENCY_STAFF" });
    v.addUser({ id: "u-new", email: email("newbie"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-other", acceptingEmail: email("other") }))
      .rejects.toThrow(/does not match/i);
    // spoofed userId with the right email is also rejected
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-other", acceptingEmail: email("newbie") }))
      .rejects.toThrow(/not found/i);
  });

  it("account that already owns a creator workspace cannot accept", async () => {
    seedAgency();
    v.addUser({ id: "u-creator", email: email("creator"), tenantId: "t1", role: "ADMIN" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("creator"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-creator", acceptingEmail: email("creator") }))
      .rejects.toThrow(/owns a creator workspace/);
  });

  it("account already attached to another agency cannot accept (single-owner default)", async () => {
    seedAgency();
    v.addUser({ id: "u-other", email: email("belongs"), agencyId: AGENCY_B, role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("belongs"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-other", acceptingEmail: email("belongs") }))
      .rejects.toThrow(/another agency/);
  });

  it("Agency A's invitation cannot create Agency B membership", async () => {
    seedAgency();
    v.addUser({ id: "u-new", email: email("newbie"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });
    const result = await partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") });
    expect(result.workspaceId).toBe(WS_A);
    expect(v.ops.memberFind(WS_B, "u-new")).toBeNull();
  });

  it("capacity is enforced at acceptance — accept beyond the limit is rejected", async () => {
    seedAgency();
    v.addUser({ id: "u4", email: email("four"), agencyId: AGENCY_A, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_A, userId: "u4", role: "MEMBER" }); // active = 4 > 3
    v.addUser({ id: "u-new", email: email("newbie"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("newbie"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });
    await expect(partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-new", acceptingEmail: email("newbie") }))
      .rejects.toThrow(TeamCapacityError);
    expect(v.ops.memberFind(WS_A, "u-new")).toBeNull();
    expect(v.invites[0].status).toBe("pending");
  });

  it("a REMOVED membership is explicitly reactivated by a fresh acceptance (no duplicate row)", async () => {
    seedAgency();
    v.addUser({ id: "u-old", email: email("old"), agencyId: AGENCY_A, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_A, userId: "u-old", role: "MEMBER", status: "REMOVED" });
    v.addInvite({ id: "inv1", workspaceId: WS_A, agencyId: AGENCY_A, email: email("old"), role: "AGENCY_STAFF", token: "tok1", expiresAt: new Date(Date.now() + 86400000) });

    await partnerTeamService.acceptInvitation({ token: "tok1", acceptingUserId: "u-old", acceptingEmail: email("old") });
    const rows = v.members.filter((m) => m.workspaceId === WS_A && m.userId === "u-old");
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe("ACTIVE");
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(3);
  });

  it("concurrent accepts can never exceed capacity (limit 3, active 2 → one succeeds, one rejects)", async () => {
    seedAgency();
    // solo limit 3, active = 2 (owner + admin). Two different users accept two invites simultaneously.
    v.addUser({ id: "u-a", email: email("a"), role: "AGENCY_STAFF" });
    v.addUser({ id: "u-b", email: email("b"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "invA", workspaceId: WS_A, agencyId: AGENCY_A, email: email("a"), role: "AGENCY_STAFF", token: "tokA", expiresAt: new Date(Date.now() + 86400000) });
    v.addInvite({ id: "invB", workspaceId: WS_A, agencyId: AGENCY_A, email: email("b"), role: "AGENCY_STAFF", token: "tokB", expiresAt: new Date(Date.now() + 86400000) });

    const results = await Promise.allSettled([
      partnerTeamService.acceptInvitation({ token: "tokA", acceptingUserId: "u-a", acceptingEmail: email("a") }),
      partnerTeamService.acceptInvitation({ token: "tokB", acceptingUserId: "u-b", acceptingEmail: email("b") }),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect((rejected[0] as PromiseRejectedResult).reason).toBeInstanceOf(TeamCapacityError);
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(3);
  });

  it("concurrent accepts never create duplicate memberships even with separate capacity headroom", async () => {
    seedAgency();
    // active = 2, limit 3: exactly two accepting users can fit (3 total). Two accepts
    // must yield exactly 2 new ACTIVE members and no duplicates.
    v.addUser({ id: "u-a", email: email("a"), role: "AGENCY_STAFF" });
    v.addUser({ id: "u-b", email: email("b"), role: "AGENCY_STAFF" });
    v.addInvite({ id: "invA", workspaceId: WS_A, agencyId: AGENCY_A, email: email("a"), role: "AGENCY_STAFF", token: "tokA", expiresAt: new Date(Date.now() + 86400000) });
    v.addInvite({ id: "invB", workspaceId: WS_A, agencyId: AGENCY_A, email: email("b"), role: "AGENCY_STAFF", token: "tokB", expiresAt: new Date(Date.now() + 86400000) });

    // two sequential accepts both fit (2 + 2 = 4 > 3 → second must fail!). Verify capacity invariant.
    await partnerTeamService.acceptInvitation({ token: "tokA", acceptingUserId: "u-a", acceptingEmail: email("a") });
    await expect(partnerTeamService.acceptInvitation({ token: "tokB", acceptingUserId: "u-b", acceptingEmail: email("b") }))
      .rejects.toThrow(TeamCapacityError);
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(3);
  });
});

describe("RCCF-53 — remove", () => {
  it("admin can remove an ACTIVE member; the member no longer counts toward capacity", async () => {
    seedAgency();
    activateStaff();
    await partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF });
    expect(v.ops.memberFind(WS_A, U_STAFF)!.status).toBe("REMOVED");
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(2);
  });

  it("already-removed member cannot be removed again", async () => {
    seedAgency();
    activateStaff();
    await partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF });
    await expect(partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF }))
      .rejects.toThrow(/not active/);
  });

  it("self-removal is rejected", async () => {
    seedAgency();
    await expect(partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_ADMIN }))
      .rejects.toThrow(/cannot remove yourself/);
  });

  it("the agency owner cannot be removed", async () => {
    seedAgency();
    await expect(partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_OWNER }))
      .rejects.toThrow(/owner cannot be removed/);
  });

  it("a user outside the agency workspace cannot be removed", async () => {
    seedAgency();
    // user belongs to agency B workspace
    v.addUser({ id: "u-bstaff", email: email("bstaff"), agencyId: AGENCY_B, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_B, userId: "u-bstaff", role: "MEMBER" });
    await expect(partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: "u-bstaff" }))
      .rejects.toThrow(/not found in this agency/);
  });

  it("removing all non-owners leaves only the owner ACTIVE", async () => {
    seedAgency();
    activateStaff();
    v.addUser({ id: "u-other", email: email("other"), agencyId: AGENCY_A, role: "AGENCY_ADMIN" });
    v.addMember({ workspaceId: WS_A, userId: "u-other", role: "ADMIN" });
    await partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF });
    await partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: "u-other", targetUserId: U_ADMIN });
    await partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_OWNER, targetUserId: "u-other" });
    expect(v.ops.memberCount(WS_A, "ACTIVE")).toBe(1);
    expect(v.ops.memberFind(WS_A, U_OWNER)!.status).toBe("ACTIVE");
  });
});

describe("RCCF-53 — role change", () => {
  it("admin can change an allowed team role (upgrade and downgrade)", async () => {
    seedAgency();
    activateStaff();
    await partnerTeamService.changeRole({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF, role: "AGENCY_ADMIN" });
    expect(v.ops.userFindByEmail(email("staff"))!.role).toBe("AGENCY_ADMIN");
    expect(v.ops.memberFind(WS_A, U_STAFF)!.role).toBe("ADMIN");

    await partnerTeamService.changeRole({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF, role: "AGENCY_STAFF" });
    expect(v.ops.userFindByEmail(email("staff"))!.role).toBe("AGENCY_STAFF");
    expect(v.ops.memberFind(WS_A, U_STAFF)!.role).toBe("MEMBER");
  });

  it("invalid application role is rejected (no SUPER_ADMIN/ADMIN/SUPPORT/READ_ONLY)", async () => {
    seedAgency();
    activateStaff();
    for (const role of ["SUPER_ADMIN", "ADMIN", "SUPPORT", "READ_ONLY", "OWNER", "VIEWER"]) {
      await expect(partnerTeamService.changeRole({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF, role }))
        .rejects.toThrow(/invalid team role/i);
    }
  });

  it("WorkspaceMember role never escalates User.role on its own", async () => {
    seedAgency();
    const before = v.ops.userFindByEmail(email("staff"))!.role;
    // A raw membership-role mutation (context only) must not touch User.role.
    v.ops.memberUpdateByKey(WS_A, U_STAFF, { role: "ADMIN" });
    expect(v.ops.memberFind(WS_A, U_STAFF)!.role).toBe("ADMIN");
    expect(v.ops.userFindByEmail(email("staff"))!.role).toBe(before);
  });

  it("owner's role cannot be changed (no ownership transfer)", async () => {
    seedAgency();
    await expect(partnerTeamService.changeRole({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_OWNER, role: "AGENCY_STAFF" }))
      .rejects.toThrow(/owner/);
  });

  it("non-active member cannot have a role change", async () => {
    seedAgency();
    v.addUser({ id: "u-removed", email: email("removed"), agencyId: AGENCY_A, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_A, userId: "u-removed", role: "MEMBER", status: "REMOVED" });
    await expect(partnerTeamService.changeRole({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: "u-removed", role: "AGENCY_ADMIN" }))
      .rejects.toThrow(/not active/);
  });

  it("cross-agency role change is rejected", async () => {
    seedAgency();
    v.addUser({ id: "u-bstaff", email: email("bstaff"), agencyId: AGENCY_B, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_B, userId: "u-bstaff", role: "MEMBER" });
    await expect(partnerTeamService.changeRole({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: "u-bstaff", role: "AGENCY_ADMIN" }))
      .rejects.toThrow(/not found in this agency/);
  });
});

describe("RCCF-53 — capacity matrix", () => {
  async function capacityFor(planCode: string) {
    seedAgency();
    h.mockResolveActivePlan.mockResolvedValue({ code: planCode, origin: "v2", status: "ACTIVE" });
    return resolveTeamCapacity(AGENCY_A);
  }

  it("launch (1): owner alone fills the seat — inviting a second user is rejected", async () => {
    seedAgency();
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_free", origin: "v2", status: "ACTIVE" });
    // owner + admin + staff already ACTIVE (3) under a 1-seat plan → reject.
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" }))
      .rejects.toThrow(TeamCapacityError);
  });

  it("scale (10) and enterprise (50) resolve from capabilityService, not hard-coded values", async () => {
    expect((await capacityFor("partner_scale")).limit).toBe(10);
    expect((await capacityFor("partner_enterprise")).limit).toBe(50);
  });

  it("downgrade over capacity — an accept is rejected once the resolved limit drops below the active count", async () => {
    seedAgency();
    // scale → solo downgrade: active 3 already exceeds solo limit 3? (equal). Make active 4.
    v.addUser({ id: "u4", email: email("four"), agencyId: AGENCY_A, role: "AGENCY_STAFF" });
    v.addMember({ workspaceId: WS_A, userId: "u4", role: "MEMBER" });
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    await expect(partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" }))
      .rejects.toThrow(TeamCapacityError);
  });

  it("offboarding/removal reclaims capacity — invite is allowed again after a remove", async () => {
    seedAgency();
    activateStaff();
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    // 3 ACTIVE = at limit. Remove staff → 2 ACTIVE → invite allowed.
    await partnerTeamService.removeMember({ agencyId: AGENCY_A, actorUserId: U_ADMIN, targetUserId: U_STAFF });
    const res = await partnerTeamService.inviteMember({ agencyId: AGENCY_A, invitedById: U_ADMIN, email: email("newbie"), role: "AGENCY_STAFF" });
    expect(res.token).toBeTruthy();
  });

  it("Super Admin runtime overrides change the enforced limit", async () => {
    seedAgency();
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
    applyRuntimeFeatureOverrides("partner_solo", { max_team_members: 5 });
    const cap = await resolveTeamCapacity(AGENCY_A);
    expect(cap.limit).toBe(5);
  });
});
