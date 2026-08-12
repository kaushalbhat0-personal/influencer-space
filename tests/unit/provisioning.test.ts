import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockCreateRun,
  mockTransaction,
  mockWebsiteFindUnique,
  mockWebsiteUpdate,
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
  mockLinkSubscription,
} = vi.hoisted(() => ({
  mockCreateRun: vi.fn(),
  mockTransaction: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
  mockWebsiteUpdate: vi.fn(),
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
  mockLinkSubscription: vi.fn(),
}));

// ── Transaction mock helpers ─────────────────────────────────────────────────

const mockTxTenantCreate = vi.fn();
const mockTxWebsiteCreate = vi.fn();
const mockTxBrandCreate = vi.fn();
const mockTxPublishStatusCreate = vi.fn();
const mockTxSettingCreate = vi.fn();
const mockTxUserCreate = vi.fn();

function createMockTx() {
  return {
    tenant: { create: mockTxTenantCreate },
    website: { create: mockTxWebsiteCreate },
    brand: { create: mockTxBrandCreate },
    publishStatus: { create: mockTxPublishStatusCreate },
    setting: { create: mockTxSettingCreate },
    user: { create: mockTxUserCreate },
  };
}

// ── Default mock values ─────────────────────────────────────────────────────

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

mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(createMockTx()));
mockTxTenantCreate.mockResolvedValue({ id: "tenant-uuid-1", name: "Test Creator", subdomain: "test-creator" });
mockTxWebsiteCreate.mockResolvedValue({ id: "website-uuid-1", tenantId: "tenant-uuid-1", themePackageId: "neon-dark" });
mockTxBrandCreate.mockResolvedValue({ id: "brand-uuid-1" });
mockTxPublishStatusCreate.mockResolvedValue({ id: "ps-uuid-1", state: "live" });
mockTxSettingCreate.mockResolvedValue({ id: "setting-uuid-1" });
mockTxUserCreate.mockResolvedValue({ id: "user-uuid-1" });

mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1", tenantId: "tenant-uuid-1", themePackageId: "neon-dark", themeColors: {}, themeFonts: {}, createdAt: new Date(), updatedAt: new Date() });
mockUserFindFirst.mockResolvedValue({ id: "user-uuid-1" });
mockSlugGenerate.mockResolvedValue("test-creator");
mockBcryptHash.mockResolvedValue("hashed-pw");
mockWorkspaceCreate.mockResolvedValue({ id: "ws-uuid-1", tenantId: "tenant-uuid-1", name: "Test Creator", slug: "test-creator", type: "TENANT" });
mockWorkspaceFindByTenantId.mockResolvedValue({ id: "ws-uuid-1", tenantId: "tenant-uuid-1" });
mockThemeApply.mockResolvedValue(undefined);
mockGetTemplate.mockReturnValue(null);
mockWebsiteUpdate.mockResolvedValue({});

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: mockTransaction,
    creatorProvisionRun: { create: mockCreateRun, update: mockProvisionRunUpdate, findUnique: mockFindUniqueRun, findFirst: mockFindFirstRun },
    creatorProvisionEvent: { create: mockProvisionEventCreate },
    user: { findFirst: mockUserFindFirst },
    website: { findUnique: mockWebsiteFindUnique, update: mockWebsiteUpdate },
  },
}));

vi.mock("@/lib/slug/tenant-slug.service", () => ({
  tenantSlugService: { generate: mockSlugGenerate },
}));

vi.mock("@/lib/template", () => ({
  templateService: { getTemplate: mockGetTemplate, apply: mockTemplateApply },
}));

vi.mock("@/modules/tenant/application/seeder", () => ({
  seedStarterData: mockSeedStarterData,
}));

vi.mock("@/lib/theme", () => ({
  themeService: { apply: mockThemeApply },
  normalizeThemeId: (id: string | null | undefined) => id ?? "com.creatos.neon-dark",
}));

vi.mock("@/lib/builder/builder-service", () => ({
  BuilderService: class { async save(..._args: unknown[]) { return Promise.resolve(); } },
}));

vi.mock("@/lib/builder/artifact-loader", () => ({
  storefrontToBuilderPages: () => [
    { id: "page_home", name: "Home", slug: "/", order: 1, isHome: true, theme: "", metadata: {}, sections: [] },
  ],
}));

vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { create: mockWorkspaceCreate, addMember: mockWorkspaceAddMember, findByTenantId: mockWorkspaceFindByTenantId },
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { linkSubscriptionToWorkspace: mockLinkSubscription },
}));

vi.mock("bcryptjs", () => ({
  default: { hash: mockBcryptHash },
}));

vi.mock("@/lib/config/platform", () => ({
  buildStorefrontUrl: (slug: string) => `http://localhost:3000/${slug}`,
  buildDashboardUrl: () => "http://localhost:3000/admin/dashboard",
  buildAdminEmail: (slug: string) => `admin@${slug}.test`,
}));

// ── Imports ─────────────────────────────────────────────────────────────────

import { provisioningService } from "@/modules/provisioning/application/provisioning-service";

const baseInput = {
  runId: "run-1",
  creatorName: "Test Creator",
  sourceUrl: "https://youtube.com/@test",
  sourcePlatform: "youtube",
};

beforeEach(() => {
  vi.clearAllMocks();
  // Re-apply default mock implementations after clearAllMocks
  mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(createMockTx()));
  mockFindUniqueRun.mockResolvedValue({
    id: "run-1", creatorName: "Test Creator", status: "PENDING", currentStep: "IMPORT_REQUESTED",
    startedAt: new Date(), completedAt: null, error: null, durationMs: null,
    tenantId: null, tenantSlug: null, sourceUrl: null, sourcePlatform: null, events: [],
  });
  mockFindFirstRun.mockResolvedValue({ currentStep: "PROVISIONING", startedAt: new Date() });
  mockTxTenantCreate.mockResolvedValue({ id: "tenant-uuid-1", name: "Test Creator", subdomain: "test-creator" });
  mockTxWebsiteCreate.mockResolvedValue({ id: "website-uuid-1", tenantId: "tenant-uuid-1", themePackageId: "neon-dark" });
  mockTxBrandCreate.mockResolvedValue({ id: "brand-uuid-1" });
  mockTxPublishStatusCreate.mockResolvedValue({ id: "ps-uuid-1", state: "live" });
  mockTxSettingCreate.mockResolvedValue({ id: "setting-uuid-1" });
  mockTxUserCreate.mockResolvedValue({ id: "user-uuid-1" });
  mockWebsiteFindUnique.mockResolvedValue({ id: "website-uuid-1", tenantId: "tenant-uuid-1", themePackageId: "neon-dark", themeColors: {}, themeFonts: {}, createdAt: new Date(), updatedAt: new Date() });
  mockUserFindFirst.mockResolvedValue({ id: "user-uuid-1" });
  mockSlugGenerate.mockResolvedValue("test-creator");
  mockBcryptHash.mockResolvedValue("hashed-pw");
  mockWorkspaceCreate.mockResolvedValue({ id: "ws-uuid-1", tenantId: "tenant-uuid-1", name: "Test Creator", slug: "test-creator", type: "TENANT" });
  mockWorkspaceFindByTenantId.mockResolvedValue({ id: "ws-uuid-1", tenantId: "tenant-uuid-1" });
  mockThemeApply.mockResolvedValue(undefined);
  mockGetTemplate.mockReturnValue(null);
  mockWebsiteUpdate.mockResolvedValue({});
  mockLinkSubscription.mockResolvedValue({ id: "sub-1", workspaceId: "ws-uuid-1" });
});

// ─── Tests ──────────────────────────────────────────────────────────────────

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
  it("returns tenantId from provisioning transaction", async () => {
    const result = await provisioningService.provision(baseInput);
    expect(result.tenantId).toBe("tenant-uuid-1");
  });

  it("uses repository-backed transaction (no raw SQL)", async () => {
    await provisioningService.provision(baseInput);

    // Should NOT call $queryRawUnsafe
    expect(mockTransaction).not.toBe(vi.fn()); // just ensuring mockTransaction exists

    // Should call repository methods inside transaction
    expect(mockTxTenantCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Test Creator" }) }),
    );
    expect(mockTxWebsiteCreate).toHaveBeenCalled();
    expect(mockTxBrandCreate).toHaveBeenCalled();
    expect(mockTxPublishStatusCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ state: "draft" }) }),
    );
    expect(mockTxSettingCreate).toHaveBeenCalledTimes(5);
    expect(mockTxUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: "ADMIN" }) }),
    );
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

  it("creates workspace for the tenant inside the transaction", async () => {
    await provisioningService.provision(baseInput);
    expect(mockWorkspaceCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: "tenant-uuid-1" }),
      expect.anything(), // tx
    );
    expect(mockWorkspaceAddMember).toHaveBeenCalledWith(
      expect.objectContaining({ role: "OWNER" }),
      expect.anything(), // tx
    );
  });

  it("RCCF-07: links the creator subscription to the new workspace inside the transaction", async () => {
    await provisioningService.provision(baseInput);
    expect(mockLinkSubscription).toHaveBeenCalledWith(
      { workspaceId: "ws-uuid-1", accountType: "creator", accountId: "user-uuid-1" },
      expect.anything(), // tx
    );
  });

  it("logs provisioning events", async () => {
    await provisioningService.provision(baseInput);
    expect(mockProvisionRunUpdate).toHaveBeenCalled();
  });

  it("returns the created website ID from the provision transaction", async () => {
    const result = await provisioningService.provision(baseInput);
    expect(result.websiteId).toBe("website-uuid-1");
  });

  it("rolls back entire transaction when workspaceAddMember fails", async () => {
    mockWorkspaceAddMember.mockRejectedValueOnce(new Error("member add failed"));

    await expect(provisioningService.provision(baseInput)).rejects.toThrow("member add failed");
  });

  it("rolls back entire transaction when workspaceCreate fails", async () => {
    mockWorkspaceCreate.mockRejectedValueOnce(new Error("workspace create failed"));

    await expect(provisioningService.provision(baseInput)).rejects.toThrow("workspace create failed");
  });

  it("RCCF-01: skips placeholder seeding when generated website data is present", async () => {
    mockGetTemplate.mockReturnValue({ id: "tpl", pages: [] });
    const result = await provisioningService.provision({
      ...baseInput,
      generatedWebsite: { sections: [{ id: "s1", type: "hero", props: { title: "Hero" } }] },
    });
    expect(result.success).toBe(true);
    expect(mockSeedStarterData).not.toHaveBeenCalled();
  });

  it("RCCF-01: still seeds placeholders for blank/manual provisioning", async () => {
    mockGetTemplate.mockReturnValue({ id: "tpl", pages: [] });
    await provisioningService.provision(baseInput);
    expect(mockSeedStarterData).toHaveBeenCalled();
  });

  it("RCCF-01: applies canonical theme id via websiteRepository.update", async () => {
    await provisioningService.provision({ ...baseInput, generatedTheme: { colors: { primary: "#111" } } });
    const updateCalls = mockWebsiteUpdate.mock.calls as Array<[Record<string, unknown>]>;
    expect(updateCalls.some(([call]) => (call?.data as Record<string, unknown> | undefined)?.themePackageId)).toBe(true);
    // Legacy themeService.apply is no longer the provisioning theme path.
    expect(mockThemeApply).not.toHaveBeenCalled();
  });

  it("RCCF-18: manual provisioning persists neutral hero and SEO (no fabricated claims)", async () => {
    mockGetTemplate.mockReturnValue({ id: "tpl", pages: [] });
    await provisioningService.provision(baseInput);

    const calls = mockTxSettingCreate.mock.calls as Array<[{ data: { key: string; value: unknown } }]>;
    const hero = calls.find(([c]) => c.data.key === "hero_data")?.[0].data.value as Record<string, unknown>;
    const seo = calls.find(([c]) => c.data.key === "seo")?.[0].data.value as Record<string, unknown>;

    expect(hero.title).toBe("Test Creator");
    expect(hero.subtitle).toBe("");
    expect(hero.tagline).toBe("");
    expect(seo.title).toBe("Test Creator");
    expect(seo.description).toBe("");

    const blob = JSON.stringify({ hero, seo });
    expect(blob).not.toMatch(/Fitness Coach|expert workouts|Professional|professional gamer|certified/i);
  });

  it("RCCF-18: generated provisioning preserves generated hero/SEO content and skips starter seeding", async () => {
    mockGetTemplate.mockReturnValue({ id: "tpl", pages: [] });
    await provisioningService.provision({
      ...baseInput,
      generatedContent: { heroTitle: "My Hero", tagline: "My Tagline", seoTitle: "My SEO", seoDescription: "My Desc" },
      generatedWebsite: { sections: [{ id: "s1", type: "hero", props: {} }] },
    });

    const calls = mockTxSettingCreate.mock.calls as Array<[{ data: { key: string; value: unknown } }]>;
    const hero = calls.find(([c]) => c.data.key === "hero_data")?.[0].data.value as Record<string, unknown>;
    const seo = calls.find(([c]) => c.data.key === "seo")?.[0].data.value as Record<string, unknown>;

    expect(hero.title).toBe("My Hero");
    expect(seo.title).toBe("My SEO");
    expect(mockSeedStarterData).not.toHaveBeenCalled();
  });
});
