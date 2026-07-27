import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type {
  GenerationSessionData,
  StageRecord,
  HistoryEvent,
  StageUpdateInput,
  HistoryEventType,
} from "./types";

function mapStage(row: { id: string; sessionId: string; type: string; status: string; startedAt: Date; completedAt: Date | null; duration: number | null; error: string | null }): StageRecord {
  return {
    type: row.type as StageRecord["type"],
    status: row.status as StageRecord["status"],
    startedAt: row.startedAt,
    completedAt: row.completedAt,
    duration: row.duration,
    error: row.error,
  };
}

function mapHistory(row: { id: string; sessionId: string; type: string; data: Prisma.JsonValue; timestamp: Date }): HistoryEvent {
  return {
    type: row.type as HistoryEventType,
    timestamp: row.timestamp,
    data: typeof row.data === "object" && row.data !== null
      ? (row.data as Record<string, unknown>)
      : {},
  };
}

function mapSession(
  row: {
    id: string; workspaceId: string | null; creatorId: string | null; creatorName: string;
    sourceUrl: string | null; platform: string | null; status: string; currentStage: string | null;
    progressPercent: number; maxRetries: number; retryCount: number; workflowId: string | null;
    evaluationScore: number | null; goldenValidationScore: number | null; artifactVersion: number | null;
    correlationId: string | null;
    storefrontUrl: string | null; builderUrl: string | null; dashboardUrl: string | null;
    error: string | null; warnings: Prisma.JsonValue; startedAt: Date; updatedAt: Date; completedAt: Date | null;
    stages?: Array<{ id: string; sessionId: string; type: string; status: string; startedAt: Date; completedAt: Date | null; duration: number | null; error: string | null }>;
    history?: Array<{ id: string; sessionId: string; type: string; data: Prisma.JsonValue; timestamp: Date }>;
  },
): GenerationSessionData {
  const duration = row.completedAt
    ? row.completedAt.getTime() - row.startedAt.getTime()
    : null;

  return {
    id: row.id,
    workspaceId: row.workspaceId,
    creatorId: row.creatorId,
    creatorName: row.creatorName,
    sourceUrl: row.sourceUrl,
    platform: row.platform,
    correlationId: row.correlationId,
    status: row.status as GenerationSessionData["status"],
    currentStage: row.currentStage as GenerationSessionData["currentStage"],
    progressPercent: row.progressPercent,
    startedAt: row.startedAt,
    updatedAt: row.updatedAt,
    completedAt: row.completedAt,
    duration,
    workflowId: row.workflowId,
    evaluationScore: row.evaluationScore,
    goldenValidationScore: row.goldenValidationScore,
    artifactVersion: row.artifactVersion,
    storefrontUrl: row.storefrontUrl,
    builderUrl: row.builderUrl,
    dashboardUrl: row.dashboardUrl,
    retryCount: row.retryCount,
    maxRetries: row.maxRetries,
    error: row.error,
    warnings: Array.isArray(row.warnings) ? row.warnings as string[] : [],
    stages: (row.stages ?? []).map(mapStage),
    history: (row.history ?? []).map(mapHistory),
  };
}

export const sessionRegistry = {
  async create(data: {
    id: string;
    workspaceId?: string;
    creatorId: string | null;
    creatorName: string;
    sourceUrl: string | null;
    platform: string | null;
    maxRetries: number;
    correlationId?: string;
  }): Promise<GenerationSessionData> {
    const session = await prisma.generationSession.create({
      data: {
        id: data.id,
        workspaceId: data.workspaceId ?? null,
        creatorId: data.creatorId,
        creatorName: data.creatorName,
        sourceUrl: data.sourceUrl,
        platform: data.platform,
        maxRetries: data.maxRetries,
        correlationId: data.correlationId ?? null,
        status: "created",
        progressPercent: 0,
        warnings: [],
      },
      include: { stages: true, history: true },
    });
    return mapSession(session);
  },

  async findById(id: string): Promise<GenerationSessionData | null> {
    const session = await prisma.generationSession.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { startedAt: "asc" } },
        history: { orderBy: { timestamp: "asc" } },
      },
    });
    return session ? mapSession(session) : null;
  },

  async findByWorkspace(workspaceId: string, limit = 20): Promise<GenerationSessionData[]> {
    const sessions = await prisma.generationSession.findMany({
      where: { workspaceId },
      include: {
        stages: { orderBy: { startedAt: "asc" } },
        history: { orderBy: { timestamp: "asc" }, take: 50 },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return sessions.map(mapSession);
  },

  async findByStatus(status: string, limit = 50): Promise<GenerationSessionData[]> {
    const sessions = await prisma.generationSession.findMany({
      where: { status },
      include: {
        stages: { orderBy: { startedAt: "asc" } },
        history: { orderBy: { timestamp: "asc" }, take: 50 },
      },
      orderBy: { startedAt: "desc" },
      take: limit,
    });
    return sessions.map(mapSession);
  },

  async update(
    id: string,
    data: {
      status?: string;
      currentStage?: string | null;
      progressPercent?: number;
      workflowId?: string;
      workspaceId?: string;
      evaluationScore?: number;
      goldenValidationScore?: number;
      artifactVersion?: number;
      storefrontUrl?: string;
      builderUrl?: string;
      dashboardUrl?: string;
      error?: string | null;
      warnings?: string[];
      retryCount?: number;
      completedAt?: Date | null;
    },
  ): Promise<GenerationSessionData> {
    const updateData: Record<string, unknown> = {};
    if (data.status !== undefined) updateData.status = data.status;
    if (data.currentStage !== undefined) updateData.currentStage = data.currentStage;
    if (data.progressPercent !== undefined) updateData.progressPercent = data.progressPercent;
    if (data.workflowId !== undefined) updateData.workflowId = data.workflowId;
    if (data.workspaceId !== undefined) updateData.workspaceId = data.workspaceId;
    if (data.evaluationScore !== undefined) updateData.evaluationScore = data.evaluationScore;
    if (data.goldenValidationScore !== undefined) updateData.goldenValidationScore = data.goldenValidationScore;
    if (data.artifactVersion !== undefined) updateData.artifactVersion = data.artifactVersion;
    if (data.storefrontUrl !== undefined) updateData.storefrontUrl = data.storefrontUrl;
    if (data.builderUrl !== undefined) updateData.builderUrl = data.builderUrl;
    if (data.dashboardUrl !== undefined) updateData.dashboardUrl = data.dashboardUrl;
    if (data.error !== undefined) updateData.error = data.error;
    if (data.warnings !== undefined) updateData.warnings = data.warnings;
    if (data.retryCount !== undefined) updateData.retryCount = data.retryCount;
    if (data.completedAt !== undefined) updateData.completedAt = data.completedAt;

    const session = await prisma.generationSession.update({
      where: { id },
      data: updateData,
      include: { stages: true, history: true },
    });
    return mapSession(session);
  },

  async addStage(sessionId: string, input: StageUpdateInput): Promise<StageRecord> {
    const stage = await prisma.generationSessionStage.create({
      data: {
        sessionId,
        type: input.type,
        status: input.status,
        error: input.error ?? null,
      },
    });
    return mapStage(stage);
  },

  async updateStage(sessionId: string, type: string, input: Partial<StageUpdateInput>): Promise<StageRecord | null> {
    const existing = await prisma.generationSessionStage.findFirst({
      where: { sessionId, type },
    });
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};
    if (input.status !== undefined) updateData.status = input.status;
    if (input.error !== undefined) updateData.error = input.error;
    if (input.status === "completed" || input.status === "failed" || input.status === "skipped") {
      updateData.completedAt = new Date();
      updateData.duration = new Date().getTime() - existing.startedAt.getTime();
    }

    if (Object.keys(updateData).length === 0) return mapStage(existing);

    const stage = await prisma.generationSessionStage.update({
      where: { id: existing.id },
      data: updateData,
    });
    return mapStage(stage);
  },

  async addHistoryEvent(
    sessionId: string,
    type: HistoryEventType,
    data: Record<string, unknown> = {},
  ): Promise<HistoryEvent> {
    const event = await prisma.generationSessionEvent.create({
      data: {
        sessionId,
        type,
        data: JSON.parse(JSON.stringify(data)),
      },
    });
    return mapHistory(event);
  },

  async findLatestByWorkspace(workspaceId: string): Promise<GenerationSessionData | null> {
    const session = await prisma.generationSession.findFirst({
      where: { workspaceId },
      include: {
        stages: { orderBy: { startedAt: "asc" } },
        history: { orderBy: { timestamp: "asc" }, take: 50 },
      },
      orderBy: { startedAt: "desc" },
    });
    return session ? mapSession(session) : null;
  },

  async findByCorrelationId(correlationId: string): Promise<GenerationSessionData | null> {
    if (!correlationId) return null;
    const session = await prisma.generationSession.findFirst({
      where: { correlationId },
      include: {
        stages: { orderBy: { startedAt: "asc" } },
        history: { orderBy: { timestamp: "asc" }, take: 50 },
      },
      orderBy: { startedAt: "desc" },
    });
    return session ? mapSession(session) : null;
  },

  async delete(id: string): Promise<void> {
    await prisma.generationSession.delete({ where: { id } });
  },
};
