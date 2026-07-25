import { describe, it, expect } from "vitest";
import {
  partnerEngine, partnerService,
  PARTNER_TYPES, PARTNER_STATUSES, PARTNER_ROLES, PARTNER_TYPES_CONFIG, INVITE_TTL_DAYS,
  validatePartnerType, validatePartnerStatus, validatePartnerRole,
  validateEmail, validateCreatePartner, validateCreateInvite, canTransitionStatus,
  hasPermission, roleAtLeast, canManageRole,
  formatPartnerType, formatPartnerRole, formatPartnerStatus,
} from "@/lib/partners";

describe("Partners — Constants", () => {
  it("should define partner types", () => { expect(PARTNER_TYPES).toContain("freelancer"); expect(PARTNER_TYPES).toContain("agency"); });
  it("should define partner statuses", () => { expect(PARTNER_STATUSES).toContain("pending"); expect(PARTNER_STATUSES).toContain("active"); });
  it("should define partner roles", () => { expect(PARTNER_ROLES).toContain("owner"); expect(PARTNER_ROLES).toContain("admin"); });
  it("should have type configurations with capacity limits", () => { expect(PARTNER_TYPES_CONFIG.freelancer.maxWorkspaces).toBe(5); expect(PARTNER_TYPES_CONFIG.agency.maxWorkspaces).toBe(20); });
  it("should define invite TTL", () => { expect(INVITE_TTL_DAYS).toBe(7); });
});

describe("Partners — PartnerEngine CRUD", () => {
  beforeEach(() => { partnerEngine.createPartner({ id: "p1", type: "agency", businessName: "Test Agency", country: "IN" }); });
  it("should get partner by id", () => { expect(partnerEngine.getPartner("p1")!.id).toBe("p1"); });
  it("should return undefined for unknown", () => { expect(partnerEngine.getPartner("nonexistent")).toBeUndefined(); });
  it("should update partner", () => { partnerEngine.setStatus("p1", "suspended"); expect(partnerEngine.getPartner("p1")!.status).toBe("suspended"); partnerEngine.setStatus("p1", "active"); });
  it("should list partners", () => { expect(partnerEngine.listPartners().length).toBeGreaterThanOrEqual(1); });
});

describe("Partners — Members", () => {
  beforeEach(() => { partnerEngine.createPartner({ id: "pm1", type: "agency", businessName: "PM Agency" }); });
  it("should add member", () => { expect(partnerEngine.addMember("pm1", { id: "m1", partnerId: "pm1", userId: "u1", role: "admin", status: "active", joinedAt: new Date().toISOString() })).toBe(true); });
  it("should prevent duplicate", () => { partnerEngine.addMember("pm1", { id: "m1", partnerId: "pm1", userId: "u1", role: "admin", status: "active", joinedAt: new Date().toISOString() }); expect(partnerEngine.addMember("pm1", { id: "m1", partnerId: "pm1", userId: "u1", role: "admin", status: "active", joinedAt: new Date().toISOString() })).toBe(false); });
  it("should get members", () => { partnerEngine.addMember("pm1", { id: "m1", partnerId: "pm1", userId: "u1", role: "admin", status: "active", joinedAt: new Date().toISOString() }); expect(partnerEngine.getMembers("pm1").length).toBe(1); });
  it("should remove member", () => { partnerEngine.addMember("pm1", { id: "m1", partnerId: "pm1", userId: "u1", role: "admin", status: "active", joinedAt: new Date().toISOString() }); partnerEngine.removeMember("pm1", "u1"); expect(partnerEngine.getMembers("pm1").length).toBe(0); });
});

describe("Partners — Workspace", () => {
  beforeEach(() => { partnerEngine.createPartner({ id: "pw1", type: "freelancer", businessName: "Free Agent" }); });
  it("should assign workspace", () => { const r = partnerEngine.assignWorkspace("pw1", "ws1", "slug1", "Client 1", "admin", "created"); expect(r.success).toBe(true); });
  it("should prevent duplicate assignment", () => { partnerEngine.assignWorkspace("pw1", "ws1", "slug1", "Client 1", "admin", "created"); expect(partnerEngine.assignWorkspace("pw1", "ws1", "slug1", "Client 1", "admin", "created").success).toBe(false); });
  it("should check ownership", () => { partnerEngine.assignWorkspace("pw1", "ws1", "slug1", "C1", "admin", "created"); expect(partnerEngine.canManageWorkspace("pw1", "ws1")).toBe(true); expect(partnerEngine.canManageWorkspace("pw1", "unknown")).toBe(false); });
  it("should unassign workspace", () => { partnerEngine.assignWorkspace("pw1", "ws1", "slug1", "C1", "admin", "created"); partnerEngine.unassignWorkspace("pw1", "ws1"); expect(partnerEngine.workspaceCount("pw1")).toBe(0); });
});

describe("Partners — Invitations", () => {
  beforeEach(() => { partnerEngine.createPartner({ id: "pi1", type: "agency", businessName: "Inv Agency" }); });
  it("should create invite", () => { const r = partnerEngine.createInvite({ partnerId: "pi1", email: "a@b.com", role: "admin", invitedById: "u1" }); expect(r).not.toHaveProperty("error"); });
  it("should prevent duplicate", () => { partnerEngine.createInvite({ partnerId: "pi1", email: "a@b.com", role: "admin", invitedById: "u1" }); expect(partnerEngine.createInvite({ partnerId: "pi1", email: "a@b.com", role: "admin", invitedById: "u1" })).toHaveProperty("error"); });
  it("should accept invite", () => { partnerEngine.createInvite({ partnerId: "pi1", email: "a@b.com", role: "admin", invitedById: "u1" }); const invites = partnerEngine.getInvites("pi1"); expect(partnerEngine.acceptInvite(invites[0]!.id, "u2", "a@b.com").success).toBe(true); });
  it("should revoke invite", () => { partnerEngine.createInvite({ partnerId: "pi1", email: "a@b.com", role: "admin", invitedById: "u1" }); const i = partnerEngine.getInvites("pi1")[0]!.id; expect(partnerEngine.revokeInvite("pi1", i).success).toBe(true); });
});

describe("Partners — Validation", () => {
  it("should validate partner types", () => { expect(validatePartnerType("agency")).toBe(true); expect(validatePartnerType("invalid")).toBe(false); });
  it("should validate partner statuses", () => { expect(validatePartnerStatus("active")).toBe(true); expect(validatePartnerStatus("unknown")).toBe(false); });
  it("should validate emails", () => { expect(validateEmail("test@example.com")).toBe(true); expect(validateEmail("invalid")).toBe(false); });
  it("should validate create partner input", () => { expect(validateCreatePartner({ type: "agency", businessName: "A", email: "a@b.com" }).length).toBe(0); expect(validateCreatePartner({ type: "bad", businessName: "", email: "bad" }).length).toBeGreaterThan(0); });
  it("should validate status transitions", () => { expect(canTransitionStatus("pending", "active")).toBe(true); expect(canTransitionStatus("disabled", "active")).toBe(false); });
});

describe("Partners — Permissions", () => {
  it("should check hasPermission", () => { expect(hasPermission("owner", "partner:delete")).toBe(true); expect(hasPermission("viewer", "workspace:assign")).toBe(false); });
  it("should check role hierarchy", () => { expect(roleAtLeast("owner", "admin")).toBe(true); expect(roleAtLeast("viewer", "admin")).toBe(false); });
  it("should check canManageRole", () => { expect(canManageRole("owner", "admin")).toBe(true); expect(canManageRole("admin", "owner")).toBe(false); });
});

describe("Partners — Formatting", () => {
  it("should format partner type", () => { expect(formatPartnerType("agency")).toBe("Agency"); });
  it("should format partner role", () => { expect(formatPartnerRole("admin")).toBe("Admin"); });
  it("should format partner status", () => { expect(formatPartnerStatus("active")).toBe("Active"); });
});
