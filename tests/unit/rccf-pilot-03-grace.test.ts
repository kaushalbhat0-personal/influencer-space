import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockTenantFindFirst: vi.fn(),
  mockSettingFindUnique: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
  mockPublishStatusFindUnique: vi.fn(),
  mockPublishSnapshotFindFirst: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockResolveActivePlan: vi.fn(),
  mockGetPublishedPageData: vi.fn(),
  mockBuilderLoad: vi.fn(),
  mockBuildWithDiagnostics: vi.fn(),
  mockGetOrGenerate: vi.fn(),
  mockGet: vi.fn(),
  mockThemeGetById: vi.fn(),
  mockExperienceResolve: vi.fn(),
  mockApplyExperienceOverride: vi.fn(),
  mockResolveExperienceForCapabilities: vi.fn(),
  mockBuildRuntimeSnapshot: vi.fn(),
  mockRenderableNavBases: vi.fn(),
  mockReconcileNavigation: vi.fn(),
  mockLayoutResolve: vi.fn(),
  mockGoalProfileGet: vi.fn(),
}));

vi.mock("react", () => ({ cache: (fn: unknown) => fn as unknown }));
vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: h.mockTenantFindFirst },
    setting: { findUnique: h.mockSettingFindUnique },
    website: { findUnique: h.mockWebsiteFindUnique },
    publishStatus: { findUnique: h.mockPublishStatusFindUnique },
    publishSnapshot: { findFirst: h.mockPublishSnapshotFindFirst },
    workspace: { findUnique: vi.fn(), findFirst: vi.fn() },
    agencyTeamInvitation: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    workspaceMember: { count: vi.fn(), findUnique: vi.fn() },
    websiteAgency: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    billingSubscription: { findFirst: vi.fn() },
  },
}));
vi.mock("@/services/published.service", () => ({ getPublishedPageData: h.mockGetPublishedPageData }));
vi.mock("@/lib/builder/builder-service", () => ({ BuilderService: class { load = h.mockBuilderLoad } }));
vi.mock("@/modules/tenant/application/website-aggregate.service", () => ({ websiteAggregateService: { buildWithDiagnostics: h.mockBuildWithDiagnostics } }));
vi.mock("@/lib/navigation/service", () => ({ navigationService: { getOrGenerate: h.mockGetOrGenerate, get: h.mockGet } }));
vi.mock("@/lib/theme/registry-new", () => ({ themeRegistry: { getById: h.mockThemeGetById } }));
vi.mock("@/lib/navigation/reconcile", () => ({ renderableNavBases: h.mockRenderableNavBases, reconcileNavigation: h.mockReconcileNavigation }));
vi.mock("@/lib/storefront/layout-engine", () => ({ layoutEngine: { resolve: h.mockLayoutResolve } }));
vi.mock("@/modules/goals-runtime", () => ({ goalProfileService: { getProfile: h.mockGoalProfileGet } }));
vi.mock("@/modules/theme/runtime/experience", () => ({ experienceRegistry: { resolve: h.mockExperienceResolve }, applyExperienceOverride: h.mockApplyExperienceOverride, resolveExperienceForCapabilities: h.mockResolveExperienceForCapabilities }));
vi.mock("@/modules/billing/application/plan-source", () => ({ resolveActivePlan: h.mockResolveActivePlan }));
vi.mock("@/lib/storefront/build-snapshot", () => ({ buildRuntimeSnapshot: h.mockBuildRuntimeSnapshot }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined), logAgencyAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/modules/communication", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/modules/communication")>();
  return { ...mod, sendCommunication: vi.fn().mockResolvedValue({ success: true }) };
});

import { getStorefrontData } from "@/lib/storefront/storefront-loader";

const PUBLISHED = { _schema: "creatorstore.snapshot", kind: "published" } as unknown;
const DRAFT = { _schema: "creatorstore.snapshot", kind: "draft" } as unknown;

function seed() {
  h.mockTenantFindFirst.mockResolvedValue({ id: "tenant-pilot", subdomain: "pilot-acme", customDomain: null });
  h.mockWebsiteFindUnique.mockResolvedValue({ id: "website-1", createdAt: new Date(Date.now() - 5 * 24 * 3600000) } as unknown);
  h.mockPublishStatusFindUnique.mockResolvedValue({ publishedAt: new Date(Date.now() - 10 * 24 * 3600000), createdAt: new Date(), state: "live" } as unknown);
  h.mockPublishSnapshotFindFirst.mockResolvedValue({ id: "snap1" } as unknown);
  h.mockGetPublishedPageData.mockResolvedValue({ snapshot: PUBLISHED } as unknown);
  h.mockBuilderLoad.mockResolvedValue([{ id: "page-1" }]);
  h.mockBuildWithDiagnostics.mockResolvedValue({ aggregate: { identity: { name: "Acme" } }, invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] });
  h.mockGetOrGenerate.mockResolvedValue([]);
  h.mockGet.mockResolvedValue([]);
  h.mockThemeGetById.mockReturnValue(undefined);
  h.mockExperienceResolve.mockReturnValue({});
  h.mockApplyExperienceOverride.mockReturnValue({});
  h.mockResolveExperienceForCapabilities.mockReturnValue({});
  h.mockBuildRuntimeSnapshot.mockReturnValue(DRAFT);
  h.mockRenderableNavBases.mockReturnValue([]);
  h.mockReconcileNavigation.mockImplementation((p: unknown) => p as unknown);
  h.mockLayoutResolve.mockReturnValue({ pages: [{ isHome: true, sections: [] }] } as unknown);
  h.mockGoalProfileGet.mockResolvedValue(null);
  h.mockResolveActivePlan.mockResolvedValue({ code: null, origin: "none", status: "EXPIRED" });
  h.mockGetServerSession.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  seed();
});

describe("RCCF-PILOT-03 B — pilot prospect grace", () => {
  it("pilot remains publicly viewable during 30-day window after trial expiry", async () => {
    h.mockSettingFindUnique.mockResolvedValue({ value: true } as unknown);
    const result = await getStorefrontData("pilot-acme", false);
    expect(result).not.toBeNull();
    expect((result?.snapshot as { kind: string }).kind).toBe("published");
  });

  it("non-pilot still 404 after trial expiry", async () => {
    h.mockSettingFindUnique.mockResolvedValue(null as unknown);
    const result = await getStorefrontData("pilot-acme", false);
    expect(result).toBeNull();
    expect(h.mockGetPublishedPageData).not.toHaveBeenCalled();
  });

  it("pilot beyond 30-day window returns 404", async () => {
    h.mockSettingFindUnique.mockResolvedValue({ value: true } as unknown);
    h.mockPublishStatusFindUnique.mockResolvedValue({ publishedAt: new Date(Date.now() - 31 * 24 * 3600000), createdAt: new Date(), state: "live" } as unknown);
    const result = await getStorefrontData("pilot-acme", false);
    expect(result).toBeNull();
  });

  it("pilot with no live snapshot still 404 even within window", async () => {
    h.mockSettingFindUnique.mockResolvedValue({ value: true } as unknown);
    h.mockPublishStatusFindUnique.mockResolvedValue({ publishedAt: new Date(), createdAt: new Date(), state: "draft" } as unknown);
    h.mockPublishSnapshotFindFirst.mockResolvedValue(null as unknown);
    const result = await getStorefrontData("pilot-acme", false);
    expect(result).toBeNull();
  });

  it("tenant isolation: pilot flag on other tenant does not affect current", async () => {
    h.mockSettingFindUnique.mockImplementation(async (args: unknown) => {
      const a = args as { where: { tenantId_key: { tenantId: string; key: string } } };
      if (a.where.tenantId_key.tenantId === "tenant-pilot") return null as unknown;
      return { value: true } as unknown;
    });
    const result = await getStorefrontData("pilot-acme", false);
    expect(result).toBeNull();
  });

  it("previewAuthorized true still returns draft regardless of pilot", async () => {
    h.mockSettingFindUnique.mockResolvedValue({ value: true } as unknown);
    h.mockGetServerSession.mockResolvedValue({ user: { tenantId: "tenant-pilot" } });
    // need tenant still pilot-acme, but resolveActivePlan null should be bypassed by preview
    const result = await getStorefrontData("pilot-acme", true);
    expect((result?.snapshot as { kind: string }).kind).toBe("draft");
    expect(result?.previewAuthorized).toBe(true);
  });

  it("active plan still serves published without needing pilot flag", async () => {
    h.mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" } as unknown);
    h.mockSettingFindUnique.mockResolvedValue(null as unknown);
    const result = await getStorefrontData("pilot-acme", false);
    expect((result?.snapshot as { kind: string }).kind).toBe("published");
  });
});
