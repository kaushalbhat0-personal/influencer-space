/**
 * Persisted Job Runtime (IMPLEMENTATION-40) — durable job runs layered on the
 * existing in-process JobRunner. Every run is recorded to JobRecord so the Job
 * Center reflects real, persisted history (no fake jobs).
 */
import { prisma } from "@/lib/prisma";
import { jobRunner } from "@/lib/reliability";

export type JobType = "publishing" | "generation" | "cleanup" | "webhook" | "storage" | "cron";
export type JobStatus = "QUEUED" | "RUNNING" | "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface JobRunInput {
  type: JobType;
  name: string;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export class PersistedJobRuntime {
  async recordStarted(input: JobRunInput): Promise<string> {
    const record = await prisma.jobRecord.create({
      data: {
        type: input.type,
        name: input.name,
        status: "RUNNING",
        startedAt: new Date(),
        attempts: 1,
        triggeredBy: input.triggeredBy ?? null,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      },
    });
    return record.id;
  }

  async recordFinished(id: string, ok: boolean, error?: string): Promise<void> {
    await prisma.jobRecord.update({
      where: { id },
      data: {
        status: ok ? "SUCCEEDED" : "FAILED",
        finishedAt: new Date(),
        error: error ?? null,
      },
    });
  }

  async recordDuration(id: string, durationMs: number): Promise<void> {
    await prisma.jobRecord.update({ where: { id }, data: { durationMs } });
  }

  /** Run a registered JobRunner job and persist the run. */
  async runPersisted(jobId: string, input: Omit<JobRunInput, "name">, triggeredBy?: string): Promise<{ success: boolean; runId?: string; error?: string }> {
    const job = jobRunner.getStatus().find((j) => j.id === jobId);
    const name = job?.name ?? input.type;
    const recordId = await this.recordStarted({ type: input.type, name, triggeredBy, metadata: input.metadata });
    const started = Date.now();
    const ok = await jobRunner.runOnce(jobId);
    await this.recordDuration(recordId, Date.now() - started);
    if (!ok) {
      // Distinguish "job not found / already running" from a thrown failure.
      const err = job ? (job.running ? "Job already running" : "Job execution failed") : "Unknown job";
      await this.recordFinished(recordId, false, err);
      return { success: false, runId: recordId, error: err };
    }
    await this.recordFinished(recordId, true);
    return { success: true, runId: recordId };
  }

  /** Persist a successful cron run directly (cron routes call this). */
  async recordCron(name: string, ok: boolean, detail?: string): Promise<string> {
    const recordId = await this.recordStarted({ type: "cron", name, triggeredBy: "cron" });
    await this.recordDuration(recordId, 0);
    await this.recordFinished(recordId, ok, ok ? undefined : (detail ?? "cron failed"));
    return recordId;
  }

  async list(input: { status?: JobStatus | "ALL"; type?: JobType | "ALL"; page?: number; pageSize?: number } = {}) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const where: Record<string, unknown> = {};
    if (input.status && input.status !== "ALL") where.status = input.status;
    if (input.type && input.type !== "ALL") where.type = input.type;

    const [rows, total] = await Promise.all([
      prisma.jobRecord.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.jobRecord.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  }

  async counts(): Promise<{ running: number; failed24h: number; succeeded24h: number; total: number }> {
    const since = new Date(Date.now() - 86400000);
    const [running, failed24h, succeeded24h, total] = await Promise.all([
      prisma.jobRecord.count({ where: { status: "RUNNING" } }),
      prisma.jobRecord.count({ where: { status: "FAILED", finishedAt: { gte: since } } }),
      prisma.jobRecord.count({ where: { status: "SUCCEEDED", finishedAt: { gte: since } } }),
      prisma.jobRecord.count(),
    ]);
    return { running, failed24h, succeeded24h, total };
  }

  async requeue(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await prisma.jobRecord.findUnique({ where: { id } });
      if (!record) return { success: false, error: "Job run not found" };
      await prisma.jobRecord.update({
        where: { id },
        data: { status: "QUEUED", error: null, attempts: record.attempts + 1, startedAt: null, finishedAt: null },
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to requeue" };
    }
  }

  async cancel(id: string): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await prisma.jobRecord.findUnique({ where: { id } });
      if (!record) return { success: false, error: "Job run not found" };
      if (record.status !== "QUEUED" && record.status !== "RUNNING") {
        return { success: false, error: "Only queued or running jobs can be cancelled" };
      }
      await prisma.jobRecord.update({ where: { id }, data: { status: "CANCELLED", finishedAt: new Date(), error: "cancelled by operator" } });
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to cancel" };
    }
  }
}

export const persistedJobRuntime = new PersistedJobRuntime();
