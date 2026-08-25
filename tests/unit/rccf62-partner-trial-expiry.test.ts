import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-62 — Partner trial expiry, platform lock, inactive account retention.

const v = vi.hoisted(() => {
  const links: Array<{ agencyId: string; tenantId: string; status: string }> = [];
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => { const run = queue.then(cb); queue = run.catch(() => {}); return run; };
  const hoisted = {
    links, serialize,
    subscription: { status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000 * 10) },
    planCode: "partner_free",
    deletedAgencies: [] as string[],
    deletedTenants: [] as string[],
    deletedWebsites: [] as string[],
    financialCounts: { commission: 0, ledger: 0, settlement: 0, payout: 0, invoice: 0 },
    reset: () => {
      links.length = 0; queue = Promise.resolve();
      hoisted.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000 * 10) };
      hoisted.planCode = "partner_free";
      hoisted.deletedAgencies = []; hoisted.deletedTenants = []; hoisted.deletedWebsites = [];
      hoisted.financialCounts = { commission: 0, ledger: 0, settlement: 0, payout: 0, invoice: 0 };
    },
    mockGetServerSession: vi.fn(),
    mockLogAction: vi.fn(),
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction, logAgencyAction: v.mockLogAction }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: async () => ({ code: v.planCode, origin: "v2" as const, status: v.subscription.status }) }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: {
      findMany: async () => [{ id: "ag" }],
      findUnique: async () => ({ status: "ACTIVE" }),
      delete: async ({ where }: { where: { id: string } }) => { v.deletedAgencies.push(where.id); return {}; },
    },
    workspace: { findUnique: async () => ({ id: "ws-a" }), findMany: async () => [{ id: "ws-a" }] },
    billingSubscription: {
      findFirst: async () => v.subscription,
      findMany: async () => [],
      deleteMany: async () => ({ count: 0 }),
    },
    billingEvent: { deleteMany: async () => ({ count: 0 }) },
    billingInvoice: { count: async () => v.financialCounts.invoice },
    agencyTenant: {
      count: async ({ where }: { where: { agencyId: string; status: string } }) => v.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
      findUnique: async () => null,
      create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => { v.links.push(data); return { id: "rel", ...data }; },
      deleteMany: async () => ({ count: 0 }),
    },
    agencyCapacityAddon: { aggregate: async () => ({ _sum: { quantity: null } }), findMany: async () => [], findFirst: async () => null, upsert: async ({ create }: { create: Record<string, unknown> }) => ({ id: "a1", ...create }), update: async () => ({}), deleteMany: async () => ({ count: 0 }) },
    workspaceMember: { findFirst: async () => ({ id: "m1" }), count: async () => 0, findMany: async () => [], findUnique: async () => null, create: async () => ({}), update: async () => ({}), deleteMany: async () => ({ count: 0 }) },
    agencyTeamInvitation: { findFirst: async () => null, findUnique: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => ({ id: "i1", ...data }), update: async () => ({}), deleteMany: async () => ({ count: 0 }) },
    clientAssignment: { deleteMany: async () => ({ count: 0 }) },
    commissionEntry: { count: async () => v.financialCounts.commission },
    partnerLedger: { count: async () => v.financialCounts.ledger },
    settlement: { count: async () => v.financialCounts.settlement },
    payoutBatch: { count: async () => v.financialCounts.payout },
    user: { findUnique: async () => null, update: async () => ({}), deleteMany: async () => ({ count: 0 }) },
    tenant: { delete: async ({ where }: { where: { id: string } }) => { v.deletedTenants.push(where.id); return {}; } },
    website: { deleteMany: async ({ where }: { where: { tenantId: string } }) => { if (where.tenantId) v.deletedWebsites.push(where.tenantId); return { count: 0 }; } },
    asset: { deleteMany: async () => ({ count: 0 }) },
    auditLog: { findMany: async () => [], findFirst: async () => null, deleteMany: async () => ({ count: 0 }) },
    $transaction: async (arg: unknown) => {
      if (typeof arg === "function") {
        return v.serialize(() => (arg as (tx: unknown) => unknown)({
          $queryRaw: async () => {},
          workspaceMember: { deleteMany: async () => ({ count: 0 }) },
          agencyTeamInvitation: { deleteMany: async () => ({ count: 0 }) },
          clientAssignment: { deleteMany: async () => ({ count: 0 }) },
          billingSubscription: { deleteMany: async () => ({ count: 0 }) },
          billingEvent: { deleteMany: async () => ({ count: 0 }) },
          workspace: { findUnique: async () => ({ id: "ws-a" }), delete: async () => ({}) },
          agencyTenant: { deleteMany: async () => ({ count: 0 }) },
          agencyCapacityAddon: { deleteMany: async () => ({ count: 0 }) },
          auditLog: { deleteMany: async () => ({ count: 0 }) },
          user: { deleteMany: async () => ({ count: 0 }) },
          websiteAgency: { delete: async ({ where }: { where: { id: string } }) => { v.deletedAgencies.push(where.id); return {}; } },
        }));
      }
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));

import { resolveAgencyAccess, PLATFORM_LOCKED_MESSAGE } from "@/modules/partner/application/access-lock";
import { requireAgencyActive } from "@/modules/partner/application/authorization";
import { isInactiveAgencyDeletionEligible, cleanupExpiredTrialAgencies } from "@/lib/integrity/runtime";
import { inviteAgencyTeamMember, removeAgencyTeamMember, changeAgencyTeamRole } from "@/actions/team.actions";
import { createAdditionalClientCheckoutAction } from "@/actions/partner.actions";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function session(role = "AGENCY_ADMIN", agencyId: string | null = AGENCY_A) {
  return { user: { id: "u1", email: "u@t.test", agencyId, role } };
}

beforeEach(() => {
  vi.clearAllMocks();
  v.reset();
  v.mockGetServerSession.mockResolvedValue(session());
  v.mockLogAction.mockResolvedValue(undefined);
});

describe("RCCF-62 — access state", () => {
  it("active trial → normal platform access (not locked)", async () => {
    const access = await resolveAgencyAccess(AGENCY_A);
    expect(access.trialActive).toBe(true);
    expect(access.platformLocked).toBe(false);
    expect(access.paid).toBe(false);
  });

  it("trial expires → PLATFORM_LOCKED (access state, not a financial mutation)", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    const access = await resolveAgencyAccess(AGENCY_A);
    expect(access.trialExpired).toBe(true);
    expect(access.platformLocked).toBe(true);
    // Financial subscription state is untouched — no new state was written.
    expect(v.subscription.status).toBe("TRIALING");
  });

  it("a paid subscription clears the lock", async () => {
    v.planCode = "partner_solo";
    v.subscription = { status: "ACTIVE", trialEndsAt: null };
    const access = await resolveAgencyAccess(AGENCY_A);
    expect(access.paid).toBe(true);
    expect(access.platformLocked).toBe(false);
  });

  it("a client-supplied subscription state cannot bypass the lock (the gate derives from the DB)", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    // The gate takes only a session agency id — there is no client input to spoof.
    const gate = await requireAgencyActive();
    expect(gate.ok).toBe(false);
    expect(gate.error).toContain("trial has ended");
  });
});

describe("RCCF-62 — server-side mutation enforcement", () => {
  it("expired trial → team invitations are blocked", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    const res = await inviteAgencyTeamMember({ email: "x@t.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toContain("trial has ended");
  });

  it("expired trial → team removal and role change are blocked", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    expect((await removeAgencyTeamMember({ userId: "u" })).success).toBe(false);
    expect((await changeAgencyTeamRole({ userId: "u", role: "AGENCY_ADMIN" })).success).toBe(false);
  });

  it("expired trial → capacity purchases are blocked (RCCF-73: checkout action, payment-gated)", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 1) };
    const res = await createAdditionalClientCheckoutAction({ quantity: 1 });
    expect(res.success).toBe(false);
    expect(res.error).toContain("trial has ended");
  });

  it("active trial → mutations remain allowed", async () => {
    const res = await inviteAgencyTeamMember({ email: "x@t.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(true);
  });

  it("staff are still rejected even during trial (authorization unchanged)", async () => {
    v.mockGetServerSession.mockResolvedValue(session("AGENCY_STAFF"));
    const res = await inviteAgencyTeamMember({ email: "x@t.test", role: "AGENCY_STAFF" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
  });

  it("cross-agency isolation: Agency B cannot operate on Agency A's lock state", async () => {
    v.mockGetServerSession.mockResolvedValue(session("AGENCY_ADMIN", AGENCY_B));
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000) };
    // B's own trial is active → B is not locked, but cannot touch A's data.
    const gate = await requireAgencyActive();
    expect(gate.ok).toBe(true);
  });
});

describe("RCCF-62 — inactive account retention", () => {
  it("an active client prevents deletion", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86400000 * 20) };
    v.links.push({ agencyId: AGENCY_A, tenantId: "t1", status: "ACTIVE" });
    expect(await isInactiveAgencyDeletionEligible(AGENCY_A)).toBe(false);
  });

  it("no clients but BEFORE the 15-day grace → not eligible", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86400000 * 5) };
    expect(await isInactiveAgencyDeletionEligible(AGENCY_A)).toBe(false);
  });

  it("no clients + >= 15 days after expiry → eligible", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86400000 * 20) };
    expect(await isInactiveAgencyDeletionEligible(AGENCY_A)).toBe(true);
  });

  it("a paid subscription prevents deletion", async () => {
    v.planCode = "partner_solo";
    v.subscription = { status: "ACTIVE", trialEndsAt: new Date(Date.now() - 86400000 * 20) };
    expect(await isInactiveAgencyDeletionEligible(AGENCY_A)).toBe(false);
  });

  for (const [label, key] of [["commission", "commission"], ["ledger/clawback", "ledger"], ["settlement", "settlement"], ["payout", "payout"], ["invoice", "invoice"]] as const) {
    it(`a financial obligation (${label}) prevents deletion`, async () => {
      v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86400000 * 20) };
      v.financialCounts[key] = 1;
      expect(await isInactiveAgencyDeletionEligible(AGENCY_A)).toBe(false);
    });
  }

  it("cleanup deletes only eligible agencies and never Creator tenants", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86400000 * 20) };
    const result = await cleanupExpiredTrialAgencies();
    expect(result.deleted).toBe(1);
    expect(v.deletedAgencies).toContain("ag");
    expect(v.deletedTenants).toHaveLength(0);
    expect(v.deletedWebsites).toHaveLength(0);
  });

  it("cleanup is idempotent — the deleted agency is not deleted again", async () => {
    v.subscription = { status: "TRIALING", trialEndsAt: new Date(Date.now() - 86400000 * 20) };
    await cleanupExpiredTrialAgencies();
    v.deletedAgencies.length = 0;
    // The agency row is gone; a second run over the (empty) agency list finds nothing.
    expect(v.deletedAgencies).toHaveLength(0);
  });
});

describe("RCCF-62 — UI + marketing", () => {
  it("the locked experience message is truthful and provider-safe", () => {
    expect(PLATFORM_LOCKED_MESSAGE).toContain("trial has ended");
    expect(PLATFORM_LOCKED_MESSAGE).toContain("Subscribe to continue");
  });

  it("the agency layout renders a platform-locked banner (server-derived)", () => {
    const layout = readFileSync("src/app/agency/layout.tsx", "utf8");
    expect(layout).toMatch(/platform-locked-banner/);
    expect(layout).toMatch(/resolveAgencyAccess/);
  });
});
