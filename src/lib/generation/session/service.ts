import { randomUUID } from "crypto";
import { sessionRegistry } from "./registry";
import { sessionHistory } from "./history";
import { computeProgress } from "./progress";
import type {
  GenerationSessionData,
  CreateSessionInput,
  UpdateSessionInput,
  StageType,
  StageStatus,
} from "./types";
import type { ProgressInfo } from "./progress";
import {
  isValidTransition,
  calculateProgress,
} from "./types";

function generateId(): string {
  return randomUUID();
}

export const sessionService = {
  async create(input: CreateSessionInput): Promise<GenerationSessionData> {
    const id = generateId();
    const session = await sessionRegistry.create({
      id,
      workspaceId: input.workspaceId,
      creatorId: input.creatorId ?? null,
      creatorName: input.creatorName,
      sourceUrl: input.sourceUrl ?? null,
      platform: input.platform ?? null,
      maxRetries: input.maxRetries ?? 3,
      correlationId: input.correlationId,
    });

    await sessionHistory.record(id, "status_changed", {
      status: "created",
      previousStatus: null,
    });

    return session;
  },

  async start(id: string): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    if (!isValidTransition(session.status, "queued")) {
      throw new Error(
        `Cannot start session ${id}: invalid transition from ${session.status} to queued`,
      );
    }

    const updated = await sessionRegistry.update(id, {
      status: "queued",
    });

    await sessionHistory.record(id, "status_changed", {
      status: "queued",
      previousStatus: session.status,
    });

    return updated;
  },

  async beginExecution(id: string): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    if (!isValidTransition(session.status, "running")) {
      throw new Error(
        `Cannot execute session ${id}: invalid transition from ${session.status} to running`,
      );
    }

    const updated = await sessionRegistry.update(id, {
      status: "running",
    });

    await sessionHistory.record(id, "status_changed", {
      status: "running",
      previousStatus: session.status,
    });

    return updated;
  },

  async updateStage(
    id: string,
    type: StageType,
    status: StageStatus,
    error?: string,
  ): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const existingStage = session.stages.find((s) => s.type === type);

    if (existingStage) {
      await sessionRegistry.updateStage(id, type, { status, error });
    } else {
      await sessionRegistry.addStage(id, { type, status, error });
    }

    const historyEventType =
      status === "running" ? "stage_started"
      : status === "completed" ? "stage_completed"
      : status === "failed" ? "stage_failed"
      : "stage_started";

    await sessionHistory.record(id, historyEventType, {
      stage: type,
      status,
      error: error ?? null,
    });

    const updated = await sessionRegistry.findById(id);
    if (!updated) throw new Error(`Session ${id} not found after stage update`);

    const progress = calculateProgress(updated.stages);

    return sessionRegistry.update(id, {
      currentStage: status === "running" ? type : updated.currentStage,
      progressPercent: progress,
    });
  },

  async complete(
    id: string,
    result?: {
      evaluationScore?: number;
      goldenValidationScore?: number;
      artifactVersion?: number;
      storefrontUrl?: string;
      builderUrl?: string;
      dashboardUrl?: string;
    },
  ): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const now = new Date();
    const updated = await sessionRegistry.update(id, {
      status: "completed",
      progressPercent: 100,
      completedAt: now,
      evaluationScore: result?.evaluationScore ?? session.evaluationScore ?? undefined,
      goldenValidationScore: result?.goldenValidationScore ?? session.goldenValidationScore ?? undefined,
      artifactVersion: result?.artifactVersion ?? session.artifactVersion ?? undefined,
      storefrontUrl: result?.storefrontUrl ?? session.storefrontUrl ?? undefined,
      builderUrl: result?.builderUrl ?? session.builderUrl ?? undefined,
      dashboardUrl: result?.dashboardUrl ?? session.dashboardUrl ?? undefined,
    });

    await sessionHistory.record(id, "status_changed", {
      status: "completed",
      previousStatus: session.status,
      duration: now.getTime() - session.startedAt.getTime(),
    });

    return updated;
  },

  async fail(
    id: string,
    error: string,
  ): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const now = new Date();
    const updated = await sessionRegistry.update(id, {
      status: "failed",
      error,
      completedAt: now,
    });

    await sessionHistory.record(id, "error_occurred", {
      error,
      previousStatus: session.status,
    });
    await sessionHistory.record(id, "status_changed", {
      status: "failed",
      previousStatus: session.status,
    });

    return updated;
  },

  async retry(id: string): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    if (!isValidTransition(session.status, "retrying")) {
      throw new Error(
        `Cannot retry session ${id}: invalid transition from ${session.status}`,
      );
    }

    if (session.retryCount >= session.maxRetries) {
      throw new Error(
        `Session ${id} has exhausted max retries (${session.maxRetries})`,
      );
    }

    const updated = await sessionRegistry.update(id, {
      status: "retrying",
      retryCount: session.retryCount + 1,
      error: null,
    });

    await sessionHistory.record(id, "retry_initiated", {
      attempt: session.retryCount + 1,
      maxRetries: session.maxRetries,
      previousError: session.error,
    });

    return updated;
  },

  async cancel(id: string): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    if (!isValidTransition(session.status, "cancelled")) {
      throw new Error(
        `Cannot cancel session ${id}: invalid transition from ${session.status}`,
      );
    }

    const now = new Date();
    const updated = await sessionRegistry.update(id, {
      status: "cancelled",
      completedAt: now,
    });

    await sessionHistory.record(id, "status_changed", {
      status: "cancelled",
      previousStatus: session.status,
    });

    return updated;
  },

  async updateProgress(
    id: string,
    updates: UpdateSessionInput,
  ): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const updateData: Record<string, unknown> = {};
    if (updates.status !== undefined) {
      if (!isValidTransition(session.status, updates.status)) {
        throw new Error(
          `Invalid status transition: ${session.status} -> ${updates.status}`,
        );
      }
      updateData.status = updates.status;
    }
    if (updates.currentStage !== undefined) updateData.currentStage = updates.currentStage;
    if (updates.progressPercent !== undefined) updateData.progressPercent = updates.progressPercent;
    if (updates.workflowId !== undefined) updateData.workflowId = updates.workflowId;
    if (updates.evaluationScore !== undefined) updateData.evaluationScore = updates.evaluationScore;
    if (updates.goldenValidationScore !== undefined) updateData.goldenValidationScore = updates.goldenValidationScore;
    if (updates.artifactVersion !== undefined) updateData.artifactVersion = updates.artifactVersion;
    if (updates.storefrontUrl !== undefined) updateData.storefrontUrl = updates.storefrontUrl;
    if (updates.builderUrl !== undefined) updateData.builderUrl = updates.builderUrl;
    if (updates.dashboardUrl !== undefined) updateData.dashboardUrl = updates.dashboardUrl;
    if (updates.error !== undefined) updateData.error = updates.error;
    if (updates.warnings !== undefined) updateData.warnings = updates.warnings;

    const updated = await sessionRegistry.update(id, updateData);

    if (updates.status) {
      await sessionHistory.record(id, "status_changed", {
        status: updates.status,
        previousStatus: session.status,
      });
    }

    if (updates.progressPercent !== undefined) {
      await sessionHistory.record(id, "progress_updated", {
        percent: updates.progressPercent,
      });
    }

    return updated;
  },

  async addWarning(id: string, warning: string): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const warnings = [...session.warnings, warning];
    const updated = await sessionRegistry.update(id, { warnings });

    await sessionHistory.record(id, "warning_added", { warning });

    return updated;
  },

  async linkWorkflow(id: string, workflowId: string): Promise<GenerationSessionData> {
    const session = await sessionRegistry.findById(id);
    if (!session) throw new Error(`Session ${id} not found`);

    const updated = await sessionRegistry.update(id, { workflowId });

    await sessionHistory.record(id, "workflow_linked", { workflowId });

    return updated;
  },

  async getProgress(id: string): Promise<ProgressInfo | null> {
    const session = await sessionRegistry.findById(id);
    if (!session) return null;
    return computeProgress(session);
  },

  async getById(id: string): Promise<GenerationSessionData | null> {
    return sessionRegistry.findById(id);
  },

  async getByWorkspace(workspaceId: string): Promise<GenerationSessionData[]> {
    return sessionRegistry.findByWorkspace(workspaceId);
  },

  async getByCorrelationId(correlationId: string): Promise<GenerationSessionData | null> {
    return sessionRegistry.findByCorrelationId(correlationId);
  },
};

export type SessionService = typeof sessionService;
