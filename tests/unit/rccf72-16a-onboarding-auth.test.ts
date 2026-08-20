/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-72.16A — server-action authorization hardening for the five Creator
// actions. These are BEHAVIORAL tests: they execute the real server actions
// against mocked auth/prisma/services and assert on the returned results and
// on whether downstream side effects (DB upserts, publish calls) actually ran.

const v = vi.hoisted(() => {
  const hoisted = {
    mockGetServerSession: vi.fn(),
    mockUserFindUnique: vi.fn(),
    mockSettingUpsert: vi.fn(),
    mockSettingFindUnique: vi.fn(),
    mockSessionGetById: vi.fn(),
    mockPublish: vi.fn(),
    mockAssertAgencyOwnsTenant: vi.fn(),
    mockEmitEvent: vi.fn(),
    mockCaptureError: vi.fn(),
    mockLogAction: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockRecordDuration: vi.fn(),
    mockCorrelationCreate: vi.fn(),
    mockEventBusPublish: vi.fn(),
    mockApplyGoalPriority: vi.fn(),
    mockSessionCreate: vi.fn(),
    mockSessionStart: vi.fn(),
    mockSessionBegin: vi.fn(),
    mockSessionUpdateStage: vi.fn(),
    mockSessionUpdateProgress: vi.fn(),
    mockSessionRecordActivity: vi.fn(),
    mockSessionComplete: vi.fn(),
    mockSessionFail: vi.fn(),
    mockSessionFindLatestActive: vi.fn(),
    mockRegistryUpdate: vi.fn(),
    mockImportProfile: vi.fn(),
    mockGenerate: vi.fn(),
    mockBuilderLoad: vi.fn(),
    mockBuilderSave: vi.fn(),
    reset: () => {
      for (const key of Object.keys(hoisted)) {
        if (key === "reset") continue;
        (hoisted as any)[key].mockReset();
      }
      hoisted.mockGetServerSession.mockResolvedValue({ user: { id: "u-owner", tenantId: "t-owner", role: "ADMIN" } });
      hoisted.mockUserFindUnique.mockResolvedValue({ tenantId: "t-owner" });
      hoisted.mockSettingUpsert.mockResolvedValue({ id: "setting-1" });
      hoisted.mockSettingFindUnique.mockResolvedValue({ completedAt: "2024-01-01T00:00:00.000Z" });
      hoisted.mockSessionGetById.mockResolvedValue(null);
      hoisted.mockPublish.mockResolvedValue({ success: true });
      hoisted.mockAssertAgencyOwnsTenant.mockResolvedValue({ ok: false, error: "Creator not managed by this agency" });
      hoisted.mockEmitEvent.mockResolvedValue({});
      hoisted.mockCaptureError.mockImplementation(() => {});
      hoisted.mockLogAction.mockResolvedValue({});
      hoisted.mockLoggerInfo.mockImplementation(() => {});
      hoisted.mockRecordDuration.mockImplementation(() => {});
      hoisted.mockCorrelationCreate.mockReturnValue({ correlationId: "corr-1", workspaceId: null, generationSessionId: null });
      hoisted.mockEventBusPublish.mockImplementation(() => {});
      hoisted.mockApplyGoalPriority.mockImplementation((s: any) => s);
      hoisted.mockSessionCreate.mockResolvedValue({ id: "gs-1" });
      hoisted.mockSessionStart.mockResolvedValue({});
      hoisted.mockSessionBegin.mockResolvedValue({});
      hoisted.mockSessionUpdateStage.mockResolvedValue({});
      hoisted.mockSessionUpdateProgress.mockResolvedValue({});
      hoisted.mockSessionRecordActivity.mockResolvedValue({});
      hoisted.mockSessionComplete.mockResolvedValue({});
      hoisted.mockSessionFail.mockResolvedValue({});
      hoisted.mockSessionFindLatestActive.mockResolvedValue(null);
      hoisted.mockRegistryUpdate.mockResolvedValue({});
      hoisted.mockImportProfile.mockResolvedValue({});
      hoisted.mockGenerate.mockResolvedValue({});
      hoisted.mockBuilderLoad.mockResolvedValue([]);
      hoisted.mockBuilderSave.mockResolvedValue({});
    },
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: v.mockCaptureError }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: v.mockLoggerInfo, warn: v.mockLoggerInfo, error: v.mockLoggerInfo } }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: v.mockRecordDuration } }));
vi.mock("@/lib/platform/correlation", () => ({ correlationService: { create: v.mockCorrelationCreate } }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: v.mockEventBusPublish, subscribe: vi.fn(() => () => {}) } }));
vi.mock("@/modules/event-runtime", () => ({ emitEvent: v.mockEmitEvent }));
vi.mock("@/modules/goals-runtime", () => ({ applyGoalSectionPriority: v.mockApplyGoalPriority }));
vi.mock("@/lib/generation/intelligence/niche-detector", () => ({ nicheDetector: { detect: vi.fn().mockReturnValue([]) } }));
vi.mock("@/actions/create.actions", () => ({ applyBlueprintToWebsite: vi.fn().mockResolvedValue({ success: true, websiteId: "w1" }) }));
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
    getById: v.mockSessionGetById,
    findLatestActive: v.mockSessionFindLatestActive,
  },
  sessionRegistry: { update: v.mockRegistryUpdate },
  computeProgress: () => 0,
  calculateProgress: () => 0,
}));
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
    createRun: vi.fn().mockResolvedValue("run-1"),
    provision: vi.fn().mockResolvedValue({ tenantId: "t1", websiteId: "w1" }),
  },
}));
vi.mock("@/lib/publishing/service", () => ({ publishingService: { publish: v.mockPublish } }));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: {
    findByTenantId: vi.fn(async () => null),
  },
}));
vi.mock("@/lib/onboarding/service", () => ({
  onboardingService: {
    importProfile: v.mockImportProfile,
    generate: v.mockGenerate,
  },
}));
vi.mock("@/modules/partner/application/authorization", () => ({
  assertAgencyOwnsTenant: v.mockAssertAgencyOwnsTenant,
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: v.mockUserFindUnique },
    setting: { upsert: v.mockSettingUpsert, findUnique: v.mockSettingFindUnique },
  },
}));

import {
  markOnboardingComplete,
  isOnboardingComplete,
  retryPublish,
  getGenerationSessionProgress,
} from "@/actions/onboarding.actions";

function ownerSession(overrides: Record<string, any> = {}) {
  return { user: { id: "u-owner", tenantId: "t-owner", role: "ADMIN", ...overrides } };
}

function fakeGenerationSession(creatorId: string | null) {
  return {
    id: "gs-1",
    workspaceId: "ws-1",
    creatorId,
    creatorName: "Creator",
    sourceUrl: "https://example.com",
    platform: "instagram",
    correlationId: "corr-1",
    status: "completed",
    currentStage: "publishing",
    progressPercent: 100,
    startedAt: new Date("2024-01-01T00:00:00.000Z"),
    updatedAt: new Date("2024-01-01T00:01:00.000Z"),
    completedAt: new Date("2024-01-01T00:01:00.000Z"),
    duration: 60000,
    workflowId: null,
    evaluationScore: 85,
    goldenValidationScore: 90,
    artifactVersion: 1,
    storefrontUrl: "https://t-owner.creatos.io",
    builderUrl: null,
    dashboardUrl: null,
    retryCount: 0,
    maxRetries: 3,
    error: null,
    warnings: [],
    stages: [{ type: "publishing", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 100, error: null }],
    history: [{ type: "activity", timestamp: new Date(), data: { message: "Published" } }],
  };
}

beforeEach(() => {
  v.reset();
});

describe("markOnboardingComplete — RCCF-72.16A authorization", () => {
  it("rejects an anonymous caller before any DB write", async () => {
    v.mockGetServerSession.mockResolvedValue(null);

    const res = await markOnboardingComplete("t-owner");

    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(v.mockSettingUpsert).not.toHaveBeenCalled();
    expect(v.mockEmitEvent).not.toHaveBeenCalled();
  });

  it("allows the DB-backed owner and writes onboarding_completed", async () => {
    const res = await markOnboardingComplete("t-owner");

    expect(res).toEqual({ success: true });
    expect(v.mockUserFindUnique).toHaveBeenCalledWith({ where: { id: "u-owner" }, select: { tenantId: true } });
    expect(v.mockSettingUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_key: { tenantId: "t-owner", key: "onboarding_completed" } },
      create: expect.objectContaining({ tenantId: "t-owner", key: "onboarding_completed" }),
    }));
    expect(v.mockEmitEvent).toHaveBeenCalledWith("onboarding.completed", "t-owner");
  });

  it("rejects an authenticated caller targeting a foreign tenant", async () => {
    v.mockUserFindUnique.mockResolvedValue({ tenantId: "t-other" });

    const res = await markOnboardingComplete("t-foreign");

    expect(res).toEqual({ success: false, error: "Forbidden" });
    expect(v.mockSettingUpsert).not.toHaveBeenCalled();
    expect(v.mockEmitEvent).not.toHaveBeenCalled();
  });

  it("allows a SUPER_ADMIN across tenants (established policy)", async () => {
    v.mockGetServerSession.mockResolvedValue(ownerSession({ role: "SUPER_ADMIN" }));

    const res = await markOnboardingComplete("t-any");

    expect(res).toEqual({ success: true });
    expect(v.mockSettingUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId_key: { tenantId: "t-any", key: "onboarding_completed" } },
    }));
  });

  it("allows an AGENCY_ADMIN whose agency manages the tenant (existing IDOR guard)", async () => {
    v.mockGetServerSession.mockResolvedValue(ownerSession({ role: "AGENCY_ADMIN", agencyId: "a1" }));
    v.mockUserFindUnique.mockResolvedValue({ tenantId: null });
    v.mockAssertAgencyOwnsTenant.mockResolvedValue({ ok: true });

    const res = await markOnboardingComplete("t-client");

    expect(res).toEqual({ success: true });
    expect(v.mockAssertAgencyOwnsTenant).toHaveBeenCalledWith("u-owner", "a1", "t-client");
    expect(v.mockSettingUpsert).toHaveBeenCalled();
  });

  it("rejects an AGENCY_ADMIN whose agency does NOT manage the tenant", async () => {
    v.mockGetServerSession.mockResolvedValue(ownerSession({ role: "AGENCY_ADMIN", agencyId: "a1" }));
    v.mockUserFindUnique.mockResolvedValue({ tenantId: null });

    const res = await markOnboardingComplete("t-unmanaged");

    expect(res).toEqual({ success: false, error: "Forbidden" });
    expect(v.mockSettingUpsert).not.toHaveBeenCalled();
  });
});

describe("isOnboardingComplete — RCCF-72.16A authorization", () => {
  it("rejects an anonymous caller", async () => {
    v.mockGetServerSession.mockResolvedValue(null);

    const res = await isOnboardingComplete("t-owner");

    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(v.mockSettingFindUnique).not.toHaveBeenCalled();
  });

  it("returns the setting for the DB-backed owner", async () => {
    const res = await isOnboardingComplete("t-owner");

    expect(res).toEqual({ success: true, complete: true });
    expect(v.mockSettingFindUnique).toHaveBeenCalledWith({
      where: { tenantId_key: { tenantId: "t-owner", key: "onboarding_completed" } },
    });
  });

  it("returns complete:false when no setting exists for the owner", async () => {
    v.mockSettingFindUnique.mockResolvedValue(null);

    const res = await isOnboardingComplete("t-owner");

    expect(res).toEqual({ success: true, complete: false });
  });

  it("rejects a foreign tenant without leaking whether the setting exists", async () => {
    v.mockUserFindUnique.mockResolvedValue({ tenantId: "t-other" });

    const res = await isOnboardingComplete("t-foreign");

    expect(res).toEqual({ success: false, error: "Forbidden" });
    expect(v.mockSettingFindUnique).not.toHaveBeenCalled();
  });
});

describe("retryPublish — RCCF-72.16A authorization", () => {
  it("rejects an anonymous caller and never calls the publishing service", async () => {
    v.mockGetServerSession.mockResolvedValue(null);

    const res = await retryPublish("t-owner");

    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(v.mockPublish).not.toHaveBeenCalled();
  });

  it("allows the DB-backed owner and calls the publishing service", async () => {
    const res = await retryPublish("t-owner");

    expect(res).toEqual({ success: true });
    expect(v.mockPublish).toHaveBeenCalledWith("t-owner");
  });

  it("rejects a foreign tenant and never calls the publishing service", async () => {
    v.mockUserFindUnique.mockResolvedValue({ tenantId: "t-other" });

    const res = await retryPublish("t-foreign");

    expect(res).toEqual({ success: false, error: "Forbidden" });
    expect(v.mockPublish).not.toHaveBeenCalled();
  });

  it("rejects an authenticated caller with no tenant at all", async () => {
    v.mockUserFindUnique.mockResolvedValue({ tenantId: null });

    const res = await retryPublish("t-owner");

    expect(res).toEqual({ success: false, error: "Forbidden" });
    expect(v.mockPublish).not.toHaveBeenCalled();
  });

  it("allows a SUPER_ADMIN cross-tenant retry", async () => {
    v.mockGetServerSession.mockResolvedValue(ownerSession({ role: "SUPER_ADMIN" }));

    const res = await retryPublish("t-any");

    expect(res).toEqual({ success: true });
    expect(v.mockPublish).toHaveBeenCalledWith("t-any");
  });
});

describe("getGenerationSessionProgress — RCCF-72.16A authorization", () => {
  it("rejects an anonymous caller", async () => {
    v.mockGetServerSession.mockResolvedValue(null);

    const res = await getGenerationSessionProgress("gs-1");

    expect(res).toEqual({ success: false, error: "Unauthorized" });
  });

  it("returns progress for the owning creator", async () => {
    v.mockSessionGetById.mockResolvedValue(fakeGenerationSession("u-owner"));

    const res = await getGenerationSessionProgress("gs-1");

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.status).toBe("completed");
      expect(res.data.progressPercent).toBe(100);
      expect(res.data.activity).toEqual(["Published"]);
    }
  });

  it("masks a non-owner as not-found (no session existence oracle)", async () => {
    v.mockSessionGetById.mockResolvedValue(fakeGenerationSession("u-someone-else"));

    const res = await getGenerationSessionProgress("gs-1");

    expect(res).toEqual({ success: false, error: "Session not found" });
  });

  it("masks a missing session as not-found", async () => {
    const res = await getGenerationSessionProgress("gs-ghost");

    expect(res).toEqual({ success: false, error: "Session not found" });
  });

  it("allows a SUPER_ADMIN to read any session", async () => {
    v.mockGetServerSession.mockResolvedValue(ownerSession({ role: "SUPER_ADMIN" }));
    v.mockSessionGetById.mockResolvedValue(fakeGenerationSession("u-someone-else"));

    const res = await getGenerationSessionProgress("gs-1");

    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.status).toBe("completed");
    }
  });
});