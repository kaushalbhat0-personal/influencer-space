import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mock variables ───────────────────────────────────────────────────

const { mockGetServerSession } = vi.hoisted(() => ({ mockGetServerSession: vi.fn() }));
const { mockTenantFindFirst, mockWebsiteFindUnique } = vi.hoisted(() => ({
  mockTenantFindFirst: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
}));
const { mockGetPublishedPageData } = vi.hoisted(() => ({ mockGetPublishedPageData: vi.fn() }));
const { mockBuilderLoad } = vi.hoisted(() => ({ mockBuilderLoad: vi.fn() }));
const { mockBuildWithDiagnostics } = vi.hoisted(() => ({ mockBuildWithDiagnostics: vi.fn() }));
const { mockGetOrGenerate } = vi.hoisted(() => ({ mockGetOrGenerate: vi.fn() }));
const { mockThemeGetById } = vi.hoisted(() => ({ mockThemeGetById: vi.fn() }));
const { mockExperienceResolve } = vi.hoisted(() => ({ mockExperienceResolve: vi.fn() }));
const { mockApplyExperienceOverride } = vi.hoisted(() => ({ mockApplyExperienceOverride: vi.fn() }));
const { mockResolveExperienceForCapabilities } = vi.hoisted(() => ({
  mockResolveExperienceForCapabilities: vi.fn(),
}));
const { mockResolveActivePlan } = vi.hoisted(() => ({ mockResolveActivePlan: vi.fn() }));
const { mockBuildRuntimeSnapshot } = vi.hoisted(() => ({ mockBuildRuntimeSnapshot: vi.fn() }));

// ─── Module mocks ─────────────────────────────────────────────────────────────

vi.mock("next-auth", () => ({ getServerSession: mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
// React 18.3's CJS build does not expose `cache` (Next aliases its own); the
// loader uses it only for per-request dedup, which is irrelevant in tests.
vi.mock("react", () => ({ cache: (fn: unknown) => fn as unknown }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: mockTenantFindFirst },
    website: { findUnique: mockWebsiteFindUnique },
  },
}));

vi.mock("@/services/published.service", () => ({ getPublishedPageData: mockGetPublishedPageData }));
vi.mock("@/lib/builder/builder-service", () => ({
  BuilderService: class { load = mockBuilderLoad },
}));
vi.mock("@/modules/tenant/application/website-aggregate.service", () => ({
  websiteAggregateService: { buildWithDiagnostics: mockBuildWithDiagnostics },
}));
vi.mock("@/lib/navigation/service", () => ({
  navigationService: { getOrGenerate: mockGetOrGenerate },
}));
vi.mock("@/lib/theme/registry-new", () => ({ themeRegistry: { getById: mockThemeGetById } }));
vi.mock("@/modules/theme/runtime/experience", () => ({
  experienceRegistry: { resolve: mockExperienceResolve },
  applyExperienceOverride: mockApplyExperienceOverride,
  resolveExperienceForCapabilities: mockResolveExperienceForCapabilities,
}));
vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: mockResolveActivePlan,
}));
vi.mock("@/lib/storefront/build-snapshot", () => ({
  buildRuntimeSnapshot: mockBuildRuntimeSnapshot,
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { canPreviewTenant } from "@/lib/storefront/preview-auth";
import { getStorefrontData } from "@/lib/storefront/storefront-loader";

const PUBLISHED_SNAPSHOT = { _schema: "creatorstore.snapshot", kind: "published" };
const DRAFT_SNAPSHOT = { _schema: "creatorstore.snapshot", kind: "draft" };

function seedLoaderMocks() {
  mockTenantFindFirst.mockResolvedValue({ id: "tenant-1", subdomain: "acme" });
  mockWebsiteFindUnique.mockResolvedValue({
    id: "website-1", themePackageId: null, themeColors: {}, themeFonts: {}, themeConfig: {},
  });
  mockGetPublishedPageData.mockResolvedValue({ snapshot: PUBLISHED_SNAPSHOT });
  mockBuilderLoad.mockResolvedValue([{ id: "page-1" }]);
  mockBuildWithDiagnostics.mockResolvedValue({
    aggregate: { identity: { name: "Acme" } }, invalidAssetIds: [], skippedAssets: 0, moduleFailures: [],
  });
  mockGetOrGenerate.mockResolvedValue([]);
  mockThemeGetById.mockReturnValue(undefined);
  mockExperienceResolve.mockReturnValue({});
  mockApplyExperienceOverride.mockReturnValue({});
  mockResolveExperienceForCapabilities.mockReturnValue({});
  mockResolveActivePlan.mockResolvedValue({ code: "creator_launch" });
  mockBuildRuntimeSnapshot.mockReturnValue(DRAFT_SNAPSHOT);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// 1. canPreviewTenant — the canonical authorization predicate
// =============================================================================

describe("canPreviewTenant (RCCF-72.9)", () => {
  it("ALLOWS when the authenticated session belongs to the tenant", async () => {
    mockGetServerSession.mockResolvedValue({ user: { tenantId: "tenant-1" } });
    await expect(canPreviewTenant("tenant-1")).resolves.toBe(true);
  });

  it("DENIES anonymous viewers (no session)", async () => {
    mockGetServerSession.mockResolvedValue(null);
    await expect(canPreviewTenant("tenant-1")).resolves.toBe(false);
  });

  it("DENIES an authenticated user from a different tenant", async () => {
    mockGetServerSession.mockResolvedValue({ user: { tenantId: "tenant-A" } });
    await expect(canPreviewTenant("tenant-B")).resolves.toBe(false);
  });

  it("DENIES a session without a tenant (super admin / agency)", async () => {
    mockGetServerSession.mockResolvedValue({ user: { tenantId: null } });
    await expect(canPreviewTenant("tenant-1")).resolves.toBe(false);
  });
});

// =============================================================================
// 2. getStorefrontData — which snapshot each caller receives
// =============================================================================

describe("getStorefrontData preview gating (RCCF-72.9)", () => {
  it("anonymous normal storefront → published snapshot", async () => {
    seedLoaderMocks();
    mockGetServerSession.mockResolvedValue(null);

    const result = await getStorefrontData("acme", false);

    expect(mockGetPublishedPageData).toHaveBeenCalledWith("tenant-1");
    expect(mockBuildRuntimeSnapshot).not.toHaveBeenCalled();
    expect((result?.snapshot as { kind: string }).kind).toBe("published");
  });

  it("anonymous ?preview=true → denied (published snapshot, no draft)", async () => {
    seedLoaderMocks();
    mockGetServerSession.mockResolvedValue(null);

    const result = await getStorefrontData("acme", true);

    expect(mockGetPublishedPageData).toHaveBeenCalledWith("tenant-1");
    expect(mockBuildRuntimeSnapshot).not.toHaveBeenCalled();
    expect((result?.snapshot as { kind: string }).kind).toBe("published");
  });

  it("authenticated tenant owner ?preview=true → draft snapshot", async () => {
    seedLoaderMocks();
    mockGetServerSession.mockResolvedValue({ user: { tenantId: "tenant-1" } });

    const result = await getStorefrontData("acme", true);

    expect(mockBuildRuntimeSnapshot).toHaveBeenCalled();
    expect(mockGetPublishedPageData).not.toHaveBeenCalled();
    expect((result?.snapshot as { kind: string }).kind).toBe("draft");
  });

  it("authenticated wrong-tenant ?preview=true → denied (published snapshot)", async () => {
    seedLoaderMocks();
    mockGetServerSession.mockResolvedValue({ user: { tenantId: "tenant-OTHER" } });

    const result = await getStorefrontData("acme", true);

    expect(mockGetPublishedPageData).toHaveBeenCalledWith("tenant-1");
    expect(mockBuildRuntimeSnapshot).not.toHaveBeenCalled();
    expect((result?.snapshot as { kind: string }).kind).toBe("published");
  });

  it("preview cannot fall back to another tenant's snapshot (tenant resolved from slug)", async () => {
    seedLoaderMocks();
    mockTenantFindFirst.mockResolvedValue({ id: "tenant-2", subdomain: "other" });
    mockGetServerSession.mockResolvedValue({ user: { tenantId: "tenant-1" } }); // owner of tenant-1 only

    const result = await getStorefrontData("other", true);

    // tenant resolved = tenant-2; session = tenant-1 → denied → published for tenant-2
    expect(mockGetPublishedPageData).toHaveBeenCalledWith("tenant-2");
    expect(mockBuildRuntimeSnapshot).not.toHaveBeenCalled();
    expect((result?.snapshot as { kind: string }).kind).toBe("published");
  });
});
