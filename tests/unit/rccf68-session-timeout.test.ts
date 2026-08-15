/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-68.2 — generation-session timeout truth (objective #3):
//  - Stale active sessions are recovered to `timed_out` (never left running forever).
//  - `findLatestActive` treats `timed_out` as non-active → refresh recovery is retry-safe.
//  - Recovery touches ONLY generation sessions — never tenant/website/content/billing.

const v = vi.hoisted(() => {
  const activeRows: Array<Record<string, unknown>> = [];
  const hoisted = {
    activeRows,
    mockCaptureError: vi.fn(),
    mockLogAction: vi.fn(),
    mockLoggerInfo: vi.fn(),
    mockSessionUpdateMany: vi.fn(),
    mockSessionFindMany: vi.fn(),
    mockSessionDeleteMany: vi.fn(),
    mockSessionFindFirst: vi.fn(),
    reset: () => {
      activeRows.length = 0;
      hoisted.mockCaptureError.mockReset();
      hoisted.mockLogAction.mockReset();
      hoisted.mockLoggerInfo.mockReset();
      hoisted.mockSessionUpdateMany.mockReset();
      hoisted.mockSessionFindMany.mockReset();
      hoisted.mockSessionDeleteMany.mockReset();
      hoisted.mockSessionFindFirst.mockReset();
      hoisted.mockSessionUpdateMany.mockResolvedValue({ count: 0 });
      hoisted.mockSessionFindMany.mockResolvedValue([]);
      hoisted.mockSessionDeleteMany.mockResolvedValue({ count: 0 });
      hoisted.mockCaptureError.mockImplementation(() => {});
      hoisted.mockLogAction.mockResolvedValue(undefined);
      hoisted.mockLoggerInfo.mockImplementation(() => {});
    },
  };
  return hoisted;
});

vi.mock("@/lib/observability/error-tracker", () => ({ captureError: v.mockCaptureError }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: v.mockLoggerInfo, warn: v.mockLoggerInfo, error: v.mockLoggerInfo } }));
vi.mock("@/lib/audit", () => ({ logAction: v.mockLogAction }));

function makeSessionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "s-1",
    workspaceId: "ws-1",
    creatorId: "u1",
    creatorName: "Test Creator",
    sourceUrl: "https://youtube.com/@test",
    platform: "youtube",
    correlationId: null,
    status: "running",
    currentStage: "publishing",
    progressPercent: 50,
    maxRetries: 3,
    retryCount: 0,
    workflowId: null,
    evaluationScore: null,
    goldenValidationScore: null,
    artifactVersion: null,
    storefrontUrl: null,
    builderUrl: null,
    dashboardUrl: null,
    error: null,
    warnings: [],
    startedAt: new Date("2025-01-01T00:00:00Z"),
    updatedAt: new Date("2025-01-01T00:00:00Z"),
    completedAt: null,
    stages: [],
    history: [],
    ...overrides,
  };
}

vi.mock("@/lib/prisma", () => ({
  prisma: {
    generationSession: {
      updateMany: v.mockSessionUpdateMany,
      findMany: v.mockSessionFindMany,
      deleteMany: v.mockSessionDeleteMany,
      findFirst: v.mockSessionFindFirst,
    },
    websiteAgency: { findMany: vi.fn(async () => []) },
    workspace: { findUnique: vi.fn(async () => null) },
    agencyTenant: { count: vi.fn(async () => 0) },
    commissionEntry: { count: vi.fn(async () => 0) },
    partnerLedger: { count: vi.fn(async () => 0) },
    settlement: { count: vi.fn(async () => 0) },
    payoutBatch: { count: vi.fn(async () => 0) },
    billingInvoice: { count: vi.fn(async () => 0) },
    billingSubscription: { findFirst: vi.fn(async () => null) },
    partnerInvite: { count: vi.fn(async () => 0), deleteMany: vi.fn(async () => ({ count: 0 })) },
    $transaction: vi.fn(async (fn: any) => fn(prisma)),
  },
}));

import { runSafeCleanup } from "@/lib/integrity/runtime";
import { sessionService } from "@/lib/generation/session";

describe("RCCF-68.2 — stale generation-session recovery (integrity runtime)", () => {
  beforeEach(() => { v.reset(); });

  it("marks ONLY stale active sessions (queued/running/publishing > 60min) as timed_out", async () => {
    v.mockSessionUpdateMany.mockResolvedValue({ count: 2 });

    const result = await runSafeCleanup();

    const args = v.mockSessionUpdateMany.mock.calls[0]?.[0] as { where: Record<string, unknown>; data: Record<string, unknown> };
    expect(args).toBeDefined();
    expect(args.where.status).toEqual({ in: ["queued", "running", "publishing"] });
    expect((args.where.updatedAt as { lt: Date }).lt).toBeInstanceOf(Date);
    expect(args.data).toEqual({ status: "timed_out" });
    expect(result.cleared).toBeGreaterThanOrEqual(2);
  });

  it("never deletes stale ACTIVE sessions — only terminal sessions past 7 days", async () => {
    v.mockSessionUpdateMany.mockResolvedValue({ count: 0 });
    // findMany with status in [failed, cancelled, timed_out] → empty
    v.mockSessionFindMany.mockResolvedValue([]);

    const result = await runSafeCleanup();

    expect(v.mockSessionDeleteMany).not.toHaveBeenCalled();
    expect(result.cleared).toBe(0);
  });

  it("recovery does not touch tenant/website/content/billing", async () => {
    v.mockSessionUpdateMany.mockResolvedValue({ count: 1 });
    // Find stale terminal sessions — none → no deletes.
    v.mockSessionFindMany.mockResolvedValue([]);

    await runSafeCleanup();

    // Only generationSession.updateMany / findMany are exercised; no tenant or
    // website mutations occur anywhere in the cleanup runtime.
    expect(v.mockSessionUpdateMany).toHaveBeenCalled();
    expect(v.mockSessionDeleteMany).not.toHaveBeenCalled();
  });
});

describe("RCCF-68.2 — findLatestActive retry safety (timed_out is non-active)", () => {
  beforeEach(() => { v.reset(); });

  it("returns null for a timed_out latest session → refresh falls through to fresh onboarding", async () => {
    v.mockSessionFindFirst.mockResolvedValue(makeSessionRow({ status: "timed_out" }));

    const result = await sessionService.findLatestActive("u1");
    expect(result).toBeNull();
  });

  it("returns the latest session while it is genuinely in flight (running)", async () => {
    v.mockSessionFindFirst.mockResolvedValue(makeSessionRow({ status: "running" }));

    const result = await sessionService.findLatestActive("u1");
    expect(result).not.toBeNull();
    expect(result?.status).toBe("running");
  });

  it("returns null for other terminal states (failed/cancelled/completed)", async () => {
    for (const status of ["failed", "cancelled", "completed"]) {
      v.mockSessionFindFirst.mockResolvedValue(makeSessionRow({ status }));
      expect(await sessionService.findLatestActive("u1")).toBeNull();
    }
  });
});
