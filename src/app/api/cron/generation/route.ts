import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyBearerAuth } from "@/lib/security/verify-bearer";
import { sessionService } from "@/lib/generation/session";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const STALE_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 3;

async function recoverStaleJobs() {
  const staleCutoff = new Date(Date.now() - STALE_MS);
  const staleJobs = await prisma.jobRecord.findMany({
    where: { type: "generation", status: "RUNNING", startedAt: { lt: staleCutoff } },
    take: 5,
  });
  for (const job of staleJobs) {
    const meta = job.metadata as Record<string, unknown> | null;
    const sessionId = meta?.sessionId as string | undefined;
    if (!sessionId) continue;
    const session = await prisma.generationSession.findUnique({ where: { id: sessionId }, select: { status: true } });
    if (session && !["completed", "failed", "cancelled", "timed_out"].includes(session.status)) {
      if (job.attempts < MAX_ATTEMPTS) {
        await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "QUEUED", startedAt: null } });
        try { await sessionService.retry(sessionId); } catch {}
      } else {
        await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: "Stale worker exceeded retries" } });
        try { await sessionService.fail(sessionId, "Generation timed out - worker stalled"); } catch {}
      }
    } else {
      await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
    }
  }
}

async function recoverOrphanedSessions() {
  const staleCutoff = new Date(Date.now() - STALE_MS);
  const orphaned = await prisma.generationSession.findMany({
    where: { status: "running", updatedAt: { lt: staleCutoff } },
    take: 5,
    orderBy: { updatedAt: "asc" },
  });
  for (const sess of orphaned) {
    const existingJob = await prisma.jobRecord.findFirst({
      where: { type: "generation", metadata: { path: ["sessionId"], equals: sess.id } },
    });
    if (existingJob) continue;
    // Only recover sessions stuck at early stage (import_profile) to avoid re-running completed ones
    if (sess.currentStage !== "import_profile" && sess.progressPercent !== 3) continue;
    await prisma.jobRecord.create({
      data: {
        type: "generation",
        name: `generation-${sess.id}`,
        status: "QUEUED",
        triggeredBy: sess.creatorId ?? "recovery",
        metadata: {
          sessionId: sess.id,
          sourceUrl: sess.sourceUrl ?? "",
          workspaceName: sess.creatorName ?? "Recovered",
          timezone: "Asia/Kolkata",
          currency: "INR",
          language: "en",
          userId: sess.creatorId ?? "",
          creatorName: sess.creatorName ?? "Creator",
        },
      },
    }).catch(()=>{});
  }
}

async function claimOne() {
  await recoverStaleJobs();
  await recoverOrphanedSessions();
  const job = await prisma.jobRecord.findFirst({
    where: { type: "generation", status: "QUEUED" },
    orderBy: { createdAt: "asc" },
  });
  if (!job) return null;
  const claimed = await prisma.jobRecord.updateMany({
    where: { id: job.id, status: "QUEUED" },
    data: { status: "RUNNING", startedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count === 0) return null;
  const fresh = await prisma.jobRecord.findUnique({ where: { id: job.id } });
  return fresh;
}

async function executeForJob(job: NonNullable<Awaited<ReturnType<typeof prisma.jobRecord.findUnique>>>) {
  const meta = job.metadata as Record<string, unknown>;
  const sessionId = meta?.sessionId as string;
  if (!sessionId) {
    await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: "Missing sessionId in metadata" } });
    return { success: false, error: "Missing sessionId" };
  }
  const session = await prisma.generationSession.findUnique({ where: { id: sessionId } });
  if (!session) {
    await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: "Session not found" } });
    return { success: false, error: "Session not found" };
  }
  // RCCF-OBS-02 — ensure JobRecord → GenerationSession → Tenant correlation
  if (!job.tenantId && session.creatorId) {
    await prisma.jobRecord.update({ where: { id: job.id }, data: { tenantId: session.creatorId } }).catch(() => {});
  } else if (!job.tenantId && session.workspaceId) {
    try {
      const ws = await prisma.workspace.findUnique({ where: { id: session.workspaceId }, select: { tenantId: true } });
      if (ws?.tenantId) await prisma.jobRecord.update({ where: { id: job.id }, data: { tenantId: ws.tenantId } }).catch(() => {});
    } catch {}
  }
  if (["completed", "failed", "cancelled", "timed_out"].includes(session.status)) {
    await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
    return { success: true, alreadyDone: true };
  }
  try {
    const { executeGenerationPipeline } = await import("@/lib/generation/execute");
    const result = await executeGenerationPipeline({
      sessionId,
      sourceUrl: meta.sourceUrl as string,
      workspaceName: meta.workspaceName as string | undefined,
      timezone: meta.timezone as string | undefined,
      currency: meta.currency as string | undefined,
      language: meta.language as string | undefined,
      categoryOverride: meta.categoryOverride as string | undefined,
      goals: meta.goals as Array<{ goalId: string; weight: number }> | undefined,
      userId: meta.userId as string,
      creatorName: meta.creatorName as string | undefined,
    });
    if (result.success) {
      await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "SUCCEEDED", finishedAt: new Date() } });
      return { success: true };
    } else {
      const isRetryable = result.retryable ?? false;
      const err = result.error || "Generation failed";
      if (isRetryable && job.attempts < MAX_ATTEMPTS) {
        await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "QUEUED", finishedAt: null, error: err } });
        try { await sessionService.retry(sessionId); } catch {}
      } else {
        await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: err } });
      }
      return { success: false, error: err, retryable: isRetryable };
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.jobRecord.update({ where: { id: job.id }, data: { status: "FAILED", finishedAt: new Date(), error: msg } });
    try { await sessionService.fail(sessionId, msg); } catch {}
    return { success: false, error: msg };
  }
}

export async function GET(request: NextRequest) {
  if (!verifyBearerAuth(request, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const claimed = await claimOne();
  if (!claimed) {
    return NextResponse.json({ ok: true, processed: 0, claimed: 0, message: "No queued generation jobs" });
  }
  const result = await executeForJob(claimed);
  return NextResponse.json({ ok: true, processed: 1, claimed: 1, result });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
