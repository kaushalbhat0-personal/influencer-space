import { prisma } from "@/lib/prisma";
import type { BetaDashboardEntry } from "./types";

export interface BetaDashboardStats {
  total: number;
  completed: number;
  failed: number;
  running: number;
  averageHealthScore: number;
  averageDurationMs: number;
}

export async function getBetaDashboardData(): Promise<{
  entries: BetaDashboardEntry[];
  stats: BetaDashboardStats;
}> {
  const sessions = await prisma.generationSession.findMany({
    orderBy: { startedAt: "desc" },
    take: 100,
  });

  const entries: BetaDashboardEntry[] = [];
  let totalHealth = 0;
  let healthCount = 0;
  let totalDuration = 0;
  let durationCount = 0;
  let completedCount = 0;
  let failedCount = 0;
  let runningCount = 0;

  for (const session of sessions) {
    if (session.status === "completed") completedCount++;
    else if (session.status === "failed" || session.status === "cancelled" || session.status === "timed_out") failedCount++;
    else runningCount++;

    const tenantId = session.creatorId;
    const website = tenantId ? await prisma.website.findUnique({ where: { tenantId } }) : null;
    const websiteId = website?.id ?? null;

    let publishVersion: number | null = null;
    let hasSnapshot = false;
    if (websiteId) {
      const status = await prisma.publishStatus.findUnique({ where: { websiteId } });
      publishVersion = status?.liveVersion ?? null;
      hasSnapshot = !!status?.liveVersion;
    }

    const storefrontUrl = session.storefrontUrl ?? (websiteId ? `/${tenantId}` : null);

    const durationMs = session.completedAt && session.startedAt
      ? session.completedAt.getTime() - session.startedAt.getTime()
      : 0;
    if (durationMs > 0) { totalDuration += durationMs; durationCount++; }

    const healthScore = computeHealthScore(session, hasSnapshot);
    totalHealth += healthScore;
    healthCount++;

    entries.push({
      id: session.id,
      creatorName: session.creatorName,
      currentStage: session.currentStage ?? session.status,
      persona: session.warnings && Array.isArray(session.warnings)
        ? (session.warnings as unknown[]).find((w) => typeof w === "object" && w !== null && "persona" in w)?.["persona"] as string ?? "—"
        : "—",
      theme: "—",
      hasSnapshot,
      publishVersion,
      storefrontUrl,
      durationMs,
      status: session.status,
      healthScore,
      correlationId: session.correlationId,
      tenantId,
      websiteId,
      createdAt: session.startedAt,
    });
  }

  return {
    entries,
    stats: {
      total: sessions.length,
      completed: completedCount,
      failed: failedCount,
      running: runningCount,
      averageHealthScore: healthCount > 0 ? Math.round(totalHealth / healthCount) : 0,
      averageDurationMs: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    },
  };
}

function computeHealthScore(
  session: { status: string; evaluationScore?: number | null; goldenValidationScore?: number | null; error?: string | null },
  hasSnapshot: boolean,
): number {
  let score = 50;

  if (session.status === "completed") score += 25;
  else if (session.status === "failed") score -= 20;

  if (hasSnapshot) score += 15;

  if (session.evaluationScore != null && session.evaluationScore > 0.5) score += 5;
  if (session.goldenValidationScore != null && session.goldenValidationScore > 0.5) score += 5;

  if (!session.error) score += 5;
  else score -= 10;

  return Math.max(0, Math.min(100, score));
}
