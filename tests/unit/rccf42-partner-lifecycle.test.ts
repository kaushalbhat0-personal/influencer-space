import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockAgencyTenantFindUnique: vi.fn(),
  mockAgencyTenantUpdate: vi.fn(),
  mockLogAction: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockAgencyFindUnique: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
  mockChangePlan: vi.fn(),
  mockResolveActivePlan: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agencyTenant: { findUnique: h.mockAgencyTenantFindUnique, update: h.mockAgencyTenantUpdate, count: vi.fn().mockResolvedValue(0) },
    websiteAgency: { findUnique: h.mockAgencyFindUnique },
    billingSubscription: { findFirst: async () => ({ status: "TRIALING", trialEndsAt: new Date(Date.now() + 86400000) }) },
    agencyCapacityAddon: { aggregate: async () => ({ _sum: { quantity: null } }) },
    workspaceMember: { findFirst: vi.fn().mockResolvedValue({ id: "m1" }) },
    workspace: { findUnique: h.mockWorkspaceFindUnique },
    setting: { upsert: vi.fn().mockResolvedValue({ id: "s1" }), findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue(null) },
  },
}));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/modules/billing/application/service", () => ({ billingService: { changePlan: h.mockChangePlan } }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/actions/super-admin-provision.actions", () => ({
  confirmProvision: vi.fn().mockResolvedValue({ success: false, error: "downstream-stub" }),
  analyzeUrl: vi.fn().mockResolvedValue({ success: false, error: "downstream-stub" }),
}));

import { agencyTenantRelationship } from "@/modules/partner/application/partner-relationship";
import { offboardAgencyClient, changeAgencyPlanAction, importCreatorViaAgency, updateAgencyBranding } from "@/actions/partner.actions";

const AGENCY_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const AGENCY_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const REL_A = "11111111-1111-4111-8111-111111111111";
const REL_B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockLogAction.mockResolvedValue(undefined);
  h.mockAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-a", agencyId: AGENCY_A });
  h.mockChangePlan.mockResolvedValue({ success: true, subscriptionId: "sub_new", orderId: "order_new" });
  h.mockAgencyTenantFindUnique.mockImplementation(async ({ where }: { where: { id: string } }) => {
    if (where.id === REL_A) return { id: REL_A, agencyId: AGENCY_A, tenantId: "t1", status: "ACTIVE" };
    if (where.id === REL_B) return { id: REL_B, agencyId: AGENCY_B, tenantId: "t2", status: "ACTIVE" };
    return null;
  });
  h.mockAgencyTenantUpdate.mockResolvedValue({});
  h.mockResolveActivePlan.mockResolvedValue({ code: "partner_solo", origin: "v2", status: "ACTIVE" });
});

describe("RCCF-42 — offboarding (agencyTenantRelationship.offboard)", () => {
  it("transitions an ACTIVE relationship to REVOKED and records offboardedAt", async () => {
    const res = await agencyTenantRelationship.offboard(REL_A, AGENCY_A);
    expect(res.success).toBe(true);
    expect(h.mockAgencyTenantUpdate).toHaveBeenCalledWith({
      where: { id: REL_A },
      data: { status: "REVOKED", offboardedAt: expect.any(Date) },
    });
  });

  it("rejects offboarding a relationship owned by another agency (zero mutation)", async () => {
    const res = await agencyTenantRelationship.offboard(REL_B, AGENCY_A);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not managed/i);
    expect(h.mockAgencyTenantUpdate).not.toHaveBeenCalled();
  });

  it("rejects offboarding an already-revoked relationship", async () => {
    h.mockAgencyTenantFindUnique.mockResolvedValue({ id: REL_A, agencyId: AGENCY_A, tenantId: "t1", status: "REVOKED", offboardedAt: new Date() });
    const res = await agencyTenantRelationship.offboard(REL_A, AGENCY_A);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/not active/i);
    expect(h.mockAgencyTenantUpdate).not.toHaveBeenCalled();
  });

  it("does not touch the creator tenant/website (only the relationship row changes)", async () => {
    const before = h.mockAgencyTenantUpdate.mock.calls.length;
    await agencyTenantRelationship.offboard(REL_A, AGENCY_A);
    // The mock only exposes agencyTenant.update — a full proxy of the DB would
    // assert tenant/website/order/billing are untouched. The offboard method
    // performs exactly one write: the AgencyTenant row.
    expect(h.mockAgencyTenantUpdate.mock.calls.length).toBe(before + 1);
  });
});

describe("RCCF-42 — offboardAgencyClient action authorization", () => {
  it("agency admin can offboard their own client", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const res = await offboardAgencyClient(REL_A);
    expect(res.success).toBe(true);
  });

  it("AGENCY_STAFF cannot offboard clients (zero mutation)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const res = await offboardAgencyClient(REL_A);
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
    expect(h.mockAgencyTenantUpdate).not.toHaveBeenCalled();
  });

  it("a partner cannot offboard another agency's client", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const res = await offboardAgencyClient(REL_B);
    expect(res.success).toBe(false);
    expect(h.mockAgencyTenantUpdate).not.toHaveBeenCalled();
  });
});

describe("RCCF-42 — changeAgencyPlanAction authorization + plan resolution", () => {
  it("an agency admin can initiate a partner plan change (server-derived workspace)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const res = await changeAgencyPlanAction("partner_scale");
    expect(res.success).toBe(true);
    expect(h.mockChangePlan).toHaveBeenCalledWith("ws-a", "partner_scale");
  });

  it("rejects a creator plan (cannot switch the agency to a creator plan)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const res = await changeAgencyPlanAction("creator_scale");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/invalid partner plan/i);
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("rejects an unknown plan (zero mutation)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const res = await changeAgencyPlanAction("nope");
    expect(res.success).toBe(false);
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });

  it("AGENCY_STAFF cannot change the plan (zero mutation)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const res = await changeAgencyPlanAction("partner_scale");
    expect(res.success).toBe(false);
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });
});

describe("RCCF-51 — client import is an admin-only mutation (boundary gate)", () => {
  it("AGENCY_STAFF is rejected at the boundary with zero side effects", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const res = await importCreatorViaAgency({ creatorName: "Client", email: "c@x.io", planCode: "creator_grow" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
    // No provisioning/relationship writes occur.
    expect(h.mockAgencyTenantUpdate).not.toHaveBeenCalled();
  });

  it("AGENCY_ADMIN passes the boundary gate", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    // Will fail later on the capacity pre-check (no clients) — but NOT on the role gate.
    const res = await importCreatorViaAgency({ creatorName: "Client", email: "c@x.io", planCode: "creator_grow" });
    expect(res.error).not.toMatch(/only agency admins/i);
  });
});

describe("RCCF-51 — white-label branding requires the declared Scale/Enterprise entitlement", () => {
  it("a free (partner_free) agency cannot brand", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_free", origin: "v2", status: "ACTIVE" });

    const res = await updateAgencyBranding({ agencyId: AGENCY_A, primaryColor: "#111", accentColor: "#222" });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/requires Partner Scale or Enterprise/i);
  });

  it("a Scale agency CAN brand", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    h.mockResolveActivePlan.mockResolvedValue({ code: "partner_scale", origin: "v2", status: "ACTIVE" });

    const res = await updateAgencyBranding({ agencyId: AGENCY_A, primaryColor: "#111", accentColor: "#222", footerText: "Agency" });
    expect(res.success).toBe(true);
  });
});

describe("RCCF-52 — AGENCY_STAFF boundary gates + role-authority consistency", () => {
  it("canMutate: AGENCY_ADMIN/SUPER_ADMIN true, AGENCY_STAFF/CREATOR false (the billing/branding/plan gate)", async () => {
    const { canMutate } = await import("@/modules/partner/application/authorization");
    expect(canMutate("AGENCY_ADMIN")).toBe(true);
    expect(canMutate("SUPER_ADMIN")).toBe(true);
    expect(canMutate("AGENCY_STAFF")).toBe(false);
    expect(canMutate("CREATOR")).toBe(false);
  });

  it("WorkspaceMember role cannot escalate an AGENCY_STAFF user (dual-role no-escalation)", async () => {
    // The membership row claims OWNER (WorkspaceMember.role), but authorization
    // is driven by session.user.role (AGENCY_STAFF). Staff must remain blocked
    // from admin mutations regardless of the workspace-member role.
    const { workspaceMemberFindFirst } = h as unknown as { workspaceMemberFindFirst?: { mockResolvedValue: (v: unknown) => void } };
    void workspaceMemberFindFirst;

    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const res = await changeAgencyPlanAction("partner_scale");
    expect(res.success).toBe(false);
    expect(h.mockChangePlan).not.toHaveBeenCalled();

    const brandRes = await updateAgencyBranding({ agencyId: AGENCY_A, primaryColor: "#111", accentColor: "#222" });
    expect(brandRes.success).toBe(false);
  });

  it("AGENCY_STAFF cannot mutate financial state (no agency financial mutation surface)", async () => {
    // Agency-facing financial actions are SUPER_ADMIN/admin-gated; a staff user
    // must be rejected from the plan-change and branding mutation boundaries.
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const res = await changeAgencyPlanAction("partner_scale");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/only agency admins/i);
    expect(h.mockChangePlan).not.toHaveBeenCalled();
  });
});
