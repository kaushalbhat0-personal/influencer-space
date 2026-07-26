import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockSessionCreate,
  mockSessionFindUnique,
  mockSessionFindMany,
  mockSessionFindFirst,
  mockSessionUpdate,
  mockStageCreate,
  mockStageFindFirst,
  mockStageUpdate,
  mockEventCreate,
} = vi.hoisted(() => ({
  mockSessionCreate: vi.fn(),
  mockSessionFindUnique: vi.fn(),
  mockSessionFindMany: vi.fn(),
  mockSessionFindFirst: vi.fn(),
  mockSessionUpdate: vi.fn(),
  mockStageCreate: vi.fn(),
  mockStageFindFirst: vi.fn(),
  mockStageUpdate: vi.fn(),
  mockEventCreate: vi.fn(),
}));

function makeMockSession(overrides: Record<string, unknown> = {}) {
  return {
    id: "session-1",
    workspaceId: "ws-1",
    creatorId: "user-1",
    creatorName: "Test Creator",
    sourceUrl: "https://youtube.com/@test",
    platform: "youtube",
    correlationId: null,
    status: "created",
    currentStage: null,
    progressPercent: 0,
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
      create: mockSessionCreate,
      findUnique: mockSessionFindUnique,
      findMany: mockSessionFindMany,
      findFirst: mockSessionFindFirst,
      update: mockSessionUpdate,
    },
    generationSessionStage: {
      create: mockStageCreate,
      findFirst: mockStageFindFirst,
      update: mockStageUpdate,
    },
    generationSessionEvent: {
      create: mockEventCreate,
    },
  },
}));

import { sessionService } from "@/lib/generation/session/service";
import { sessionRegistry } from "@/lib/generation/session/registry";
import { sessionHistory } from "@/lib/generation/session/history";
import { computeProgress } from "@/lib/generation/session/progress";
import {
  isValidTransition,
  calculateProgress,
  STAGE_WEIGHTS,
  STATUS_TRANSITIONS,
  SESSION_STATUSES,
  STAGE_TYPES,
  STAGE_STATUSES,
} from "@/lib/generation/session/types";
import type { GenerationSessionData, StageRecord } from "@/lib/generation/session/types";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Types & Validation ───────────────────────────────────────────────

describe("Session Types — status transitions", () => {
  it("allows created -> queued", () => {
    expect(isValidTransition("created", "queued")).toBe(true);
  });

  it("allows created -> cancelled", () => {
    expect(isValidTransition("created", "cancelled")).toBe(true);
  });

  it("allows queued -> running", () => {
    expect(isValidTransition("queued", "running")).toBe(true);
  });

  it("allows running -> publishing", () => {
    expect(isValidTransition("running", "publishing")).toBe(true);
  });

  it("allows publishing -> completed", () => {
    expect(isValidTransition("publishing", "completed")).toBe(true);
  });

  it("allows failed -> retrying", () => {
    expect(isValidTransition("failed", "retrying")).toBe(true);
  });

  it("allows timed_out -> retrying", () => {
    expect(isValidTransition("timed_out", "retrying")).toBe(true);
  });

  it("allows retrying -> queued", () => {
    expect(isValidTransition("retrying", "queued")).toBe(true);
  });

  it("disallows completed -> running", () => {
    expect(isValidTransition("completed", "running")).toBe(false);
  });

  it("disallows cancelled -> running", () => {
    expect(isValidTransition("cancelled", "running")).toBe(false);
  });

  it("disallows created -> completed (skip queued)", () => {
    expect(isValidTransition("created", "completed")).toBe(false);
  });

  it("disallows running -> created (reverse)", () => {
    expect(isValidTransition("running", "created")).toBe(false);
  });

  it("has valid transitions for every session status", () => {
    for (const status of SESSION_STATUSES) {
      const transitions = STATUS_TRANSITIONS[status];
      expect(transitions).toBeDefined();
      expect(Array.isArray(transitions)).toBe(true);
    }
  });
});

describe("Session Types — stage types", () => {
  it("includes all expected stages", () => {
    expect(STAGE_TYPES).toContain("import_profile");
    expect(STAGE_TYPES).toContain("knowledge_intelligence");
    expect(STAGE_TYPES).toContain("persona_detection");
    expect(STAGE_TYPES).toContain("planning_context");
    expect(STAGE_TYPES).toContain("experience_planning");
    expect(STAGE_TYPES).toContain("composition");
    expect(STAGE_TYPES).toContain("artifact_generation");
    expect(STAGE_TYPES).toContain("provisioning");
    expect(STAGE_TYPES).toContain("publishing");
    expect(STAGE_TYPES).toContain("golden_validation");
  });

  it("has 10 stage types", () => {
    expect(STAGE_TYPES.length).toBe(10);
  });
});

describe("Session Types — stage statuses", () => {
  it("includes all expected statuses", () => {
    expect(STAGE_STATUSES).toContain("pending");
    expect(STAGE_STATUSES).toContain("running");
    expect(STAGE_STATUSES).toContain("completed");
    expect(STAGE_STATUSES).toContain("skipped");
    expect(STAGE_STATUSES).toContain("failed");
  });
});

describe("calculateProgress", () => {
  it("returns 0 when no stages", () => {
    expect(calculateProgress([])).toBe(0);
  });

  it("returns 100 when all stages completed", () => {
    const stages: StageRecord[] = STAGE_TYPES.map((t) => ({
      type: t,
      status: "completed",
      startedAt: new Date(),
      completedAt: new Date(),
      duration: 100,
      error: null,
    }));
    expect(calculateProgress(stages)).toBe(100);
  });

  it("returns partial progress for running stages", () => {
    const stages: StageRecord[] = [
      { type: "import_profile", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 10, error: null },
      { type: "knowledge_intelligence", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null },
    ];
    const progress = calculateProgress(stages);
    expect(progress).toBeGreaterThan(0);
    expect(progress).toBeLessThan(100);
  });

  it("ignores pending stages in calculation", () => {
    const stages: StageRecord[] = [
      { type: "import_profile", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 10, error: null },
      { type: "knowledge_intelligence", status: "pending", startedAt: new Date(), completedAt: null, duration: null, error: null },
    ];
    const progress = calculateProgress(stages);
    const importWeight = STAGE_WEIGHTS.import_profile;
    const totalWeight = Object.values(STAGE_WEIGHTS).reduce((s, w) => s + w, 0);
    const expected = Math.round((importWeight / totalWeight) * 100);
    expect(progress).toBe(expected);
  });

  it("counts skipped stages as completed", () => {
    const stages: StageRecord[] = [
      { type: "import_profile", status: "skipped", startedAt: new Date(), completedAt: new Date(), duration: 0, error: null },
    ];
    const skipWeight = STAGE_WEIGHTS.import_profile;
    const totalWeight = Object.values(STAGE_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(calculateProgress(stages)).toBe(Math.round((skipWeight / totalWeight) * 100));
  });
});

// ─── Registry ─────────────────────────────────────────────────────────

describe("sessionRegistry.create", () => {
  beforeEach(() => {
    mockSessionCreate.mockResolvedValue(makeMockSession());
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("creates session with status 'created'", async () => {
    mockSessionCreate.mockResolvedValue(makeMockSession());

    const result = await sessionRegistry.create({
      id: "session-1",
      workspaceId: "ws-1",
      creatorId: "user-1",
      creatorName: "Test",
      sourceUrl: null,
      platform: null,
      maxRetries: 3,
    });

    expect(result.status).toBe("created");
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "created",
          workspaceId: "ws-1",
          creatorName: "Test",
        }),
      }),
    );
  });

  it("sets initial progress to 0", async () => {
    mockSessionCreate.mockResolvedValue(makeMockSession());

    const result = await sessionRegistry.create({
      id: "session-2",
      workspaceId: "ws-1",
      creatorId: null,
      creatorName: "Test",
      sourceUrl: null,
      platform: null,
      maxRetries: 3,
    });

    expect(result.progressPercent).toBe(0);
  });
});

describe("sessionRegistry.findById", () => {
  it("returns null for non-existent session", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const result = await sessionRegistry.findById("nonexistent");

    expect(result).toBeNull();
  });

  it("includes stages and history in result", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({
      stages: [{ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 100, error: null }],
      history: [{ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() }],
    }));

    const result = await sessionRegistry.findById("session-1");

    expect(result).not.toBeNull();
    expect(result!.stages).toHaveLength(1);
    expect(result!.history).toHaveLength(1);
  });
});

describe("sessionRegistry.addStage", () => {
  it("creates a stage record", async () => {
    mockStageCreate.mockResolvedValue({ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null });

    const result = await sessionRegistry.addStage("session-1", { type: "import_profile", status: "running" });

    expect(result.type).toBe("import_profile");
    expect(result.status).toBe("running");
  });
});

describe("sessionRegistry.updateStage", () => {
  it("sets completedAt and duration on completion", async () => {
    mockStageFindFirst.mockResolvedValue({ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "running", startedAt: new Date("2025-01-01T00:00:00Z"), completedAt: null, duration: null, error: null });
    mockStageUpdate.mockResolvedValue({ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "completed", startedAt: new Date("2025-01-01T00:00:00Z"), completedAt: new Date(), duration: 1000, error: null });

    const result = await sessionRegistry.updateStage("session-1", "import_profile", { status: "completed" });

    expect(result).not.toBeNull();
    expect(mockStageUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "stg-1" },
        data: expect.objectContaining({
          status: "completed",
          completedAt: expect.any(Date),
          duration: expect.any(Number),
        }),
      }),
    );
  });

  it("returns null when stage not found", async () => {
    mockStageFindFirst.mockResolvedValue(null);

    const result = await sessionRegistry.updateStage("session-1", "nonexistent", { status: "completed" });

    expect(result).toBeNull();
  });
});

// ─── Session Service — Lifecycle ──────────────────────────────────────

describe("sessionService.create", () => {
  beforeEach(() => {
    mockSessionCreate.mockResolvedValue(makeMockSession());
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("creates session and records history event", async () => {
    const result = await sessionService.create({
      workspaceId: "ws-1",
      creatorId: "user-1",
      creatorName: "Test Creator",
      sourceUrl: "https://youtube.com/@test",
      platform: "youtube",
    });

    expect(result.workspaceId).toBe("ws-1");
    expect(result.creatorName).toBe("Test Creator");
  });
});

describe("sessionService.start", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession());
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "queued" }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("transitions status to queued", async () => {
    const result = await sessionService.start("session-1");
    expect(result.status).toBe("queued");
  });

  it("throws for invalid transition", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "completed" }));

    await expect(sessionService.start("session-1")).rejects.toThrow();
  });

  it("throws when session not found", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    await expect(sessionService.start("nonexistent")).rejects.toThrow("not found");
  });
});

describe("sessionService.beginExecution", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "queued" }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "running" }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("transitions status to running", async () => {
    const result = await sessionService.beginExecution("session-1");
    expect(result.status).toBe("running");
  });

  it("throws for invalid transition from completed", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "completed" }));

    await expect(sessionService.beginExecution("session-1")).rejects.toThrow();
  });
});

describe("sessionService.updateStage", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running" }));
    mockStageCreate.mockResolvedValue({ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null });
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "stage_started", data: { stage: "import_profile" }, timestamp: new Date() });
    mockSessionUpdate.mockResolvedValue(makeMockSession({
      status: "running",
      currentStage: "import_profile",
      progressPercent: 5,
      stages: [{ type: "import_profile", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null }],
    }));
  });

  it("adds stage when not yet present", async () => {
    await sessionService.updateStage("session-1", "import_profile", "running");

    expect(mockStageCreate).toHaveBeenCalled();
  });

  it("updates existing stage when already present", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({
      status: "running",
      stages: [{ type: "import_profile", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null }],
    }));
    mockStageFindFirst.mockResolvedValue({ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null });
    mockStageUpdate.mockResolvedValue({ id: "stg-1", sessionId: "session-1", type: "import_profile", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 100, error: null });
    mockSessionUpdate.mockResolvedValue(makeMockSession({
      status: "running",
      currentStage: null,
      stages: [{ type: "import_profile", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 100, error: null }],
    }));

    await sessionService.updateStage("session-1", "import_profile", "completed");

    expect(mockStageUpdate).toHaveBeenCalled();
  });

  it("records appropriate history event for each status", async () => {
    mockStageCreate.mockResolvedValue({ id: "stg-2", sessionId: "session-1", type: "knowledge_intelligence", status: "running", startedAt: new Date(), completedAt: null, duration: null, error: null });

    await sessionService.updateStage("session-1", "knowledge_intelligence", "running");

    expect(mockEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "stage_started",
        }),
      }),
    );
  });
});

describe("sessionService.complete", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "publishing", progressPercent: 90 }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({
      status: "completed",
      progressPercent: 100,
      completedAt: new Date(),
      storefrontUrl: "http://localhost:3000/test",
    }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("sets status to completed", async () => {
    const result = await sessionService.complete("session-1");
    expect(result.status).toBe("completed");
  });

  it("sets progress to 100", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({
      status: "completed",
      progressPercent: 100,
      completedAt: new Date(),
    }));

    const result = await sessionService.complete("session-1");
    expect(result.progressPercent).toBe(100);
  });

  it("accepts optional result data", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({
      status: "completed",
      evaluationScore: 0.85,
      goldenValidationScore: 0.92,
      storefrontUrl: "https://storefront.test/creator",
    }));

    const result = await sessionService.complete("session-1", {
      evaluationScore: 0.85,
      goldenValidationScore: 0.92,
      storefrontUrl: "https://storefront.test/creator",
    });

    expect(result.evaluationScore).toBe(0.85);
  });
});

describe("sessionService.fail", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running" }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "failed", error: "Something went wrong", completedAt: new Date() }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "error_occurred", data: {}, timestamp: new Date() });
  });

  it("sets status to failed", async () => {
    const result = await sessionService.fail("session-1", "Something went wrong");
    expect(result.status).toBe("failed");
  });

  it("records the error message", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "failed", error: "DB connection timeout", completedAt: new Date() }));

    const result = await sessionService.fail("session-1", "DB connection timeout");
    expect(result.error).toBe("DB connection timeout");
  });

  it("throws when session not found", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    await expect(sessionService.fail("nonexistent", "error")).rejects.toThrow();
  });
});

describe("sessionService.retry", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "failed", retryCount: 0, error: "Previous error" }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "retrying", retryCount: 1, error: null }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "retry_initiated", data: {}, timestamp: new Date() });
  });

  it("sets status to retrying", async () => {
    const result = await sessionService.retry("session-1");
    expect(result.status).toBe("retrying");
  });

  it("increments retryCount", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "retrying", retryCount: 1, error: null }));

    const result = await sessionService.retry("session-1");
    expect(result.retryCount).toBe(1);
  });

  it("clears the error message", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "retrying", retryCount: 1, error: null }));

    const result = await sessionService.retry("session-1");
    expect(result.error).toBeNull();
  });

  it("throws when max retries exhausted", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "failed", retryCount: 3, maxRetries: 3 }));

    await expect(sessionService.retry("session-1")).rejects.toThrow("max retries");
  });

  it("throws for invalid retry status", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running" }));

    await expect(sessionService.retry("session-1")).rejects.toThrow();
  });
});

describe("sessionService.cancel", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running" }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "cancelled", completedAt: new Date() }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("sets status to cancelled", async () => {
    const result = await sessionService.cancel("session-1");
    expect(result.status).toBe("cancelled");
  });

  it("throws when session already completed", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "completed" }));

    await expect(sessionService.cancel("session-1")).rejects.toThrow();
  });
});

// ─── Progress ─────────────────────────────────────────────────────────

describe("computeProgress", () => {
  it("uses session.progressPercent when set", () => {
    const session = makeMockSession({ progressPercent: 50 }) as GenerationSessionData;
    const progress = computeProgress(session);
    expect(progress.percent).toBe(50);
  });

  it("calculates elapsedMs from startedAt", () => {
    const session = makeMockSession({ startedAt: new Date(Date.now() - 5000) }) as GenerationSessionData;
    const progress = computeProgress(session);
    expect(progress.elapsedMs).toBeGreaterThanOrEqual(5000);
  });

  it("provides estimated remaining time for partial progress", () => {
    const session = makeMockSession({
      progressPercent: 50,
      startedAt: new Date(Date.now() - 10000),
      stages: STAGE_TYPES.slice(0, 5).map((t) => ({
        type: t, status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 100, error: null,
      })),
    }) as GenerationSessionData;
    const progress = computeProgress(session);
    expect(progress.estimatedRemainingMs).toBeGreaterThan(0);
  });

  it("returns null estimated time for 0% progress", () => {
    const session = makeMockSession({ progressPercent: 0 }) as GenerationSessionData;
    const progress = computeProgress(session);
    expect(progress.estimatedRemainingMs).toBeNull();
  });

  it("returns stage progress for all stages", () => {
    const stages: StageRecord[] = [
      { type: "import_profile", status: "completed", startedAt: new Date(), completedAt: new Date(), duration: 100, error: null },
    ];
    const session = makeMockSession({ stages }) as GenerationSessionData;
    const progress = computeProgress(session);
    expect(progress.stageProgress).toHaveLength(1);
    expect(progress.stageProgress[0].type).toBe("import_profile");
    expect(progress.stageProgress[0].status).toBe("completed");
  });
});

// ─── History ──────────────────────────────────────────────────────────

describe("sessionHistory.record", () => {
  beforeEach(() => {
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: { status: "running" }, timestamp: new Date() });
  });

  it("records a history event", async () => {
    const event = await sessionHistory.record("session-1", "status_changed", { status: "running" });
    expect(event.type).toBe("status_changed");
  });
});

describe("sessionHistory.getTimeline", () => {
  it("returns null for non-existent session", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const timeline = await sessionHistory.getTimeline("nonexistent");
    expect(timeline).toBeNull();
  });

  it("includes session events in timeline", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({
      history: [
        { id: "evt-1", sessionId: "session-1", type: "status_changed", data: { status: "created" }, timestamp: new Date() },
        { id: "evt-2", sessionId: "session-1", type: "status_changed", data: { status: "queued" }, timestamp: new Date() },
      ],
    }));

    const timeline = await sessionHistory.getTimeline("session-1");
    expect(timeline).not.toBeNull();
    expect(timeline!.events).toHaveLength(2);
  });
});

// ─── addWarning ───────────────────────────────────────────────────────

describe("sessionService.addWarning", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running", warnings: [] }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "running", warnings: ["Low confidence"] }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "warning_added", data: { warning: "Low confidence" }, timestamp: new Date() });
  });

  it("adds warning to session", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "running", warnings: ["Low confidence"] }));

    const result = await sessionService.addWarning("session-1", "Low confidence");
    expect(result.warnings).toContain("Low confidence");
  });
});

// ─── linkWorkflow ─────────────────────────────────────────────────────

describe("sessionService.linkWorkflow", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running", workflowId: null }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "running", workflowId: "wf-1" }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "workflow_linked", data: { workflowId: "wf-1" }, timestamp: new Date() });
  });

  it("links workflow to session", async () => {
    const result = await sessionService.linkWorkflow("session-1", "wf-1");
    expect(result.workflowId).toBe("wf-1");
  });
});

// ─── updateProgress ───────────────────────────────────────────────────

describe("sessionService.updateProgress", () => {
  beforeEach(() => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running" }));
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "publishing", currentStage: "publishing" }));
    mockEventCreate.mockResolvedValue({ id: "evt-1", sessionId: "session-1", type: "status_changed", data: {}, timestamp: new Date() });
  });

  it("updates status and currentStage", async () => {
    mockSessionUpdate.mockResolvedValue(makeMockSession({ status: "publishing", currentStage: "publishing" }));

    const result = await sessionService.updateProgress("session-1", {
      status: "publishing",
      currentStage: "publishing",
    });

    expect(result.status).toBe("publishing");
  });

  it("throws for invalid status transition", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "completed" }));

    await expect(sessionService.updateProgress("session-1", { status: "running" })).rejects.toThrow();
  });
});

// ─── getProgress ──────────────────────────────────────────────────────

describe("sessionService.getProgress", () => {
  it("returns null for non-existent session", async () => {
    mockSessionFindUnique.mockResolvedValue(null);

    const result = await sessionService.getProgress("nonexistent");
    expect(result).toBeNull();
  });

  it("returns progress info for existing session", async () => {
    mockSessionFindUnique.mockResolvedValue(makeMockSession({ status: "running", progressPercent: 50 }));

    const result = await sessionService.getProgress("session-1");
    expect(result).not.toBeNull();
    expect(result!.percent).toBe(50);
  });
});

// ─── getByWorkspace ───────────────────────────────────────────────────

describe("sessionService.getByWorkspace", () => {
  it("returns sessions for workspace", async () => {
    mockSessionFindMany.mockResolvedValue([makeMockSession()]);

    const result = await sessionService.getByWorkspace("ws-1");
    expect(result).toHaveLength(1);
  });

  it("returns empty array when no sessions", async () => {
    mockSessionFindMany.mockResolvedValue([]);

    const result = await sessionService.getByWorkspace("ws-empty");
    expect(result).toHaveLength(0);
  });
});
