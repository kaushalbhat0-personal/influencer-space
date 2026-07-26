import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock variables (available in vi.mock factories) ─────────────────

const { mockGetServerSession } = vi.hoisted(() => ({ mockGetServerSession: vi.fn() }));

const mockRedirect = vi.hoisted(() => vi.fn(() => { throw new Error("NEXT_REDIRECT"); }));

const {
  mockPrismaUserFindUnique,
  mockPrismaUserCreate,
  mockPrismaUserUpdate,
  mockPrismaWebsiteAgencyCreate,
  mockPrismaAgencySubCreate,
  mockPrismaBillingAccountCreate,
  mockPrismaBillingPlanFindUnique,
  mockPrismaBillingSubCreate,
  mockPrismaTransaction,
} = vi.hoisted(() => ({
  mockPrismaUserFindUnique: vi.fn(),
  mockPrismaUserCreate: vi.fn(),
  mockPrismaUserUpdate: vi.fn(),
  mockPrismaWebsiteAgencyCreate: vi.fn(),
  mockPrismaAgencySubCreate: vi.fn(),
  mockPrismaBillingAccountCreate: vi.fn(),
  mockPrismaBillingPlanFindUnique: vi.fn(),
  mockPrismaBillingSubCreate: vi.fn(),
  mockPrismaTransaction: vi.fn(),
}));

const {
  mockWorkspaceRepoFindByTenantId,
  mockWorkspaceRepoFindByAgencyId,
  mockWorkspaceRepoFindMember,
  mockWorkspaceRepoAddMember,
  mockWorkspaceRepoCreate,
} = vi.hoisted(() => ({
  mockWorkspaceRepoFindByTenantId: vi.fn(),
  mockWorkspaceRepoFindByAgencyId: vi.fn(),
  mockWorkspaceRepoFindMember: vi.fn(),
  mockWorkspaceRepoAddMember: vi.fn(),
  mockWorkspaceRepoCreate: vi.fn(),
}));

const { mockBcryptHash } = vi.hoisted(() => ({ mockBcryptHash: vi.fn() }));
const { mockBcryptCompare } = vi.hoisted(() => ({ mockBcryptCompare: vi.fn() }));
const { mockCheckRateLimit } = vi.hoisted(() => ({ mockCheckRateLimit: vi.fn() }));

const { mockSettingFindUnique, mockWebsiteFindUnique } = vi.hoisted(() => ({
  mockSettingFindUnique: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
}));

// ─── Module mocks ────────────────────────────────────────────────────────────

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("next/navigation", () => ({ redirect: mockRedirect }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mockPrismaUserFindUnique,
      findFirst: vi.fn(),
      create: mockPrismaUserCreate,
      update: mockPrismaUserUpdate,
    },
    setting: { findUnique: mockSettingFindUnique },
    website: { findUnique: mockWebsiteFindUnique },
    websiteAgency: { create: mockPrismaWebsiteAgencyCreate },
    agencySubscription: { create: mockPrismaAgencySubCreate },
    billingAccount: { create: mockPrismaBillingAccountCreate },
    billingPlan: { findUnique: mockPrismaBillingPlanFindUnique },
    billingSubscription: { create: mockPrismaBillingSubCreate },
    workspace: { findUnique: vi.fn(), create: vi.fn() },
    workspaceMember: { findUnique: vi.fn(), create: vi.fn() },
    $transaction: mockPrismaTransaction,
  },
}));

vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: {
    findByTenantId: mockWorkspaceRepoFindByTenantId,
    findByAgencyId: mockWorkspaceRepoFindByAgencyId,
    findMember: mockWorkspaceRepoFindMember,
    addMember: mockWorkspaceRepoAddMember,
    create: mockWorkspaceRepoCreate,
  },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash, compare: mockBcryptCompare, genSalt: vi.fn() },
  hash: mockBcryptHash,
  compare: mockBcryptCompare,
}));
vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: mockCheckRateLimit }));

// ─── Imports ─────────────────────────────────────────────────────────────────

import { requireTenant } from "@/lib/auth/require-tenant";
import { authOptions } from "@/lib/auth";
import { POST } from "@/app/api/auth/register/route";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockRedirectRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeUser(overrides: Record<string, unknown> = {}) {
  return {
    id: "user-1",
    email: "test@test.com",
    name: "Test",
    tenantId: null,
    agencyId: null,
    role: "ADMIN",
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();

  // Default mock for $transaction: execute callback with tx stub
  mockPrismaTransaction.mockImplementation(
    async (cb: (tx: Record<string, unknown>) => unknown) =>
      cb({
        user: { create: mockPrismaUserCreate, update: mockPrismaUserUpdate },
        websiteAgency: { create: mockPrismaWebsiteAgencyCreate },
        agencySubscription: { create: mockPrismaAgencySubCreate },
        billingAccount: { create: mockPrismaBillingAccountCreate },
        billingPlan: { findUnique: mockPrismaBillingPlanFindUnique },
        billingSubscription: { create: mockPrismaBillingSubCreate },
      }),
  );

  // Default rate limiter: allowed
  mockCheckRateLimit.mockReturnValue({ allowed: true });

  // Default bcrypt: returns hashed password
  mockBcryptHash.mockResolvedValue("$2a$12$hashedpassword");
  mockBcryptCompare.mockResolvedValue(true);
});

// =============================================================================
// 1. requireTenant()
// =============================================================================

describe("requireTenant", () => {
  it("redirects to /admin/login when no session exists", async () => {
    mockGetServerSession.mockResolvedValue(null);

    await expect(requireTenant()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/admin/login");
  });

  it("redirects ADMIN without tenantId to /onboarding", async () => {
    mockGetServerSession.mockResolvedValue({ user: makeUser() });

    await expect(requireTenant()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
  });

  it("redirects AGENCY_ADMIN without tenantId to /agency", async () => {
    mockGetServerSession.mockResolvedValue({
      user: makeUser({ role: "AGENCY_ADMIN", agencyId: "agency-1" }),
    });

    await expect(requireTenant()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/agency");
  });

  it("redirects AGENCY_STAFF without tenantId to /agency", async () => {
    mockGetServerSession.mockResolvedValue({
      user: makeUser({ role: "AGENCY_STAFF", agencyId: "agency-1" }),
    });

    await expect(requireTenant()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/agency");
  });

  it("redirects unknown role without tenantId to /onboarding (fallback)", async () => {
    mockGetServerSession.mockResolvedValue({
      user: makeUser({ role: "UNKNOWN_ROLE" }),
    });

    await expect(requireTenant()).rejects.toThrow("NEXT_REDIRECT");
    expect(mockRedirect).toHaveBeenCalledWith("/onboarding");
  });

  it("returns TenantSession when ADMIN has tenantId", async () => {
    mockSettingFindUnique.mockResolvedValue({ id: "setting-1" });
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-1", publishStatus: null });
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "user-1",
        role: "ADMIN",
        tenantId: "tenant-1",
        agencyId: null,
        workspaceId: "ws-1",
        workspaceType: "TENANT",
        workspaceRole: "OWNER",
        email: "test@test.com",
        name: "Test User",
      },
    });

    const result = await requireTenant();

    expect(result).toEqual({
      userId: "user-1",
      tenantId: "tenant-1",
      role: "ADMIN",
      agencyId: null,
      workspaceId: "ws-1",
      workspaceType: "TENANT",
      workspaceRole: "OWNER",
      email: "test@test.com",
      name: "Test User",
    });
  });

  it("returns TenantSession when AGENCY_ADMIN has tenantId", async () => {
    mockSettingFindUnique.mockResolvedValue({ id: "setting-2" });
    mockWebsiteFindUnique.mockResolvedValue({ id: "website-2", publishStatus: null });
    mockGetServerSession.mockResolvedValue({
      user: {
        id: "user-2",
        role: "AGENCY_ADMIN",
        tenantId: "tenant-2",
        agencyId: "agency-1",
        workspaceId: "ws-2",
        workspaceType: "AGENCY",
        workspaceRole: "OWNER",
        email: "agency@test.com",
        name: "Agency User",
      },
    });

    const result = await requireTenant();

    expect(result.userId).toBe("user-2");
    expect(result.tenantId).toBe("tenant-2");
    expect(result.role).toBe("AGENCY_ADMIN");
    expect(result.agencyId).toBe("agency-1");
  });
});

// =============================================================================
// 2. resolveWorkspace() — tested through authOptions.callbacks.jwt
// =============================================================================

describe("resolveWorkspace (via jwt callback)", () => {
  it("skips workspace for SUPER_ADMIN", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "SUPER_ADMIN" }),
    });

    expect(token.workspaceId).toBeNull();
    expect(token.workspaceType).toBeNull();
    expect(token.workspaceRole).toBeNull();
    expect(mockWorkspaceRepoFindByTenantId).not.toHaveBeenCalled();
    expect(mockWorkspaceRepoCreate).not.toHaveBeenCalled();
  });

  it("skips workspace for ADMIN without tenantId (pre-provisioning)", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "ADMIN", tenantId: null, agencyId: null }),
    });

    expect(token.workspaceId).toBeNull();
    expect(mockWorkspaceRepoFindByTenantId).not.toHaveBeenCalled();
    expect(mockWorkspaceRepoCreate).not.toHaveBeenCalled();
  });

  it("uses existing workspace and adds member for ADMIN with tenantId", async () => {
    mockWorkspaceRepoFindByTenantId.mockResolvedValue({ id: "ws-1", type: "TENANT" });
    mockWorkspaceRepoFindMember.mockResolvedValue(null);
    mockWorkspaceRepoAddMember.mockResolvedValue({ role: "OWNER" });

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "ADMIN", tenantId: "tenant-1" }),
    });

    expect(token.workspaceId).toBe("ws-1");
    expect(token.workspaceType).toBe("TENANT");
    expect(token.workspaceRole).toBe("OWNER");
    expect(mockWorkspaceRepoAddMember).toHaveBeenCalledWith(
      expect.objectContaining({ role: "OWNER" }),
    );
  });

  it("does not add member if already a member", async () => {
    mockWorkspaceRepoFindByTenantId.mockResolvedValue({ id: "ws-1", type: "TENANT" });
    mockWorkspaceRepoFindMember.mockResolvedValue({ role: "OWNER" });

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "ADMIN", tenantId: "tenant-1" }),
    });

    expect(token.workspaceId).toBe("ws-1");
    expect(mockWorkspaceRepoAddMember).not.toHaveBeenCalled();
  });

  it("creates TENANT workspace when ADMIN has tenantId but no workspace exists", async () => {
    mockWorkspaceRepoFindByTenantId.mockResolvedValue(null);
    mockWorkspaceRepoCreate.mockResolvedValue({ id: "ws-new", type: "TENANT" });

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "ADMIN", tenantId: "tenant-new" }),
    });

    expect(token.workspaceId).toBe("ws-new");
    expect(token.workspaceType).toBe("TENANT");
    expect(mockWorkspaceRepoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "TENANT", tenantId: "tenant-new" }),
    );
  });

  it("creates AGENCY workspace for AGENCY_ADMIN without tenantId", async () => {
    mockWorkspaceRepoFindByAgencyId.mockResolvedValue(null);
    mockWorkspaceRepoCreate.mockResolvedValue({ id: "ws-agency", type: "AGENCY" });

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "AGENCY_ADMIN", tenantId: null, agencyId: "agency-1" }),
    });

    expect(token.workspaceId).toBe("ws-agency");
    expect(token.workspaceType).toBe("AGENCY");
    expect(mockWorkspaceRepoCreate).toHaveBeenCalledWith(
      expect.objectContaining({ type: "AGENCY", agencyId: "agency-1" }),
    );
  });

  it("assigns MEMBER role for AGENCY_STAFF", async () => {
    mockWorkspaceRepoFindByAgencyId.mockResolvedValue(null);
    mockWorkspaceRepoCreate.mockResolvedValue({ id: "ws-staff", type: "AGENCY" });

    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "AGENCY_STAFF", tenantId: null, agencyId: "agency-1" }),
    });

    expect(token.workspaceId).toBe("ws-staff");
    expect(mockWorkspaceRepoAddMember).toHaveBeenCalledWith(
      expect.objectContaining({ role: "MEMBER" }),
    );
  });

  it("returns null workspace when role is ADMIN but tenantId and agencyId are null", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({ role: "ADMIN", tenantId: null, agencyId: null }),
    });

    expect(token.workspaceId).toBeNull();
  });

  it("preserves existing workspaceId when user already has one", async () => {
    const token = await authOptions.callbacks!.jwt!({
      token: {},
      user: makeUser({
        role: "ADMIN",
        tenantId: "tenant-1",
        workspaceId: "ws-existing",
        workspaceType: "TENANT",
        workspaceRole: "OWNER",
      }),
    });

    expect(token.workspaceId).toBe("ws-existing");
    expect(mockWorkspaceRepoFindByTenantId).not.toHaveBeenCalled();
    expect(mockWorkspaceRepoCreate).not.toHaveBeenCalled();
  });
});

// =============================================================================
// 3. Register route — POST /api/auth/register
// =============================================================================

describe("POST /api/auth/register", () => {
  it("returns 400 when email is missing", async () => {
    const res = await POST(mockRedirectRequest({ password: "password123" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/email/i);
  });

  it("returns 400 when password is missing", async () => {
    const res = await POST(mockRedirectRequest({ email: "test@test.com" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/password/i);
  });

  it("returns 400 when password is too short", async () => {
    const res = await POST(mockRedirectRequest({ email: "test@test.com", password: "short" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/8 characters/i);
  });

  it("returns 409 when email already exists", async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ id: "existing-id" });

    const res = await POST(
      mockRedirectRequest({ email: "existing@test.com", password: "password123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.error).toMatch(/already exists/i);
  });

  it("creates creator user with role ADMIN, no agency", async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null);
    mockPrismaUserCreate.mockResolvedValue({ id: "creator-id", email: "creator@test.com" });
    mockPrismaBillingPlanFindUnique.mockResolvedValue(null);

    const res = await POST(
      mockRedirectRequest({
        email: "creator@test.com",
        password: "password123",
        persona: "creator",
        name: "Creator User",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.userId).toBe("creator-id");

    const createArgs = mockPrismaUserCreate.mock.lastCall;
    expect(createArgs).toBeDefined();
    expect(createArgs![0]).toMatchObject({ data: expect.objectContaining({ role: "ADMIN" }) });

    expect(mockPrismaWebsiteAgencyCreate).not.toHaveBeenCalled();
  });

  it("creates agency user with role AGENCY_ADMIN, creates agency", async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null);
    mockPrismaUserCreate.mockResolvedValue({ id: "agency-user-id", email: "agency@test.com", name: "Agency User" });
    mockPrismaWebsiteAgencyCreate.mockResolvedValue({ id: "agency-1" });
    mockPrismaBillingPlanFindUnique.mockResolvedValue(null);

    const res = await POST(
      mockRedirectRequest({
        email: "agency@test.com",
        password: "password123",
        persona: "agency",
        name: "Agency User",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.success).toBe(true);

    const createArgs = mockPrismaUserCreate.mock.lastCall;
    expect(createArgs).toBeDefined();
    expect(createArgs![0]).toMatchObject({ data: expect.objectContaining({ role: "AGENCY_ADMIN" }) });

    expect(mockPrismaWebsiteAgencyCreate).toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    mockCheckRateLimit.mockReturnValue({ allowed: false });

    const res = await POST(
      mockRedirectRequest({ email: "ratelimited@test.com", password: "password123" }),
    );

    expect(res.status).toBe(429);
  });

  it("returns 500 on internal error", async () => {
    mockPrismaUserFindUnique.mockRejectedValue(new Error("DB down"));

    const res = await POST(
      mockRedirectRequest({ email: "fail@test.com", password: "password123" }),
    );
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/internal server error/i);
  });
});
