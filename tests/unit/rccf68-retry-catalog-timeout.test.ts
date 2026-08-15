/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getFeatureInfo, getAllFeatureIds } from "@/lib/capabilities";

// RCCF-68.2 — pre-Stitch architecture closure:
//  1. ONE plan/capability authority (catalog derived from capabilityService).
//  2. Onboarding retry idempotency (reuse existing tenant/website — no Tenant #2).
//  (Session-timeout truth lives in rccf68-session-timeout.test.ts.)

// ── Module mocks shared by the idempotency suite ────────────────
const v = vi.hoisted(() => {
  const sessions: Array<Record<string, unknown>> = [];
  const hoisted = {
    sessions,
    mockGetServerSession: vi.fn(),
    mockProvision: vi.fn(),
    mockCreateRun: vi.fn(),
    mockPublish: vi.fn(),
    mockLogAction: vi.fn(),
    mockCaptureError: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockRecordDuration: vi.fn(),
    mockCorrelationCreate: vi.fn(),
    mockEventBusPublish: vi.fn(),
    mockEmitEvent: vi.fn(),
    mockApplyGoalPriority: vi.fn(),
    mockSessionCreate: vi.fn(),
    mockSessionStart: vi.fn(),
    mockSessionBegin: vi.fn(),
    mockSessionUpdateStage: vi.fn(),
    mockSessionUpdateProgress: vi.fn(),
    mockSessionRecordActivity: vi.fn(),
    mockSessionComplete: vi.fn(),
    mockSessionFail: vi.fn(),
    mockRegistryUpdate: vi.fn(),
    mockImportProfile: vi.fn(),
    mockGenerate: vi.fn(),
    mockApplyBlueprint: vi.fn(),
    mockBuilderLoad: vi.fn(),
    mockBuilderSave: vi.fn(),
    reset: () => {
      sessions.length = 0;
      for (const key of Object.keys(hoisted)) {
        if (key === "sessions" || key === "reset") continue;
        (hoisted as any)[key].mockReset();
      }
      hoisted.mockSessionCreate.mockResolvedValue({ id: "gs-1" });
      hoisted.mockSessionStart.mockResolvedValue({});
      hoisted.mockSessionBegin.mockResolvedValue({});
      hoisted.mockSessionUpdateStage.mockResolvedValue({});
      hoisted.mockSessionUpdateProgress.mockResolvedValue({});
      hoisted.mockSessionRecordActivity.mockResolvedValue({});
      hoisted.mockSessionComplete.mockResolvedValue({});
      hoisted.mockSessionFail.mockResolvedValue({});
      hoisted.mockRegistryUpdate.mockResolvedValue({});
      hoisted.mockCaptureError.mockImplementation(() => {});
      hoisted.mockLoggerInfo.mockImplementation(() => {});
      hoisted.mockRecordDuration.mockImplementation(() => {});
      hoisted.mockCorrelationCreate.mockReturnValue({ correlationId: "corr-1", workspaceId: null, generationSessionId: null });
      hoisted.mockEventBusPublish.mockImplementation(() => {});
      hoisted.mockEmitEvent.mockResolvedValue({});
      hoisted.mockApplyGoalPriority.mockImplementation((s: any) => s);
      hoisted.mockApplyBlueprint.mockResolvedValue({ success: true });
      hoisted.mockBuilderLoad.mockResolvedValue([]);
      hoisted.mockBuilderSave.mockResolvedValue({});
    },
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: v.mockCaptureError }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: v.mockLoggerInfo, warn: v.mockLoggerInfo, error: v.mockLoggerInfo } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: v.mockRecordDuration } }));
vi.mock("@/lib/platform/correlation", () => ({ correlationService: { create: v.mockCorrelationCreate } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: v.mockEventBusPublish, subscribe: vi.fn(() => () => {}) } }));
vi.mock("@/modules/event-runtime", () => ({ emitEvent: v.mockEmitEvent }));
vi.mock("@/modules/goals-runtime", () => ({ applyGoalSectionPriority: v.mockApplyGoalPriority }));
vi.mock("@/lib/generation/intelligence/niche-detector", () => ({ nicheDetector: { detect: vi.fn().mockReturnValue([]) } }));
vi.mock("@/actions/create.actions", () => ({ applyBlueprintToWebsite: v.mockApplyBlueprint }));
vi.mock("@/lib/generation/golden", () => ({
  goldenDataset: { isKnownUrl: () => false },
  GoldenValidator: class { validateByUrl() { return { passed: true, overallScore: 0, regressions: [] }; } },
}));

vi.mock("@/lib/generation/session", () => ({
  sessionService: {
    create: v.mockSessionCreate,
    start: v.mockSessionStart,
    beginExecution: v.mockSessionBegin,
    updateStage: v.mockSessionUpdateStage,
    updateProgress: v.mockSessionUpdateProgress,
    recordActivity: v.mockSessionRecordActivity,
    complete: v.mockSessionComplete,
    fail: v.mockSessionFail,
  },
  sessionRegistry: { update: v.mockRegistryUpdate },
  computeProgress: () => 0,
  calculateProgress: () => 0,
}));

// BuilderService is loaded dynamically; mock with SHARED load/save so both the
// action and the test see the same functions.
vi.mock("@/lib/builder/builder-service", () => ({
  BuilderService: class {
    load = v.mockBuilderLoad;
    save = v.mockBuilderSave;
  },
}));

vi.mock("@/modules/generation-progress", () => ({
  emitGenerationEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/modules/provisioning/application/provisioning-service", () => ({
  provisioningService: {
    createRun: v.mockCreateRun,
    provision: v.mockProvision,
  },
}));
vi.mock("@/lib/publishing/service", () => ({ publishingService: { publish: v.mockPublish } }));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: {
    findByTenantId: vi.fn(async ({ tenantId }: { tenantId: string }) => (tenantId ? { id: `ws-${tenantId}` } : null)),
  },
}));

vi.mock("@/lib/onboarding/service", () => ({
  onboardingService: {
    importProfile: v.mockImportProfile,
    generate: v.mockGenerate,
  },
}));

// Stateful prisma mock driven by hoisted arrays/mocks.
vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: {
      findUnique: vi.fn(async ({ where }: { where: { tenantId: string } }) => {
        return v.sessions.find((s) => s.tenantId === where.tenantId)?.website ?? null;
      }),
    },
    setting: { upsert: vi.fn(async () => ({})) },
    generationSession: {
      create: v.mockSessionCreate,
      findFirst: vi.fn(async () => null),
    },
    generationSessionStage: { create: vi.fn(async () => ({})) },
    generationSessionEvent: { create: vi.fn(async () => ({})) },
    creatorProvisionRun: { create: v.mockCreateRun },
    page: { findMany: v.mockBuilderLoad },
  },
}));

import { runCreatorGeneration } from "@/actions/onboarding.actions";
import { buildCapabilityCatalog, buildLimitFeatureList } from "@/lib/capabilities/catalog";

const KG = {
  creator: { name: "Test Creator", niche: "gaming", bio: "bio", username: "testcreator" },
  socialLinks: [],
  confidence: 0.9,
  entities: [],
  relationships: [],
  keywords: [],
  hashtags: [],
  content: [],
};

const profileResult = {
  platform: "youtube",
  knowledgeGraph: KG,
  personaMatch: { persona: { id: "creator", name: "Creator" }, score: 0.8 },
  experienceProfile: { confidence: 0.9 },
  channelMeta: { thumbnailUrl: "https://example.com/thumb.jpg" },
};

function makeGenerateResult() {
  // composition/WebsiteBlueprint shape consumed by buildProvisioningInput:
  // .website.{title,tagline}, .seo.{title,description,keywords}
  return {
    experiencePlan: {},
    websiteBlueprint: {
      website: { title: "Test Creator", tagline: "", domain: "testcreator.store" },
      seo: { title: "Test Creator", description: "", keywords: [] },
      metadata: { version: 1 },
      sections: [],
      navigation: [],
    },
    artifacts: [
      {
        manifest: { type: "storefront_json", id: "sf-1", version: 1, checksum: "x", createdAt: "", dependencies: [], sourceBlueprintVersion: 1, size: 1 },
        data: { sections: [{ id: "hero", type: "hero", props: { headline: "Hi" } }], navigation: [] },
      },
    ],
  };
}

function seedExistingTenant(tenantId: string) {
  v.sessions.push({
    tenantId,
    website: { id: `web-${tenantId}`, tenant: { subdomain: "testcreator", customDomain: null } },
  });
}

describe("RCCF-68.2 — single plan authority", () => {
  beforeEach(() => { v.reset(); });

  it("derives the catalog from capabilityService, not a duplicate matrix", () => {
    const catalog = buildCapabilityCatalog();
    expect(Array.isArray(catalog)).toBe(true);
    expect(catalog.length).toBeGreaterThan(0);
    for (const group of catalog) {
      expect(typeof group.category).toBe("string");
      for (const item of group.items) {
        expect(item.key).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.category).toBe(group.category);
      }
    }
  });

  it("every catalog item key resolves a canonical feature id", () => {
    const catalog = buildCapabilityCatalog();
    const ids = new Set(getAllFeatureIds());
    for (const group of catalog) {
      for (const item of group.items) {
        expect(ids.has(item.key)).toBe(true);
        expect(getFeatureInfo(item.key).label).toBe(item.label);
      }
    }
  });

  it("limit list derives from LIMIT_FEATURES with resolvable labels", () => {
    const limits = buildLimitFeatureList();
    expect(limits.length).toBeGreaterThan(0);
    for (const { id, label } of limits) {
      expect(label).toBe(getFeatureInfo(id).label);
    }
  });
});

describe("RCCF-68.2 — onboarding retry idempotency (no duplicate tenant)", () => {
  beforeEach(() => {
    v.reset();
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u1", name: "Test Creator", tenantId: "tenant-A" } });
    v.mockImportProfile.mockResolvedValue(profileResult);
    v.mockGenerate.mockResolvedValue(makeGenerateResult());
    v.mockCreateRun.mockResolvedValue({ id: "run-1" });
    v.mockProvision.mockResolvedValue({ success: true, tenantId: "tenant-A", websiteId: "web-tenant-A", storefrontUrl: "/testcreator", dashboardUrl: "/admin/dashboard", workspaceId: "ws-tenant-A" });
    v.mockPublish.mockResolvedValue({ success: true });
    v.mockLogAction.mockResolvedValue(undefined);
  });

  it("reuses an existing tenant+website instead of creating Tenant #2", async () => {
    seedExistingTenant("tenant-A");

    const res = await runCreatorGeneration(
      "https://youtube.com/@testcreator",
      "Test Creator",
      "Asia/Kolkata",
      "INR",
      "en",
    );

    expect(res.success).toBe(true);
    expect(res.result?.tenantId).toBe("tenant-A");
    // The critical guarantee: provision() must NOT run on retry.
    expect(v.mockProvision).not.toHaveBeenCalled();
    // Publish runs against the EXISTING tenant.
    expect(v.mockPublish).toHaveBeenCalledWith("tenant-A");
  });

  it("does not seed builder pages when an existing published site already has pages", async () => {
    seedExistingTenant("tenant-A");
    v.mockBuilderLoad.mockResolvedValue([{ id: "p1", name: "Home", slug: "/", order: 1, isHome: true, sections: [] }]);

    const res = await runCreatorGeneration(
      "https://youtube.com/@testcreator",
      "Test Creator",
      "Asia/Kolkata",
      "INR",
      "en",
    );

    expect(res.success).toBe(true);
    expect(v.mockProvision).not.toHaveBeenCalled();
    expect(v.mockBuilderSave).not.toHaveBeenCalled();
  });

  it("seeds generated pages on retry only when the website has none (non-destructive continuation)", async () => {
    seedExistingTenant("tenant-A");
    v.mockBuilderLoad.mockResolvedValue([]);

    const res = await runCreatorGeneration(
      "https://youtube.com/@testcreator",
      "Test Creator",
      "Asia/Kolkata",
      "INR",
      "en",
    );

    expect(res.success).toBe(true);
    expect(v.mockProvision).not.toHaveBeenCalled();
    expect(v.mockBuilderSave).toHaveBeenCalledWith("web-tenant-A", expect.any(Array));
  });

  it("still provisions a brand-new tenant when the creator has none", async () => {
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u1", name: "Test Creator", tenantId: null } });
    v.mockProvision.mockResolvedValue({ success: true, tenantId: "tenant-B", websiteId: "web-tenant-B", storefrontUrl: "/brandnew", dashboardUrl: "/admin/dashboard", workspaceId: "ws-tenant-B" });

    const res = await runCreatorGeneration(
      "https://youtube.com/@testcreator",
      "Test Creator",
      "Asia/Kolkata",
      "INR",
      "en",
    );

    expect(res.success).toBe(true);
    expect(v.mockProvision).toHaveBeenCalledTimes(1);
    expect(res.result?.tenantId).toBe("tenant-B");
  });
});

describe("RCCF-68.2 — marketing copy truth (no AI/course/visitor-analytics overclaims)", () => {
  it("canonical brand copy does not claim an undelivered AI engine", async () => {
    const { BRAND, POSITIONING, VALUE_PROPOSITIONS, MESSAGING_PILLARS } = await import("@/lib/marketing/messaging");
    const all = [
      BRAND.shortDescription,
      BRAND.description,
      POSITIONING.is,
      ...VALUE_PROPOSITIONS.flatMap((v) => [v.headline, v.body]),
      ...MESSAGING_PILLARS.flatMap((p) => [p.label, p.description]),
    ].join(" ");
    expect(all.toLowerCase()).not.toMatch(/\bai\b|\bai-\b|\bai \b/);
    expect(all).not.toMatch(/courses|memberships|coaching/i);
    expect(all).not.toMatch(/traffic|visitor analytics|conversion tracking/i);
  });

  it("capability lists avoid undelivered courses/memberships/visitor analytics", async () => {
    const { PLATFORM_CAPABILITIES } = await import("@/lib/marketing/messaging");
    const text = PLATFORM_CAPABILITIES.map((c) => c.items.join(" ")).join(" ").toLowerCase();
    expect(text).not.toMatch(/courses|memberships|coaching|conversion tracking/i);
    expect(text).not.toMatch(/\bai\b|\bai-/);
  });

  it("plan marketing copy avoids AI-generation overclaims", async () => {
    const { COMMERCE_PLANS } = await import("@/config/commerce/plans");
    for (const plan of COMMERCE_PLANS) {
      const text = `${plan.marketingDescription ?? ""} ${plan.description} ${plan.marketingHighlights?.join(" ")}`.toLowerCase();
      expect(text).not.toMatch(/ai-generated|ai-powered|ai builds|ai content/);
    }
  });

  it("AIDemo stages never fabricate concrete telemetry (no invented counts/results)", async () => {
    const { readFileSync } = await import("node:fs");
    const source = readFileSync("src/components/marketing/AIDemo.tsx", "utf8");
    expect(source).not.toMatch(/Found \d+ videos/);
    expect(source).not.toMatch(/Tech Creator detected/);
    expect(source).not.toMatch(/Brand colors extracted/);
    expect(source).not.toMatch(/SEO metadata generated/);
  });
});
