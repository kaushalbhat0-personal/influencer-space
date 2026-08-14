import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockAgencyFindUnique: vi.fn(),
  mockMemberFindFirst: vi.fn(),
  mockCommissionFindMany: vi.fn(),
  mockPartnerRevenue: vi.fn(),
  mockPayoutSummary: vi.fn(),
  mockLoyalty: vi.fn(),
  mockSuccessClients: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    websiteAgency: { findUnique: h.mockAgencyFindUnique },
    workspaceMember: { findFirst: h.mockMemberFindFirst },
    commissionEntry: { findMany: h.mockCommissionFindMany },
  },
}));
vi.mock("@/lib/commission/runtime", () => ({
  getPartnerRevenueSummary: h.mockPartnerRevenue,
  getPlatformRevenueSummary: vi.fn(),
  getRevenueRuntimeHealth: vi.fn(),
}));
vi.mock("@/lib/commission/loyalty", () => ({ getLoyaltyProgress: h.mockLoyalty }));
vi.mock("@/lib/payouts/runtime", () => ({ getPayoutSummary: h.mockPayoutSummary }));
vi.mock("@/lib/settlement", () => ({ settlementService: {} }));
vi.mock("@/modules/customer-success", () => ({
  getAgencySuccessClients: h.mockSuccessClients,
  computeFromSignals: vi.fn(),
  loadSignals: vi.fn(),
  getCustomerTimeline: vi.fn(),
  getPlatformSuccessCenter: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { requireProvisioningActor } from "@/modules/partner/application/authorization";
import { getAgencyRevenueData } from "@/actions/revenue-runtime.actions";
import { getAgencySuccessData } from "@/actions/customer-success.actions";

const AGENCY_A = "11111111-1111-4111-8111-111111111111";
const AGENCY_B = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.mockMemberFindFirst.mockResolvedValue({ id: "m1" });
  h.mockCommissionFindMany.mockResolvedValue([]);
  h.mockPartnerRevenue.mockResolvedValue({});
  h.mockPayoutSummary.mockResolvedValue({});
  h.mockLoyalty.mockResolvedValue({});
  h.mockSuccessClients.mockResolvedValue([]);
});

describe("RCCF-39 — requireProvisioningActor", () => {
  it("allows SUPER_ADMIN", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "sa", role: "SUPER_ADMIN" } });
    const r = await requireProvisioningActor();
    expect(r.ok).toBe(true);
  });

  it("allows an AGENCY_ADMIN with an ACTIVE agency + active membership", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const r = await requireProvisioningActor();
    expect(r.ok).toBe(true);
  });

  it("rejects an AGENCY_ADMIN whose agency is SUSPENDED", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    h.mockAgencyFindUnique.mockResolvedValue({ status: "SUSPENDED" });
    const r = await requireProvisioningActor();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not active/i);
  });

  it("rejects an AGENCY_ADMIN without an active membership", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    h.mockMemberFindFirst.mockResolvedValue(null);
    const r = await requireProvisioningActor();
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/not a member/i);
  });

  it("rejects AGENCY_STAFF and CREATOR (provisioning is SUPER_ADMIN/AGENCY_ADMIN only)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    expect((await requireProvisioningActor()).ok).toBe(false);
    h.mockGetServerSession.mockResolvedValue({ user: { id: "c", role: "CREATOR" } });
    expect((await requireProvisioningActor()).ok).toBe(false);
  });
});

describe("RCCF-39 — getAgencyRevenueData cross-agency IDOR guard", () => {
  it("AGENCY_ADMIN can read their OWN agency's revenue", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const r = await getAgencyRevenueData(AGENCY_A);
    expect(r.ok).toBe(true);
    expect(h.mockPartnerRevenue).toHaveBeenCalledWith(AGENCY_A);
  });

  it("AGENCY_ADMIN CANNOT read another agency's revenue (Forbidden, no data queried)", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "aa", role: "AGENCY_ADMIN", agencyId: AGENCY_A } });
    const r = await getAgencyRevenueData(AGENCY_B);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Forbidden/i);
    expect(h.mockPartnerRevenue).not.toHaveBeenCalled();
    expect(h.mockCommissionFindMany).not.toHaveBeenCalled();
  });

  it("SUPER_ADMIN retains platform-wide revenue access", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "sa", role: "SUPER_ADMIN" } });
    const r = await getAgencyRevenueData(AGENCY_B);
    expect(r.ok).toBe(true);
    expect(h.mockPartnerRevenue).toHaveBeenCalledWith(AGENCY_B);
  });
});

describe("RCCF-39 — getAgencySuccessData cross-agency IDOR guard", () => {
  it("AGENCY_STAFF can read their OWN agency's success data", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const r = await getAgencySuccessData(AGENCY_A);
    expect(r.ok).toBe(true);
    expect(h.mockSuccessClients).toHaveBeenCalledWith(AGENCY_A);
  });

  it("AGENCY_STAFF CANNOT read another agency's success data", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "st", role: "AGENCY_STAFF", agencyId: AGENCY_A } });
    const r = await getAgencySuccessData(AGENCY_B);
    expect(r.ok).toBe(false);
    expect(r.error).toMatch(/Forbidden/i);
    expect(h.mockSuccessClients).not.toHaveBeenCalled();
  });

  it("SUPER_ADMIN can read any agency's success data", async () => {
    h.mockGetServerSession.mockResolvedValue({ user: { id: "sa", role: "SUPER_ADMIN" } });
    const r = await getAgencySuccessData(AGENCY_B);
    expect(r.ok).toBe(true);
  });
});
