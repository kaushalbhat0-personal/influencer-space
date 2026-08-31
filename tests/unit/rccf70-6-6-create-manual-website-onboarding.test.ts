/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-70.6.6 — regression tests for the verified P1 fix:
//   createManualWebsite must call markOnboardingComplete(tenantId) after a
//   successful publish so the DB-backed requireTenant enters READY and a fresh
//   login no longer loops /admin/dashboard ↔ /onboarding.
//
// The fix mirrors the established pattern in runCreatorGeneration,
// acquire.actions.ts, provision.actions.ts and super-admin-provision.actions.ts.
// markOnboardingComplete lives in the SAME module, so we assert on the
// resulting prisma.setting.upsert (the only DB write it performs).

const v = vi.hoisted(() => {
  const hoisted = {
    mockGetServerSession: vi.fn(),
    mockCreateRun: vi.fn(),
    mockProvision: vi.fn(),
    mockWebsiteFindUnique: vi.fn(),
    mockSettingUpsert: vi.fn(),
    mockApplyBlueprint: vi.fn(),
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
      hoisted.mockCreateRun.mockResolvedValue("run-1");
      hoisted.mockProvision.mockResolvedValue({ tenantId: "t1", websiteId: "w1" });
      hoisted.mockWebsiteFindUnique.mockResolvedValue({ id: "w1" });
      hoisted.mockSettingUpsert.mockResolvedValue({ id: "setting-1" });
      hoisted.mockApplyBlueprint.mockResolvedValue({ success: true, websiteId: "w1" });
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
vi.mock("@/lib/publishing/service", () => ({ publishingService: { publish: vi.fn().mockResolvedValue({ success: true }) } }));
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
vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: { findUnique: v.mockWebsiteFindUnique },
    setting: { upsert: v.mockSettingUpsert },
  },
}));

import { createManualWebsite } from "@/actions/onboarding.actions";

function expectOnboardingUpsert(tenantId: string) {
  const calls = v.mockSettingUpsert.mock.calls.filter(
    (c) => c[0]?.where?.tenantId_key?.key === "onboarding_completed",
  );
  expect(calls.length).toBeGreaterThan(0);
  const last = calls[calls.length - 1][0];
  expect(last.where).toEqual({ tenantId_key: { tenantId, key: "onboarding_completed" } });
  expect(last.create.tenantId).toBe(tenantId);
  expect(last.create.key).toBe("onboarding_completed");
  expect(last.create.value).toMatchObject({ completedAt: expect.any(String) });
  expect(last.update.value).toMatchObject({ completedAt: expect.any(String) });
}

beforeEach(() => {
  v.reset();
  v.mockGetServerSession.mockResolvedValue({ user: { id: "u1", name: "Creator" } });
});

describe("RCCF-70.6.6 — createManualWebsite marks onboarding complete", () => {
  it("writes onboarding_completed after a successful fresh provision", async () => {
    const res = await createManualWebsite();

    expect(res.success).toBe(true);
    expect(v.mockProvision).toHaveBeenCalled();
    expect(v.mockApplyBlueprint).toHaveBeenCalled();
    expectOnboardingUpsert("t1");
  });

  it("does NOT write the Setting when provisioning fails", async () => {
    v.mockProvision.mockResolvedValue({});

    const res = await createManualWebsite();

    expect(res.success).toBe(false);
    expect(v.mockSettingUpsert).not.toHaveBeenCalled();
  });

  it("does NOT write the Setting when provisioning throws", async () => {
    v.mockProvision.mockRejectedValue(new Error("provision failed"));

    const res = await createManualWebsite();

    expect(res.success).toBe(false);
    expect(v.mockSettingUpsert).not.toHaveBeenCalled();
  });

  it("does NOT write the Setting when the blueprint fails", async () => {
    v.mockApplyBlueprint.mockResolvedValue({ success: false, error: "blueprint failed" });

    const res = await createManualWebsite();

    expect(res.success).toBe(false);
    expect(res.error).toMatch(/blueprint failed/);
    expect(v.mockSettingUpsert).not.toHaveBeenCalled();
  });

  it("stays idempotent for an already-provisioned tenant (re-entry uses upsert)", async () => {
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u1", name: "Creator", tenantId: "t9" } });

    await createManualWebsite();
    await createManualWebsite();

    expect(v.mockProvision).not.toHaveBeenCalled();
    expect(v.mockWebsiteFindUnique).toHaveBeenCalledTimes(2);
    expect(v.mockSettingUpsert).toHaveBeenCalledTimes(2);
    expectOnboardingUpsert("t9");
  });

  it("does not accept a client-supplied tenantId (derives from server session)", async () => {
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u1", name: "Creator", tenantId: "t7" } });

    const res = await createManualWebsite();

    expect(res.success).toBe(true);
    expect(res.tenantId).toBe("t7");
    expectOnboardingUpsert("t7");
  });
});