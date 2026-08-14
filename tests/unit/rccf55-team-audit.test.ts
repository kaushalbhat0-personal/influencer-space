import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-55 — Partner team audit trail. Reads the SAME AuditLog table (agencyId
// scope); never reconstructs history from membership/invitation current state.
// The query service is exercised with an in-memory auditLog store; the action
// layer proves session-derived agency scoping and admin-only authorization.

const v = vi.hoisted(() => {
  const rows: Array<{ id: string; agencyId: string; action: string; metadata: Record<string, unknown>; createdAt: Date }> = [];
  let seq = 0;
  return {
    rows,
    add: (r: { agencyId: string; action: string; metadata?: Record<string, unknown>; createdAt?: Date }) => {
      seq += 1;
      rows.push({ id: `evt-${String(seq).padStart(3, "0")}`, agencyId: r.agencyId, action: r.action, metadata: r.metadata ?? {}, createdAt: r.createdAt ?? new Date(2026, 7, 12, 12, seq) });
      return `evt-${String(seq).padStart(3, "0")}`;
    },
    reset: () => { rows.length = 0; seq = 0; },
    mockGetServerSession: vi.fn(),
    mockLogAction: vi.fn(),
    mockRevalidatePath: vi.fn(),
  };
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: v.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction, logAgencyAction: v.mockLogAction }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: async () => ({ status: "ACTIVE" }) },
    workspaceMember: { findFirst: async () => ({ id: "m1" }) },
    auditLog: {
      findMany: async ({ where, orderBy, take, cursor, skip }: { where: { agencyId: string; action: { in: string[] } }; orderBy: Array<{ createdAt: string; id: string }>; take: number; cursor?: { id: string }; skip?: number }) => {
        let out = v.rows.filter((r) => r.agencyId === where.agencyId && where.action.in.includes(r.action));
        const primary = orderBy[0].createdAt === "desc" ? -1 : 1;
        out = out.sort((a, b) => {
          const d = a.createdAt.getTime() - b.createdAt.getTime();
          if (d !== 0) return primary * d;
          return primary * (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
        });
        if (cursor && skip) {
          const idx = out.findIndex((r) => r.id === cursor.id);
          out = out.slice(idx + 1);
        }
        return out.slice(0, take);
      },
    },
  },
}));

import { listTeamAudit, describeTeamAuditEvent, TEAM_AUDIT_ACTIONS } from "@/modules/partner/application/team-audit";
import { getTeamAuditAction } from "@/actions/team.actions";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function session(role: string, agencyId = AGENCY_A) {
  return { user: { id: "u-admin", email: "admin@a.test", agencyId, role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  v.reset();
  v.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN"));
  v.mockLogAction.mockResolvedValue(undefined);
});

describe("RCCF-55 — event registry", () => {
  it("surfaces the six team lifecycle events", () => {
    expect(TEAM_AUDIT_ACTIONS).toEqual([
      "partner:team-invited",
      "partner:team-invitation-sent",
      "partner:team-invitation-delivery-failed",
      "partner:team-accepted",
      "partner:team-removed",
      "partner:team-role-changed",
    ]);
  });
});

describe("RCCF-55 — agency-scoped retrieval", () => {
  it("returns only the requesting agency's events (A does not see B)", async () => {
    v.add({ agencyId: AGENCY_A, action: "partner:team-invited", metadata: { email: "a@x.test", role: "AGENCY_STAFF" } });
    v.add({ agencyId: AGENCY_B, action: "partner:team-invited", metadata: { email: "b@x.test", role: "AGENCY_STAFF" } });
    v.add({ agencyId: AGENCY_A, action: "partner:team-accepted", metadata: { email: "a@x.test", role: "AGENCY_STAFF" } });

    const page = await listTeamAudit(AGENCY_A, { limit: 10 });
    expect(page.items).toHaveLength(2);
    for (const item of page.items) expect(item.targetEmail).not.toBe("b@x.test");
  });

  it("orders newest-first with deterministic tie-breaking", async () => {
    for (const action of TEAM_AUDIT_ACTIONS) v.add({ agencyId: AGENCY_A, action, metadata: { email: "x@t.test" } });
    const page = await listTeamAudit(AGENCY_A, { limit: 10 });
    const stamps = page.items.map((i) => i.timestamp);
    expect(stamps).toEqual([...stamps].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0)));
  });

  it("paginates with a stable next cursor and bounded page size", async () => {
    for (let i = 0; i < 12; i++) v.add({ agencyId: AGENCY_A, action: "partner:team-invited", metadata: { email: `u${i}@t.test` } });
    const page1 = await listTeamAudit(AGENCY_A, { limit: 5 });
    expect(page1.items).toHaveLength(5);
    expect(page1.nextCursor).toBe(page1.items[4].id);

    const page2 = await listTeamAudit(AGENCY_A, { limit: 5, cursor: page1.nextCursor ?? undefined });
    expect(page2.items).toHaveLength(5);
    expect(page2.items[0].targetEmail).not.toBe(page1.items[4].targetEmail);
    expect(page2.nextCursor).toBeTruthy();

    const page3 = await listTeamAudit(AGENCY_A, { limit: 5, cursor: page2.nextCursor ?? undefined });
    expect(page3.items).toHaveLength(2);
    expect(page3.nextCursor).toBeNull();
  });

  it("limits the page size to a bounded maximum", async () => {
    for (let i = 0; i < 60; i++) v.add({ agencyId: AGENCY_A, action: "partner:team-invited", metadata: { email: `u${i}@t.test` } });
    const page = await listTeamAudit(AGENCY_A, { limit: 1000 });
    expect(page.items.length).toBeLessThanOrEqual(50);
  });
});

describe("RCCF-55 — event descriptions and DTO", () => {
  it("renders truthful descriptions for every event type", () => {
    const base = { agencyId: AGENCY_A, metadata: { email: "john@x.test", actorName: "Kaushal", actorEmail: "kaushal@a.test" } };
    expect(describeTeamAuditEvent("partner:team-invited", { ...base.metadata })).toMatch(/Kaushal invited john@x\.test/);
    expect(describeTeamAuditEvent("partner:team-invitation-sent", { ...base.metadata })).toMatch(/sent the team invitation to john@x\.test/);
    expect(describeTeamAuditEvent("partner:team-invitation-delivery-failed", { ...base.metadata })).toMatch(/could not be delivered/);
    expect(describeTeamAuditEvent("partner:team-accepted", { email: "john@x.test" })).toMatch(/john@x\.test accepted/);
    expect(describeTeamAuditEvent("partner:team-removed", { ...base.metadata, targetEmail: "john@x.test" })).toMatch(/Kaushal removed john@x\.test/);
  });

  it("role-change exposes historical previous/new roles from persisted metadata", async () => {
    const meta = { actorName: "Kaushal", targetEmail: "john@x.test", previousRole: "AGENCY_STAFF", role: "AGENCY_ADMIN" };
    expect(describeTeamAuditEvent("partner:team-role-changed", meta)).toMatch(/from Team member to Agency administrator/);
    v.add({ agencyId: AGENCY_A, action: "partner:team-role-changed", metadata: meta });
    const page = await listTeamAudit(AGENCY_A, { limit: 10 });
    expect(page.items[0].previousRole).toBe("AGENCY_STAFF");
    expect(page.items[0].newRole).toBe("AGENCY_ADMIN");
  });

  it("role-change without a persisted previous role still renders truthfully", () => {
    expect(describeTeamAuditEvent("partner:team-role-changed", { targetEmail: "john@x.test", role: "AGENCY_ADMIN" })).toMatch(/to Agency administrator/);
    expect(describeTeamAuditEvent("partner:team-role-changed", { targetEmail: "john@x.test", role: "AGENCY_ADMIN" })).not.toMatch(/from/);
  });

  it("never exposes raw tokens or internal IDs in the DTO", async () => {
    v.add({ agencyId: AGENCY_A, action: "partner:team-invited", metadata: { email: "john@x.test", role: "AGENCY_STAFF", token: "super-secret-token", acceptUrl: "https://app.test/agency/team/accept?token=super-secret-token", invitedById: "u-1", workspaceId: "ws-1" } });
    const page = await listTeamAudit(AGENCY_A, { limit: 10 });
    const item = page.items[0];
    expect(item).not.toHaveProperty("token");
    expect(item).not.toHaveProperty("acceptUrl");
    expect(item).not.toHaveProperty("workspaceId");
    expect(item).not.toHaveProperty("invitedById");
    expect(item.targetEmail).toBe("john@x.test");
    expect(JSON.stringify(item)).not.toMatch(/super-secret-token/);
  });
});

describe("RCCF-55 — action authorization", () => {
  it("AGENCY_ADMIN can read the team audit trail", async () => {
    v.add({ agencyId: AGENCY_A, action: "partner:team-invited", metadata: { email: "a@x.test" } });
    const res = await getTeamAuditAction({});
    expect(res.success).toBe(true);
    if (res.success) expect(res.items).toHaveLength(1);
  });

  it("AGENCY_STAFF cannot read the audit trail", async () => {
    v.mockGetServerSession.mockResolvedValue(session("AGENCY_STAFF"));
    const res = await getTeamAuditAction({});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/staff do not have audit access/i);
  });

  it("creator cannot read the audit trail", async () => {
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u-c", email: "c@t.test", agencyId: null, role: "ADMIN" } });
    const res = await getTeamAuditAction({});
    expect(res.success).toBe(false);
  });

  it("unauthenticated access is rejected", async () => {
    v.mockGetServerSession.mockResolvedValue(null);
    const res = await getTeamAuditAction({});
    expect(res.success).toBe(false);
  });

  it("client-supplied agency/workspace cannot bypass session scope", async () => {
    v.add({ agencyId: AGENCY_B, action: "partner:team-invited", metadata: { email: "b@x.test" } });
    v.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN", AGENCY_A));
    // The action accepts only a cursor — no agencyId/workspaceId parameter exists.
    const res = await getTeamAuditAction({ cursor: "anything" });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.items).toHaveLength(0);
    }
  });
});

describe("RCCF-55 — historical integrity", () => {
  it("events remain truthful after current membership changes (no rewriting)", async () => {
    v.add({ agencyId: AGENCY_A, action: "partner:team-role-changed", metadata: { targetEmail: "john@x.test", previousRole: "AGENCY_STAFF", role: "AGENCY_ADMIN" }, createdAt: new Date(2026, 7, 1) });
    v.add({ agencyId: AGENCY_A, action: "partner:team-removed", metadata: { targetEmail: "john@x.test", previousRole: "AGENCY_ADMIN" }, createdAt: new Date(2026, 7, 2) });
    const page = await listTeamAudit(AGENCY_A, { limit: 10 });
    // Newest first: removal first, then the earlier role-change with historical roles.
    expect(page.items[0].type).toBe("partner:team-removed");
    expect(page.items[0].previousRole).toBe("AGENCY_ADMIN");
    expect(page.items[1].type).toBe("partner:team-role-changed");
    expect(page.items[1].previousRole).toBe("AGENCY_STAFF");
    expect(page.items[1].newRole).toBe("AGENCY_ADMIN");
  });
});
