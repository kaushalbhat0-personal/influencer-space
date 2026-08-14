import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockFindByAgencyId: vi.fn(),
  mockFindByTenantId: vi.fn(),
  mockFindMember: vi.fn(),
  mockAddMember: vi.fn(),
  mockCreate: vi.fn(),
  mockLinkSubscription: vi.fn(),
}));

vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: {
    findByAgencyId: h.mockFindByAgencyId,
    findByTenantId: h.mockFindByTenantId,
    findMember: h.mockFindMember,
    addMember: h.mockAddMember,
    create: h.mockCreate,
  },
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { linkSubscriptionToWorkspace: h.mockLinkSubscription },
}));

import { resolveWorkspace } from "@/modules/workspace/application/resolve-workspace";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockFindByAgencyId.mockResolvedValue(null);
  h.mockFindByTenantId.mockResolvedValue(null);
  h.mockFindMember.mockResolvedValue({ id: "m1", role: "OWNER" });
  h.mockAddMember.mockResolvedValue({ id: "m1" });
  h.mockCreate.mockResolvedValue({ id: "ws-new", type: "AGENCY" });
  h.mockLinkSubscription.mockResolvedValue({ id: "sub-1" });
});

describe("RCCF-40 — Partner plan resolution: agency subscription → workspace linkage", () => {
  it("creating an agency workspace links the signup BillingSubscription to it", async () => {
    const agencyUser = { id: "u1", agencyId: "ag1", role: "AGENCY_ADMIN" };

    const result = await resolveWorkspace(agencyUser);

    expect(result.workspaceId).toBe("ws-new");
    expect(h.mockCreate).toHaveBeenCalledWith(expect.objectContaining({ type: "AGENCY", agencyId: "ag1" }));
    expect(h.mockLinkSubscription).toHaveBeenCalledWith({
      workspaceId: "ws-new",
      accountType: "agency",
      accountId: "ag1",
    });
  });

  it("backfills the link for an existing agency workspace (idempotent)", async () => {
    h.mockFindByAgencyId.mockResolvedValue({ id: "ws-old", type: "AGENCY" });
    const agencyUser = { id: "u1", agencyId: "ag1", role: "AGENCY_ADMIN" };

    await resolveWorkspace(agencyUser);

    expect(h.mockLinkSubscription).toHaveBeenCalledWith({
      workspaceId: "ws-old",
      accountType: "agency",
      accountId: "ag1",
    });
  });

  it("creator workspaces never invoke the agency link", async () => {
    h.mockCreate.mockResolvedValue({ id: "ws-t", type: "TENANT" });
    const creatorUser = { id: "u2", tenantId: "t1", role: "ADMIN" };

    await resolveWorkspace(creatorUser);

    expect(h.mockLinkSubscription).not.toHaveBeenCalled();
  });
});
