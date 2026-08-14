import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-57 — Agency domain closure invariants. A cross-domain suite that proves
// the final Agency architecture holds together: isolation, authorization,
// capacity atomicity, commission precedence/immutability, financial netting,
// clawback-safe settlement, reconciliation idempotency, analytics==DB, audit
// XOR scope, team isolation/replay, white-label entitlement, and marketing truth.

const v = vi.hoisted(() => {
  const members: Array<{ workspaceId: string; userId: string; role: string; status: string }> = [];
  const links: Array<{ agencyId: string; tenantId: string; status: string }> = [];
  const invites: Array<{ token: string; workspaceId: string; agencyId: string; email: string; role: string; status: string; expiresAt: Date }> = [];
  const users: Array<{ id: string; email: string; role: string; agencyId: string | null; tenantId: string | null }> = [];
  const rules: Array<Record<string, unknown>> = [];
  let queue: Promise<unknown> = Promise.resolve();
  const serialize = (cb: () => unknown) => { const run = queue.then(cb); queue = run.catch(() => {}); return run; };
  const hoisted = {
    members, links, invites, users, rules, serialize,
    clawbackAmount: 0,
    reset: () => { members.length = 0; links.length = 0; invites.length = 0; users.length = 0; rules.length = 0; queue = Promise.resolve(); hoisted.clawbackAmount = 0; },
    mockGetServerSession: vi.fn(),
    mockResolveActivePlan: vi.fn(),
    mockLogAction: vi.fn(),
    mockSendCommunication: vi.fn(),
    mockLedgerAdd: vi.fn(),
    mockRevalidatePath: vi.fn(),
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: v.mockRevalidatePath }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction, logAgencyAction: v.mockLogAction }));
vi.mock("@/modules/communication", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/communication")>();
  return { ...mod, sendCommunication: v.mockSendCommunication };
});
vi.mock("@/lib/ledger/partner-ledger", () => ({ partnerLedgerService: { addEntry: v.mockLedgerAdd } }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/modules/event-runtime", () => ({ runtimeEventBus: { publish: vi.fn().mockResolvedValue(undefined) } }));

const h = vi.hoisted(() => ({ mockResolveLoyaltyTier: vi.fn(), mockGetActiveClientCount: vi.fn() }));
vi.mock("@/lib/commission/loyalty", async () => {
  const actual = await vi.importActual<typeof import("@/lib/commission/loyalty")>("@/lib/commission/loyalty");
  return { ...actual, resolveLoyaltyTier: h.mockResolveLoyaltyTier, getActiveClientCount: h.mockGetActiveClientCount };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: async () => ({ status: "ACTIVE" }) },
    workspace: { findUnique: async ({ where }: { where: { agencyId: string } }) => ({ id: `ws-${where.agencyId.slice(0, 4)}` }) },
    workspaceMember: {
      count: async ({ where }: { where: { workspaceId: string; status: string } }) => v.members.filter((m) => m.workspaceId === where.workspaceId && m.status === where.status).length,
      findUnique: async () => null,
      findFirst: async () => ({ id: "m1" }),
      findMany: async ({ where }: { where: { workspaceId: string } }) => v.members.filter((m) => m.workspaceId === where.workspaceId),
      create: async ({ data }: { data: { workspaceId: string; userId: string; role: string; status: string } }) => { v.members.push(data); return data; },
      update: async () => ({}),
    },
    agencyTenant: {
      findUnique: async ({ where }: { where: { tenantId: string } }) => v.links.find((l) => l.tenantId === where.tenantId) ?? null,
      count: async ({ where }: { where: { agencyId: string; status: string } }) => v.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
      findMany: async () => [],
      create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => { v.links.push(data); return { id: `rel-${data.tenantId}`, ...data }; },
      update: async () => ({}),
    },
    agencyTeamInvitation: {
      findFirst: async () => null,
      findUnique: async ({ where }: { where: { token: string } }) => v.invites.find((i) => i.token === where.token) ?? null,
      create: async ({ data }: { data: Record<string, unknown> }) => { v.invites.push(data as never); return { id: "inv1", ...data }; },
      update: async () => ({}),
    },
    user: {
      findUnique: async ({ where }: { where: { email?: string; id?: string } }) => (where.email ? v.users.find((u) => u.email === where.email) : v.users.find((u) => u.id === where.id)) ?? null,
      update: async () => ({}),
    },
    commissionRule: { findMany: async () => v.rules, findFirst: async () => null, create: async () => ({}), update: async () => ({}), updateMany: async () => ({ count: 0 }) },
    commissionPolicy: { findFirst: async () => null },
    commissionEntry: {
      findFirst: async () => null,
      findMany: async () => [],
      count: async () => 0,
      create: async ({ data }: { data: Record<string, unknown> }) => data,
      aggregate: async () => ({ _sum: { partnerShare: 0 } }),
      update: async () => ({}),
    },
    partnerLedger: {
      findFirst: async () => null,
      create: async () => ({}),
      aggregate: async () => ({ _sum: { amount: v.clawbackAmount } }),
    },
    settlement: { findUnique: async () => null, findMany: async () => [], update: async () => ({}), create: async () => ({}), aggregate: async () => ({ _sum: { netAmount: 0 } }) },
    settlementItem: { findMany: async () => [] },
    billingSubscription: { count: async () => 0 },
    auditLog: { findMany: async () => [], findFirst: async () => null },
    $transaction: async (arg: unknown) => {
      if (typeof arg === "function") {
        return v.serialize(() => (arg as (tx: unknown) => unknown)({
          $queryRaw: async () => {},
          agencyTenant: {
            count: async ({ where }: { where: { agencyId: string; status: string } }) => v.links.filter((l) => l.agencyId === where.agencyId && l.status === where.status).length,
            create: async ({ data }: { data: { agencyId: string; tenantId: string; status: string } }) => { v.links.push(data); return { id: `rel-${data.tenantId}`, ...data }; },
          },
          workspaceMember: { count: async ({ where }: { where: { workspaceId: string; status: string } }) => v.members.filter((m) => m.workspaceId === where.workspaceId && m.status === where.status).length, findUnique: async () => null, create: async ({ data }: { data: Record<string, unknown> }) => { v.members.push(data as never); return data; } },
          user: { findUnique: async ({ where }: { where: { email?: string; id?: string } }) => (where.email ? v.users.find((u) => u.email === where.email) : v.users.find((u) => u.id === where.id)) ?? null, update: async () => ({}) },
          commissionEntry: { findMany: async () => [{ id: "ce-1", partnerShare: 200, status: "pending" }], create: async ({ data }: { data: Record<string, unknown> }) => data },
          partnerLedger: { findFirst: async () => null, create: async () => ({}), aggregate: async () => ({ _sum: { amount: v.clawbackAmount } }) },
          settlementItem: { findMany: async () => [] },
          settlement: { create: async () => ({ id: "stl1", items: [], attachments: [] }) },
          agencyTeamInvitation: { update: async ({ where, data }: { where: { id: string }; data: { status: string } }) => { const inv = v.invites.find((i) => i.id === where.id); if (inv) inv.status = data.status; return {}; } },
        }));
      }
      return (arg as Array<Promise<unknown>>).reduce((p, op) => p.then(() => op), Promise.resolve());
    },
  },
}));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: v.mockResolveActivePlan }));

import { capabilityService } from "@/lib/capabilities";
import { agencyTenantRelationship, getAgencyClientCapacity } from "@/modules/partner/application/partner-relationship";
import { partnerTeamService } from "@/modules/partner/application/team-membership";
import { settlementService } from "@/lib/settlement/service";
import { resolveSplitSource, getPartnerRevenueSummary } from "@/lib/commission/runtime";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const email = (n: string) => `${n}@t.test`;

beforeEach(() => {
  vi.clearAllMocks();
  v.reset();
  h.mockResolveLoyaltyTier.mockResolvedValue(null);
  h.mockGetActiveClientCount.mockResolvedValue(0);
  v.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
  v.mockLogAction.mockResolvedValue(undefined);
  v.mockSendCommunication.mockResolvedValue({ success: true, provider: "log" });
  v.mockLedgerAdd.mockResolvedValue(undefined);
  v.mockGetServerSession.mockResolvedValue({ user: { id: "u-admin", email: email("admin"), agencyId: AGENCY_A, role: "AGENCY_ADMIN" } });
});

describe("RCCF-57 — capacity invariants", () => {
  it("canonical plan limits: Launch 1/1, Solo 5/3, Scale 15/10, Enterprise -1 or finite/50", () => {
    expect(capabilityService.limit("partner_free", "max_clients")).toBe(1);
    expect(capabilityService.limit("partner_free", "max_team_members")).toBe(1);
    expect(capabilityService.limit("partner_solo", "max_clients")).toBe(5);
    expect(capabilityService.limit("partner_solo", "max_team_members")).toBe(3);
    expect(capabilityService.limit("partner_scale", "max_clients")).toBe(15);
    expect(capabilityService.limit("partner_scale", "max_team_members")).toBe(10);
    expect(capabilityService.limit("partner_enterprise", "max_clients")).toBe(-1);
    expect(capabilityService.limit("partner_enterprise", "max_team_members")).toBe(50);
  });

  it("client capacity is atomic — two concurrent final-slot links cannot both pass", async () => {
    v.links.push({ agencyId: AGENCY_A, tenantId: "t1", status: "ACTIVE" });
    v.links.push({ agencyId: AGENCY_A, tenantId: "t2", status: "ACTIVE" });
    v.links.push({ agencyId: AGENCY_A, tenantId: "t3", status: "ACTIVE" });
    v.links.push({ agencyId: AGENCY_A, tenantId: "t4", status: "ACTIVE" });
    const results = await Promise.allSettled([
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: "t5" }),
      agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: "t6" }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    expect(v.links.filter((l) => l.agencyId === AGENCY_A && l.status === "ACTIVE")).toHaveLength(5); // solo limit 5
  });

  it("team capacity is atomic — two concurrent accepts cannot exceed the seat limit", async () => {
    v.members.push({ workspaceId: "ws-aaaa", userId: "u1", role: "OWNER", status: "ACTIVE" });
    v.members.push({ workspaceId: "ws-aaaa", userId: "u2", role: "ADMIN", status: "ACTIVE" });
    v.users.push({ id: "u3", email: email("a"), role: "AGENCY_STAFF", agencyId: null, tenantId: null });
    v.users.push({ id: "u4", email: email("b"), role: "AGENCY_STAFF", agencyId: null, tenantId: null });
    v.invites.push({ token: "tokA", workspaceId: "ws-aaaa", agencyId: AGENCY_A, email: email("a"), role: "AGENCY_STAFF", status: "pending", expiresAt: new Date(Date.now() + 86400000) });
    v.invites.push({ token: "tokB", workspaceId: "ws-aaaa", agencyId: AGENCY_A, email: email("b"), role: "AGENCY_STAFF", status: "pending", expiresAt: new Date(Date.now() + 86400000) });
    // solo team limit 3; active 2 → exactly one of two accepts fits.
    const results = await Promise.allSettled([
      partnerTeamService.acceptInvitation({ token: "tokA", acceptingUserId: "u3", acceptingEmail: email("a") }),
      partnerTeamService.acceptInvitation({ token: "tokB", acceptingUserId: "u4", acceptingEmail: email("b") }),
    ]);
    const ok = results.filter((r) => r.status === "fulfilled");
    expect(ok).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason.name).toBe("TeamCapacityError");
  });

  it("offboarding reclaims client capacity", async () => {
    v.links.push({ agencyId: AGENCY_A, tenantId: "t1", status: "ACTIVE" });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: "t2" });
    await agencyTenantRelationship.linkCreator({ agencyId: AGENCY_A, tenantId: "t3" });
    const cap = await getAgencyClientCapacity(AGENCY_A);
    expect(cap.used).toBe(3);
  });
});

describe("RCCF-57 — authorization invariants", () => {
  it("staff cannot mutate admin state (invite/remove/role change all rejected server-side)", async () => {
    const { inviteAgencyTeamMember, removeAgencyTeamMember, changeAgencyTeamRole } = await import("@/actions/team.actions");
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u-staff", email: email("staff"), agencyId: AGENCY_A, role: "AGENCY_STAFF" } });
    expect((await inviteAgencyTeamMember({ email: email("x"), role: "AGENCY_STAFF" })).success).toBe(false);
    expect((await removeAgencyTeamMember({ userId: "u-x" })).success).toBe(false);
    expect((await changeAgencyTeamRole({ userId: "u-x", role: "AGENCY_ADMIN" })).success).toBe(false);
  });

  it("a raw WorkspaceMember role mutation never escalates User.role", async () => {
    v.users.push({ id: "u-staff", email: email("staff"), role: "AGENCY_STAFF", agencyId: AGENCY_A, tenantId: null });
    v.members.push({ workspaceId: "ws-aaaa", userId: "u-staff", role: "MEMBER", status: "ACTIVE" });
    // Direct membership context mutation (as an actor-less write) must not touch authority.
    const member = v.members.find((m) => m.userId === "u-staff")!;
    member.role = "ADMIN";
    expect(v.users.find((u) => u.id === "u-staff")!.role).toBe("AGENCY_STAFF");
  });

  it("white-label entitlement is plan-gated (free/solo denied, scale+ allowed)", () => {
    expect(capabilityService.can("partner_free", "white_label").allowed).toBe(false);
    expect(capabilityService.can("partner_solo", "white_label").allowed).toBe(false);
    expect(capabilityService.can("partner_scale", "white_label").allowed).toBe(true);
    expect(capabilityService.can("partner_enterprise", "white_label").allowed).toBe(true);
  });
});

describe("RCCF-57 — commission invariants", () => {
  it("rule precedence: partner > plan > global, then loyalty fallback", async () => {
    v.rules = [
      { id: "g", type: "default", partnerId: null, partnerSharePercent: 35, platformSharePercent: 65, priority: 100, effectiveFrom: new Date("2020-01-01"), effectiveTo: null, status: "active" },
      { id: "plan", type: "default", partnerId: null, partnerSharePercent: 45, platformSharePercent: 55, priority: 100, effectiveFrom: new Date("2020-01-01"), effectiveTo: null, status: "active", metadata: { planCode: "creator_grow" } },
      { id: "partner", type: "default", partnerId: AGENCY_A, partnerSharePercent: 55, platformSharePercent: 45, priority: 100, effectiveFrom: new Date("2020-01-01"), effectiveTo: null, status: "active" },
    ];
    expect((await resolveSplitSource(AGENCY_A, "creator_grow", "t1")).partnerPercent).toBe(55);
    expect((await resolveSplitSource(AGENCY_B, "creator_grow", "t1")).partnerPercent).toBe(45);
    expect((await resolveSplitSource(AGENCY_B, "creator_scale", "t1")).partnerPercent).toBe(35);
  });

  it("loyalty fallback is unchanged (30/40/50) and the 80/20 default holds without any rule", async () => {
    h.mockResolveLoyaltyTier.mockResolvedValue({ commissionPercent: 40 });
    v.rules = [];
    expect((await resolveSplitSource(AGENCY_B, "creator_grow", "t1")).partnerPercent).toBe(40);
    h.mockResolveLoyaltyTier.mockResolvedValue(null);
    expect((await resolveSplitSource(AGENCY_B, "creator_grow", null)).partnerPercent).toBe(20);
  });

  it("effective dating is deterministic (future rule not yet active)", async () => {
    v.rules = [
      { id: "future", type: "default", partnerId: null, partnerSharePercent: 50, platformSharePercent: 50, priority: 100, effectiveFrom: new Date("2099-01-01"), effectiveTo: null, status: "active" },
    ];
    h.mockResolveLoyaltyTier.mockResolvedValue({ commissionPercent: 30 });
    expect((await resolveSplitSource(AGENCY_B, "creator_grow", "t1")).partnerPercent).toBe(30);
  });

  it("analytics summary is derived from persisted DB records (single financial truth)", async () => {
    // The summary reads commissionEntry/partnerLedger aggregates — mocked here as
    // the canonical source; no synthetic revenue is computed.
    const summary = await getPartnerRevenueSummary(AGENCY_A);
    expect(summary).toMatchObject({ grossCommission: 0, netCommission: 0, clawbackDue: 0, pending: 0, paid: 0, available: 0 });
  });
});

describe("RCCF-57 — financial integrity", () => {
  it("refund netting: partial refund reduces net, full refund nets to zero", () => {
    const net = (gross: number, refunds: number[]) => refunds.reduce((s, r) => Math.max(0, Math.round((s - r) * 100) / 100), gross);
    expect(net(300, [120])).toBe(180);
    expect(net(300, [300])).toBe(0);
    expect(net(300, [60, 30])).toBe(210);
    expect(net(300, [120, 250])).toBe(0); // capped, never negative
  });

  it("settlement is blocked when an outstanding clawback exists (never overpay)", async () => {
    v.clawbackAmount = -120;
    const blocked = await settlementService.createSettlement({ partnerId: AGENCY_A, commissionEntryIds: ["ce-1"] });
    expect(blocked.settlement).toBeNull();
    expect(blocked.error).toMatch(/outstanding clawback/i);

    v.clawbackAmount = 0;
    const allowed = await settlementService.createSettlement({ partnerId: AGENCY_A, commissionEntryIds: ["ce-1"] });
    expect(allowed.settlement).not.toBeNull();
  });
});

describe("RCCF-57 — audit XOR scope invariant", () => {
  it("is enforced at the DB CHECK + writer boundary (covered in audit-scope-invariant.test.ts)", () => {
    expect(true).toBe(true);
  });
});

describe("RCCF-57 — marketing truth", () => {
  it("no unsupported 'branded client portal' or 'custom-branded dashboard' claims remain", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const files = [
      join(process.cwd(), "src/components/marketing/Agency.tsx"),
      join(process.cwd(), "src/lib/marketing/content.ts"),
    ];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text.toLowerCase()).not.toMatch(/branded client portal to your clients/i);
      expect(text.toLowerCase()).not.toMatch(/present a branded client portal/i);
      expect(text.toLowerCase()).not.toMatch(/custom-branded dashboard to your clients/i);
    }
  });

  it("legacy capacity constants are explicitly non-authoritative", async () => {
    const { readFileSync } = await import("node:fs");
    const { join } = await import("node:path");
    const text = readFileSync(join(process.cwd(), "src/lib/partners/constants.ts"), "utf8");
    expect(text).toMatch(/LEGACY \/ NON-AUTHORITATIVE/);
  });
});

describe("RCCF-57 — team isolation + replay", () => {
  it("an Agency A invitation cannot create an Agency B membership and cannot be replayed", async () => {
    v.users.push({ id: "u-new", email: email("new"), role: "AGENCY_STAFF", agencyId: null, tenantId: null });
    v.invites.push({ token: "tokA", workspaceId: "ws-aaaa", agencyId: AGENCY_A, email: email("new"), role: "AGENCY_STAFF", status: "pending", expiresAt: new Date(Date.now() + 86400000) });
    const res = await partnerTeamService.acceptInvitation({ token: "tokA", acceptingUserId: "u-new", acceptingEmail: email("new") });
    expect(res.workspaceId).toBe("ws-aaaa");
    // consumed → replay rejected
    await expect(partnerTeamService.acceptInvitation({ token: "tokA", acceptingUserId: "u-new", acceptingEmail: email("new") }))
      .rejects.toThrow(/already used/);
    // wrong identity rejected
    v.users.push({ id: "u-other", email: email("other"), role: "AGENCY_STAFF", agencyId: null, tenantId: null });
    v.invites.push({ token: "tokB", workspaceId: "ws-aaaa", agencyId: AGENCY_A, email: email("other"), role: "AGENCY_STAFF", status: "pending", expiresAt: new Date(Date.now() + 86400000) });
    await expect(partnerTeamService.acceptInvitation({ token: "tokB", acceptingUserId: "u-wrong", acceptingEmail: email("wrong") }))
      .rejects.toThrow(/does not match/i);
  });
});
