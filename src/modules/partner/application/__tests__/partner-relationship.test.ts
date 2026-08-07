import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  agencyTenantFindUnique: vi.fn(),
  agencyTenantFindFirst: vi.fn(),
  agencyTenantCreate: vi.fn(),
  agencyTenantUpdate: vi.fn(),
  websiteAgencyFindUnique: vi.fn(),
  workspaceMemberFindFirst: vi.fn(),
  userFindFirst: vi.fn(),
  userFindUnique: vi.fn(),
  userCreate: vi.fn(),
  userUpsert: vi.fn(),
  workspaceFindUnique: vi.fn(),
  settingFindFirst: vi.fn(),
  settingFindMany: vi.fn(),
  settingFindUnique: vi.fn(),
  settingUpsert: vi.fn(),
  settingUpdate: vi.fn(),
  logAction: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    agencyTenant: {
      findUnique: h.agencyTenantFindUnique,
      findFirst: h.agencyTenantFindFirst,
      create: h.agencyTenantCreate,
      update: h.agencyTenantUpdate,
    },
    websiteAgency: { findUnique: h.websiteAgencyFindUnique },
    workspaceMember: { findFirst: h.workspaceMemberFindFirst, upsert: vi.fn().mockResolvedValue({}) },
    user: { findFirst: h.userFindFirst, findUnique: h.userFindUnique, create: h.userCreate, upsert: h.userUpsert },
    workspace: { findUnique: h.workspaceFindUnique },
    setting: {
      findFirst: h.settingFindFirst,
      findMany: h.settingFindMany,
      findUnique: h.settingFindUnique,
      upsert: h.settingUpsert,
      update: h.settingUpdate,
    },
  },
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));

import { AgencyTenantRelationshipService } from "@/modules/partner/application/partner-relationship";
import { CreatorInvitationService } from "@/modules/partner/application/invitation";

const relationship = new AgencyTenantRelationshipService();
const invitations = new CreatorInvitationService();

beforeEach(() => {
  Object.values(h).forEach((f) => {
    if (typeof f === "function" && "mockReset" in f) (f as ReturnType<typeof vi.fn>).mockReset();
  });
  h.agencyTenantFindUnique.mockResolvedValue(null);
  h.agencyTenantFindFirst.mockResolvedValue(null);
  h.agencyTenantCreate.mockResolvedValue({ id: "link1" });
  h.agencyTenantUpdate.mockResolvedValue({ id: "link1" });
  h.websiteAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.userFindFirst.mockResolvedValue(null);
  h.workspaceFindUnique.mockResolvedValue({ id: "ws1", tenantId: "t1" });
  h.settingFindFirst.mockResolvedValue(null);
  h.settingFindMany.mockResolvedValue([]);
  h.settingFindUnique.mockResolvedValue(null);
  h.settingUpsert.mockResolvedValue({ id: "s1" });
  h.settingUpdate.mockResolvedValue({ id: "s1" });
});

describe("AgencyTenantRelationshipService (Part 1)", () => {
  it("creates the canonical link for an active agency", async () => {
    const result = await relationship.linkCreator({ agencyId: "ag1", tenantId: "t1", workspaceId: "ws1" });
    expect(result.linked).toBe(true);
    expect(h.agencyTenantCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ agencyId: "ag1", tenantId: "t1", workspaceId: "ws1", status: "ACTIVE" }),
    }));
  });

  it("refuses to link when the agency is not active", async () => {
    h.websiteAgencyFindUnique.mockResolvedValue({ status: "SUSPENDED" });
    await expect(relationship.linkCreator({ agencyId: "ag1", tenantId: "t1" })).rejects.toThrow("not active");
    expect(h.agencyTenantCreate).not.toHaveBeenCalled();
  });

  it("upserts (does not duplicate) when the link already exists for the same agency", async () => {
    h.agencyTenantFindUnique.mockResolvedValue({ id: "existing", agencyId: "ag1", workspaceId: null });
    const result = await relationship.linkCreator({ agencyId: "ag1", tenantId: "t1", workspaceId: "ws1" });
    expect(result.linked).toBe(true);
    expect(h.agencyTenantCreate).not.toHaveBeenCalled();
    expect(h.agencyTenantUpdate).toHaveBeenCalledWith({ where: { id: "existing" }, data: expect.objectContaining({ workspaceId: "ws1", status: "ACTIVE" }) });
  });

  it("rejects re-linking to a different agency (single-owner model)", async () => {
    h.agencyTenantFindUnique.mockResolvedValue({ id: "existing", agencyId: "ag2", workspaceId: null });
    await expect(relationship.linkCreator({ agencyId: "ag1", tenantId: "t1" })).rejects.toThrow("another agency");
  });
});

describe("CreatorInvitationService (Part 3)", () => {
  it("creates a passwordless pending invitation", async () => {
    const result = await invitations.createInvitation({ agencyId: "ag1", tenantId: "t1", email: "creator@x.com", creatorName: "C", createdBy: "u1" });
    expect(result.success).toBe(true);
    expect(result.invite?.status).toBe("pending");
    expect(result.invite?.token.length).toBeGreaterThan(16);
    expect(h.settingUpsert).toHaveBeenCalled();
  });

  it("does not create a duplicate invitation while one is pending", async () => {
    h.settingFindFirst.mockResolvedValue({ value: { status: "pending", expiresAt: new Date(Date.now() + 3600000).toISOString() } });
    const result = await invitations.createInvitation({ agencyId: "ag1", tenantId: "t1", email: "a@b.com", creatorName: "C", createdBy: "u1" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("already exists");
  });

  it("re-issues an invitation when the previous one expired", async () => {
    h.settingFindFirst.mockResolvedValue({ value: { status: "expired", expiresAt: new Date(Date.now() - 1000).toISOString() } });
    const result = await invitations.createInvitation({ agencyId: "ag1", tenantId: "t1", email: "a@b.com", creatorName: "C", createdBy: "u1" });
    expect(result.success).toBe(true);
    expect(h.settingUpsert).toHaveBeenCalled();
  });

  it("claims an invitation with the creator's own password and grants OWNER", async () => {
    h.settingFindMany.mockResolvedValue([
      { tenantId: "t1", value: { token: "tok123", email: "creator@x.com", status: "pending", expiresAt: new Date(Date.now() + 3600000).toISOString(), tenantId: "t1", workspaceId: "ws1", creatorName: "C" } },
    ]);
    h.userFindUnique.mockResolvedValue(null); // no existing account — safe to create
    h.userCreate.mockResolvedValue({ id: "u9", tenantId: "t1" });
    const result = await invitations.claimInvitation({ token: "tok123", email: "creator@x.com", password: "supersecret123" });
    expect(result.success).toBe(true);
    expect(result.tenantId).toBe("t1");
    expect(h.userCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ role: "ADMIN" }),
    }));
  });

  it("rejects claiming an invitation for an email that already has an account (F12)", async () => {
    h.settingFindMany.mockResolvedValue([
      { tenantId: "t1", value: { token: "tok456", email: "existing@x.com", status: "pending", expiresAt: new Date(Date.now() + 3600000).toISOString(), tenantId: "t1", creatorName: "C" } },
    ]);
    h.userFindUnique.mockResolvedValue({ id: "existing-user" });
    const result = await invitations.claimInvitation({ token: "tok456", email: "existing@x.com", password: "supersecret123" });
    expect(result.success).toBe(false);
    expect(h.userCreate).not.toHaveBeenCalled();
  });

  it("rejects an expired invitation", async () => {
    h.settingFindMany.mockResolvedValue([
      { tenantId: "t1", value: { token: "tokx", email: "creator@x.com", status: "pending", expiresAt: new Date(Date.now() - 1000).toISOString(), tenantId: "t1", workspaceId: null, creatorName: "C" } },
    ]);
    const result = await invitations.claimInvitation({ token: "tokx", email: "creator@x.com", password: "supersecret123" });
    expect(result.success).toBe(false);
    expect(result.error).toContain("expired");
  });
});
