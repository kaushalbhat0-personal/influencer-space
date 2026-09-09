import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";

const NEXTAUTH_SECRET = "test-secret-for-agency-builder-32chars!";

process.env.NEXTAUTH_SECRET = NEXTAUTH_SECRET;

const h = vi.hoisted(() => {
  const cookiesStore = new Map<string, string>();
  return {
    cookiesStore,
    mockGetServerSession: vi.fn(),
    mockAgencyTenantFindFirst: vi.fn(),
    mockWorkspaceFindUnique: vi.fn(),
    mockWebsiteFindUnique: vi.fn(),
    mockWorkspaceMemberFindFirst: vi.fn(),
    mockTenantFindUnique: vi.fn(),
    mockSettingFindUnique: vi.fn(),
    mockPublishStatusFindFirst: vi.fn(),
    mockWebsiteAgencyFindUnique: vi.fn(),
    reset() {
      cookiesStore.clear();
      this.mockGetServerSession.mockReset();
      this.mockAgencyTenantFindFirst.mockReset();
      this.mockWorkspaceFindUnique.mockReset();
      this.mockWebsiteFindUnique.mockReset();
      this.mockWorkspaceMemberFindFirst.mockReset();
      this.mockTenantFindUnique.mockReset();
      this.mockSettingFindUnique.mockReset();
      this.mockPublishStatusFindFirst.mockReset();
      this.mockWebsiteAgencyFindUnique.mockReset();
    },
    getCookieHeader() {
      return Array.from(cookiesStore.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
  };
});

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const v = h.cookiesStore.get(name);
      return v ? { value: v } : undefined;
    },
    set: (name: string, value: string) => {
      h.cookiesStore.set(name, value);
    },
    delete: (name: string) => {
      h.cookiesStore.delete(name);
    },
  }),
  headers: () => ({
    get: (name: string) => {
      if (name === "cookie") return h.getCookieHeader();
      return null;
    },
  }),
}));

// Mock prisma with necessary tables
vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: { findUnique: h.mockWebsiteFindUnique },
    tenant: { findUnique: h.mockTenantFindUnique, findFirst: vi.fn() },
    agencyTenant: { findFirst: h.mockAgencyTenantFindFirst },
    workspace: { findUnique: h.mockWorkspaceFindUnique, findFirst: vi.fn() },
    workspaceMember: { findFirst: h.mockWorkspaceMemberFindFirst },
    websiteAgency: { findUnique: h.mockWebsiteAgencyFindUnique },
    setting: { findUnique: h.mockSettingFindUnique },
    publishStatus: { findFirst: h.mockPublishStatusFindFirst },
    page: { findMany: vi.fn().mockResolvedValue([]) },
    section: { findMany: vi.fn().mockResolvedValue([]) },
    block: { findMany: vi.fn().mockResolvedValue([]) },
    brand: { findUnique: vi.fn().mockResolvedValue(null) },
    publishSnapshot: { findFirst: vi.fn().mockResolvedValue(null), list: vi.fn().mockResolvedValue([]) },
  },
}));

// Mock auth helpers that would otherwise hit DB
vi.mock("@/modules/partner/application/access-lock", () => ({
  resolveAgencyAccess: vi.fn().mockResolvedValue({ platformLocked: false }),
  PLATFORM_LOCKED_MESSAGE: "Platform locked",
}));

// Mock workspacePolicy to avoid DB
vi.mock("@/lib/workspace/policy", () => ({
  workspacePolicy: {
    assertCanEdit: vi.fn().mockResolvedValue(undefined),
    assertCanPublish: vi.fn().mockResolvedValue(undefined),
    getStatus: vi.fn().mockResolvedValue("ACTIVE"),
  },
}));

// Mock canMutate is real import, but we can rely on actual logic (SUPER_ADMIN|AGENCY_ADMIN|ADMIN)
// For staff, canMutate returns false

import { enterClientBuilder, getAgencyBuilderTenantId } from "@/actions/agency-builder.actions";
import { __testables } from "@/lib/agency-builder-cookie";
import { canPreviewTenant } from "@/lib/storefront/preview-auth";

function makeAgencySession(overrides: Partial<{ agencyId: string; role: string; userId: string }> = {}) {
  return {
    user: {
      id: overrides.userId ?? "agency-user-1",
      email: "agency@test.com",
      agencyId: overrides.agencyId ?? "agency-1",
      role: overrides.role ?? "AGENCY_ADMIN",
      tenantId: null,
    },
  };
}

function makeTenantSession(tenantId: string) {
  return {
    user: {
      id: "tenant-user-1",
      email: "owner@test.com",
      tenantId,
      agencyId: null,
      role: "ADMIN" as const,
    },
  };
}

beforeEach(() => {
  h.reset();
  vi.clearAllMocks();
  h.mockWorkspaceFindUnique.mockResolvedValue({ id: "agency-ws-1", agencyId: "agency-1", status: "ACTIVE", type: "AGENCY" });
  h.mockWebsiteAgencyFindUnique.mockResolvedValue({ status: "ACTIVE" });
  h.mockWebsiteFindUnique.mockResolvedValue({ id: "website-1" });
  h.mockTenantFindUnique.mockResolvedValue({ id: "tenant-1", name: "Client", subdomain: "client" });
  h.mockAgencyTenantFindFirst.mockResolvedValue({ id: "link-1" }); // owned
  h.mockWorkspaceMemberFindFirst.mockResolvedValue({ id: "member-1", status: "ACTIVE" });
  h.mockSettingFindUnique.mockResolvedValue(null);
  h.mockPublishStatusFindFirst.mockResolvedValue({ state: "live" });
});

describe("RCCF-AGENCY-02 — Agency builder context (enterClientBuilder)", () => {
  it("Agency ADMIN can open managed client Builder (sets encrypted cookie)", async () => {
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN" }));

    const res = await enterClientBuilder("tenant-1");
    expect(res.success).toBe(true);
    const cookie = h.cookiesStore.get("__agency_client");
    expect(cookie).toBeTruthy();
    // Cookie is encrypted and not raw tenantId
    expect(cookie).not.toContain("tenant-1");
    // Decode via test seam
    const payload = __testables.decode(cookie!);
    expect(payload?.tenantId).toBe("tenant-1");
    expect(payload?.agencyId).toBe("agency-1");
    expect(payload?.uid).toBe("agency-user-1");
  });

  it("Agency STAFF blocked by canMutate policy (staff cannot edit client builder)", async () => {
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_STAFF" }));
    const res = await enterClientBuilder("tenant-1");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Only agency admins/i);
    expect(h.cookiesStore.has("__agency_client")).toBe(false);
  });

  it("Wrong/unmanaged tenant returns unauthorized (notFound semantics)", async () => {
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN" }));
    h.mockAgencyTenantFindFirst.mockResolvedValue(null); // not managed
    const res = await enterClientBuilder("tenant-other");
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Creator not managed/i);
    expect(h.cookiesStore.has("__agency_client")).toBe(false);
  });

  it("getAgencyBuilderTenantId verifies session binding + ownership on every read", async () => {
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN", userId: "agency-user-1" }));
    await enterClientBuilder("tenant-1");
    // Valid read
    const tenantId = await getAgencyBuilderTenantId();
    expect(tenantId).toBe("tenant-1");

    // Tamper: different user session uid mismatch → null
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN", userId: "other-user" }));
    const tampered = await getAgencyBuilderTenantId();
    expect(tampered).toBeNull();

    // Restore correct user but revoke ownership → null
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN", userId: "agency-user-1" }));
    h.mockAgencyTenantFindFirst.mockResolvedValue(null);
    const revoked = await getAgencyBuilderTenantId();
    expect(revoked).toBeNull();
  });

  it("Cookie expiry and agencyId mismatch invalidate context", async () => {
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN" }));
    await enterClientBuilder("tenant-1");
    const raw = h.cookiesStore.get("__agency_client")!;

    // Manually craft expired payload
    const key = crypto.createHash("sha256").update(NEXTAUTH_SECRET).digest();
    const iv = crypto.randomBytes(12);
    const expiredPayload = {
      v: 1,
      tenantId: "tenant-1",
      agencyId: "agency-1",
      uid: "agency-user-1",
      iat: Math.floor(Date.now() / 1000) - 7200,
      exp: Math.floor(Date.now() / 1000) - 10,
    };
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(JSON.stringify(expiredPayload), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    const expiredCookie = Buffer.concat([iv, tag, enc]).toString("base64url");
    h.cookiesStore.set("__agency_client", expiredCookie);

    const expired = await getAgencyBuilderTenantId();
    expect(expired).toBeNull();

    // AgencyId mismatch in cookie vs session
    await enterClientBuilder("tenant-1"); // reset valid
    const valid = h.cookiesStore.get("__agency_client")!;
    const payload = __testables.decode(valid)!;
    // Create cookie with different agencyId
    const tamperedPayload = { ...payload, agencyId: "agency-2" };
    const iv2 = crypto.randomBytes(12);
    const cipher2 = crypto.createCipheriv("aes-256-gcm", key, iv2);
    const enc2 = Buffer.concat([cipher2.update(JSON.stringify(tamperedPayload), "utf8"), cipher2.final()]);
    const tag2 = cipher2.getAuthTag();
    h.cookiesStore.set("__agency_client", Buffer.concat([iv2, tag2, enc2]).toString("base64url"));
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ agencyId: "agency-1" }));
    const mismatch = await getAgencyBuilderTenantId();
    expect(mismatch).toBeNull();
  });

  it("Client owner Builder behavior remains unchanged (tenantId path, no agency cookie needed)", async () => {
    // Client has tenantId in session, no agency cookie
    h.mockGetServerSession.mockResolvedValue(makeTenantSession("tenant-1"));
    h.cookiesStore.delete("__agency_client");
    // Simulate getWebsiteId logic: tenantId present → returns website
    // We test that getAgencyBuilderTenantId returns null for non-agency session (does not interfere)
    const agencyTenantId = await getAgencyBuilderTenantId();
    expect(agencyTenantId).toBeNull(); // no agency session

    // But builder for client should still work via tenantId direct path (verified in builder.actions getWebsiteId tenant branch)
    // Here we just verify no cross-tenant leakage: agency cookie not present, tenant session not confused
    h.mockGetServerSession.mockResolvedValue(makeTenantSession("tenant-other"));
    const other = await getAgencyBuilderTenantId();
    expect(other).toBeNull();
  });

  it("Tenant isolation: agency cannot access unrelated tenant via forged cookie", async () => {
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ agencyId: "agency-1" }));
    await enterClientBuilder("tenant-1");
    const cookie = h.cookiesStore.get("__agency_client")!;
    // Attacker tries to swap tenantId in cookie to tenant-2 (which agency does NOT own)
    const payload = __testables.decode(cookie)!;
    const key = crypto.createHash("sha256").update(NEXTAUTH_SECRET).digest();
    const iv = crypto.randomBytes(12);
    const forgedPayload = { ...payload, tenantId: "tenant-2" };
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
    const enc = Buffer.concat([cipher.update(JSON.stringify(forgedPayload), "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();
    h.cookiesStore.set("__agency_client", Buffer.concat([iv, tag, enc]).toString("base64url"));

    // Even though cookie decrypts to tenant-2, assertAgencyOwnsTenant will fail for tenant-2
    h.mockAgencyTenantFindFirst.mockImplementation(async ({ where }: { where: { agencyId: string; tenantId: string } }) => {
      if (where.tenantId === "tenant-2") return null;
      return { id: "link-1" } as unknown as never;
    });
    const result = await getAgencyBuilderTenantId();
    expect(result).toBeNull();
  });

  it("Preview remains secure: canPreviewTenant still requires tenant equality (agency cookie does not grant preview)", async () => {
    // Agency has builder cookie for tenant-1, but preview auth checks tenantId equality only
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN" }));
    await enterClientBuilder("tenant-1");
    // canPreviewTenant checks session.user.tenantId === tenantId — agency has null tenantId
    const canPreview = await canPreviewTenant("tenant-1");
    expect(canPreview).toBe(false);

    // Client owner can preview own tenant
    h.mockGetServerSession.mockResolvedValue(makeTenantSession("tenant-1"));
    const canPreviewOwner = await canPreviewTenant("tenant-1");
    expect(canPreviewOwner).toBe(true);

    // Client cannot preview other tenant
    const cannotPreviewOther = await canPreviewTenant("tenant-2");
    expect(cannotPreviewOther).toBe(false);
  });

  it("Save remains tenant-scoped (builder cookie does not allow cross-tenant overwrite)", async () => {
    // This test verifies that getAgencyBuilderTenantId re-validates ownership on every read,
    // so revoking AgencyTenant immediately revokes builder save capability
    h.mockGetServerSession.mockResolvedValue(makeAgencySession({ role: "AGENCY_ADMIN" }));
    await enterClientBuilder("tenant-1");
    expect(await getAgencyBuilderTenantId()).toBe("tenant-1");

    // Simulate offboard: AgencyTenant now REVOKED
    h.mockAgencyTenantFindFirst.mockResolvedValue(null);
    expect(await getAgencyBuilderTenantId()).toBeNull();
  });
});
