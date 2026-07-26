import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCreateRun,
  mockQueryRawUnsafe,
  mockWebsiteFindUnique,
  mockUserFindFirst,
  mockFindUniqueRun,
  mockProvisionEventCreate,
  mockProvisionRunUpdate,
  mockFindFirstRun,
  mockWorkspaceCreate,
  mockWorkspaceAddMember,
  mockWorkspaceFindByTenantId,
  mockGetTemplate,
  mockTemplateApply,
  mockSeedStarterData,
  mockThemeApply,
  mockSlugGenerate,
  mockBcryptHash,
} = vi.hoisted(() => ({
  mockCreateRun: vi.fn(),
  mockQueryRawUnsafe: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
  mockUserFindFirst: vi.fn(),
  mockFindUniqueRun: vi.fn(),
  mockProvisionEventCreate: vi.fn(),
  mockProvisionRunUpdate: vi.fn(),
  mockFindFirstRun: vi.fn(),
  mockWorkspaceCreate: vi.fn(),
  mockWorkspaceAddMember: vi.fn(),
  mockWorkspaceFindByTenantId: vi.fn(),
  mockGetTemplate: vi.fn(),
  mockTemplateApply: vi.fn(),
  mockSeedStarterData: vi.fn(),
  mockThemeApply: vi.fn(),
  mockSlugGenerate: vi.fn(),
  mockBcryptHash: vi.fn(),
}));

mockFindUniqueRun.mockResolvedValue({
  id: "run-1",
  creatorName: "Test Creator",
  status: "PENDING",
  currentStep: "IMPORT_REQUESTED",
  startedAt: new Date(),
  completedAt: null,
  error: null,
  durationMs: null,
  tenantId: null,
  tenantSlug: null,
  sourceUrl: null,
  sourcePlatform: null,
  events: [],
});

mockFindFirstRun.mockResolvedValue({
  currentStep: "PROVISIONING",
  startedAt: new Date(),
});

mockQueryRawUnsafe.mockResolvedValue([{ tenant_id: "tenant-uuid-1" }]);
mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1", tenantId: "tenant-uuid-1", themePackageId: "neon-dark", themeColors: {}, themeFonts: {}, createdAt: new Date(), updatedAt: new Date() });
mockUserFindFirst.mockResolvedValue({ id: "user-uuid-1" });
mockSlugGenerate.mockResolvedValue("test-creator");
mockBcryptHash.mockResolvedValue("hashed-pw");
mockWorkspaceCreate.mockResolvedValue({ id: "ws-uuid-1", tenantId: "tenant-uuid-1", name: "Test Creator", slug: "test-creator", type: "TENANT" });
mockWorkspaceFindByTenantId.mockResolvedValue({ id: "ws-uuid-1", tenantId: "tenant-uuid-1" });
mockThemeApply.mockResolvedValue(undefined);
mockGetTemplate.mockReturnValue(null);

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRawUnsafe: mockQueryRawUnsafe,
    creatorProvisionRun: { create: mockCreateRun, update: mockProvisionRunUpdate, findUnique: mockFindUniqueRun, findFirst: mockFindFirstRun },
    creatorProvisionEvent: { create: mockProvisionEventCreate },
    website: { findUnique: mockWebsiteFindUnique },
    user: { findFirst: mockUserFindFirst },
  },
}));

vi.mock("@/lib/slug/tenant-slug.service", () => ({
  tenantSlugService: { generate: mockSlugGenerate },
}));

vi.mock("@/lib/template", () => ({
  templateService: { getTemplate: mockGetTemplate, apply: mockTemplateApply },
}));

vi.mock("@/lib/data/seeder", () => ({
  seedStarterData: mockSeedStarterData,
}));

vi.mock("@/lib/theme", () => ({
  themeService: { apply: mockThemeApply },
}));

vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { create: mockWorkspaceCreate, addMember: mockWorkspaceAddMember, findByTenantId: mockWorkspaceFindByTenantId },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
}));

vi.mock("@/lib/config/platform", () => ({
  buildStorefrontUrl: (slug: string) => `http://localhost:3000/${slug}`,
  buildDashboardUrl: () => "http://localhost:3000/admin/dashboard",
  buildAdminEmail: (slug: string) => `admin@${slug}.test`,
}));

import { provisioningService } from "@/lib/provisioning/provisioning-service";

const baseInput = {
  runId: "run-1",
  creatorName: "Test Creator",
  sourceUrl: "https://youtube.com/@test",
  sourcePlatform: "youtube",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("provisioningService.createRun", () => {
  it("creates a PENDING provisioning run", async () => {
    mockCreateRun.mockResolvedValue({ id: "run-new" });

    const runId = await provisioningService.createRun({ creatorName: "New Creator" });

    expect(mockCreateRun).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorName: "New Creator",
        status: "PENDING",
        currentStep: "IMPORT_REQUESTED",
      }),
      select: { id: true },
    });
    expect(runId).toBe("run-new");
  });
});

describe("provisioningService.provision", () => {
  it("returns tenantId from provisioning SQL", async () => {
    const result = await provisioningService.provision(baseInput);
    expect(result.tenantId).toBe("tenant-uuid-1");
  });

  it("returns actual websiteId (not tenantId)", async () => {
    const result = await provisioningService.provision(baseInput);
    expect(result.websiteId).toBe("website-uuid-1");
    expect(result.websiteId).not.toBe(result.tenantId);
  });

  it("returns tenantSlug from slug service", async () => {
    const result = await provisioningService.provision(baseInput);
    expect(result.tenantSlug).toBe("test-creator");
  });

  it("returns websiteStatus as published", async () => {
    const result = await provisioningService.provision(baseInput);
    expect(result.websiteStatus).toBe("published");
  });

  it("throws on empty creator name", async () => {
    await expect(provisioningService.provision({ ...baseInput, creatorName: "A" })).rejects.toThrow("Creator name must be at least 2 characters");
  });

  it("creates workspace for the tenant", async () => {
    await provisioningService.provision(baseInput);
    expect(mockWorkspaceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-uuid-1" }),
    );
  });

  it("logs provisioning events", async () => {
    await provisioningService.provision(baseInput);
    expect(mockProvisionRunUpdate).toHaveBeenCalled();
  });

  it("falls back to tenantId for websiteId when website lookup returns null", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);

    const result = await provisioningService.provision(baseInput);
    expect(result.websiteId).toBe("tenant-uuid-1");
  });
});
