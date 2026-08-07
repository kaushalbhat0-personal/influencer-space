// ── Generation Progress Runtime — RCCF-LAUNCH-TRACK-03 ─────
// P0. Progress is derived from the REAL GenerationSession (the backend's
// milestone source of truth) + canonical generation events. No timers drive
// progress. The onboarding UI polls this runtime; the pipeline emits events.

import { prisma } from "@/lib/prisma";
import { runtimeEventBus } from "@/modules/event-runtime";
import { GENERATION_STAGES, JOURNEY_FRIENDLY } from "./friendly";

export type GenerationStageStatus = "pending" | "running" | "completed" | "failed";

export interface ProgressStage {
  id: string;
  title: string;
  description: string;
  status: GenerationStageStatus;
}

export interface GenerationProgress {
  sessionId: string;
  status: string; // created | queued | running | publishing | completed | failed | cancelled | timed_out
  currentStage: string | null;
  currentMessage: string | null;
  stages: ProgressStage[];
  progressPercent: number;
  startedAt: string | null;
  completedAt: string | null;
  elapsedMs: number;
  failure: { stage: string | null; error: string | null } | null;
}

/** Friendly message for a stage id (creator language, no technical jargon). */
function friendlyFor(stageId: string): string {
  return JOURNEY_FRIENDLY[stageId] ?? stageId.replace(/_/g, " ");
}

/** Emit a canonical generation.* event through the Event Runtime. */
export async function emitGenerationEvent(sessionId: string, type: Parameters<typeof runtimeEventBus.publish>[0]["type"], payload: Record<string, unknown> = {}): Promise<void> {
  await runtimeEventBus.publish({
    type,
    tenantId: "system",
    entityId: sessionId,
    payload: { sessionId, ...payload },
    occurredAt: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Derive progress from the persisted GenerationSession. The session rows are
 * written by the backend as milestones complete — the single source of truth.
 */
export async function getGenerationProgress(sessionId: string): Promise<GenerationProgress | null> {
  const session = await prisma.generationSession.findUnique({
    where: { id: sessionId },
    include: { stages: { orderBy: { startedAt: "asc" } } },
  });
  if (!session) return null;

  const statusOf = new Map<string, GenerationStageStatus>();
  let currentStage: string | null = null;
  let failedStage: string | null = null;
  for (const s of session.stages ?? []) {
    const st = s.status as GenerationStageStatus;
    statusOf.set(s.type, st);
    if (st === "running") currentStage = s.type;
    if (st === "failed") failedStage = s.type;
  }

  const stages: ProgressStage[] = GENERATION_STAGES.map((cfg) => {
    const status = statusOf.get(cfg.id) ?? "pending";
    return { id: cfg.id, title: cfg.title, description: cfg.description, status };
  });

  const startedAt = session.startedAt?.toISOString() ?? null;
  const completedAt = session.completedAt?.toISOString() ?? null;
  const elapsedMs = completedAt
    ? new Date(completedAt).getTime() - (session.startedAt ? new Date(session.startedAt).getTime() : 0)
    : session.startedAt
      ? Date.now() - new Date(session.startedAt).getTime()
      : 0;

  return {
    sessionId,
    status: session.status,
    currentStage,
    currentMessage: currentStage ? friendlyFor(currentStage) : null,
    stages,
    progressPercent: session.progressPercent,
    startedAt,
    completedAt,
    elapsedMs,
    failure: failedStage ? { stage: failedStage, error: session.error ?? null } : null,
  };
}

/** Recent generations + averages for the Super Admin monitor (Phase 11). */
export async function getGenerationMonitor(limit = 50): Promise<{
  items: Array<{ id: string; creatorName: string; status: string; currentStage: string | null; progressPercent: number; startedAt: string | null; completedAt: string | null; durationMs: number | null; failedStage: string | null; error: string | null }>;
  averageDurationMs: number;
  total: number;
}> {
  const sessions = await prisma.generationSession.findMany({
    orderBy: { startedAt: "desc" },
    take: limit,
    select: { id: true, creatorName: true, status: true, currentStage: true, progressPercent: true, startedAt: true, completedAt: true, error: true, stages: { select: { type: true, status: true } } },
  });
  const durations: number[] = [];
  const items = sessions.map((s) => {
    const durationMs = s.startedAt && s.completedAt ? new Date(s.completedAt).getTime() - new Date(s.startedAt).getTime() : null;
    if (durationMs !== null && s.status === "completed") durations.push(durationMs);
    const failedStage = s.stages.find((st) => st.status === "failed")?.type ?? null;
    return {
      id: s.id, creatorName: s.creatorName, status: s.status, currentStage: s.currentStage,
      progressPercent: s.progressPercent, startedAt: s.startedAt?.toISOString() ?? null,
      completedAt: s.completedAt?.toISOString() ?? null, durationMs, failedStage, error: s.error,
    };
  });
  return { items, averageDurationMs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0, total: sessions.length };
}
