/**
 * Durable Alert Store (IMPLEMENTATION-40) — replaces runtime-only alert state.
 *
 * Alerts are persisted to AlertRecord and only ever created from real runtime
 * conditions (health checks, billing failures, failed job runs) — no fake
 * alerts. Alert lifecycle: ACTIVE → RESOLVED / DISMISSED, each transition
 * audited via the audit log.
 */
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { healthService, HealthState } from "@/lib/observability/health-service";

export type AlertLevel = "INFO" | "WARNING" | "CRITICAL";
export type AlertStatus = "ACTIVE" | "RESOLVED" | "DISMISSED";

export interface AlertInput {
  level: AlertLevel;
  title: string;
  message?: string;
  source: string;
  service?: string;
  tenantId?: string | null;
  workspaceId?: string | null;
  relatedJobId?: string | null;
  metadata?: Record<string, unknown>;
}

const ALERT_DEDUPE_WINDOW_MS = 12 * 60 * 60 * 1000;

export class AlertStore {
  /** Create an alert unless an identical ACTIVE alert exists within the window. */
  async create(input: AlertInput): Promise<{ created: boolean; id?: string }> {
    const cutoff = new Date(Date.now() - ALERT_DEDUPE_WINDOW_MS);
    const existing = await prisma.alertRecord.findFirst({
      where: {
        title: input.title,
        source: input.source,
        status: "ACTIVE",
        createdAt: { gte: cutoff },
      },
      select: { id: true },
    });
    if (existing) return { created: false, id: existing.id };

    const record = await prisma.alertRecord.create({
      data: {
        level: input.level,
        status: "ACTIVE",
        title: input.title,
        message: input.message ?? null,
        source: input.source,
        service: input.service ?? null,
        tenantId: input.tenantId ?? null,
        workspaceId: input.workspaceId ?? null,
        relatedJobId: input.relatedJobId ?? null,
        metadata: input.metadata ? JSON.parse(JSON.stringify(input.metadata)) : undefined,
      },
    });
    await logAction(input.tenantId ?? "system", `alerts:created:${input.level.toLowerCase()}`, {
      title: input.title,
      source: input.source,
      service: input.service,
    }).catch(() => {});
    return { created: true, id: record.id };
  }

  async list(input: { status?: AlertStatus | "ALL"; source?: string; level?: string; page?: number; pageSize?: number } = {}) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 50;
    const where: Record<string, unknown> = {};
    if (input.status && input.status !== "ALL") where.status = input.status;
    if (input.source && input.source !== "ALL") where.source = input.source;
    if (input.level && input.level !== "ALL") where.level = input.level;

    const [rows, total] = await Promise.all([
      prisma.alertRecord.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.alertRecord.count({ where }),
    ]);
    return { rows, total, page, pageSize };
  }

  async countActive(): Promise<number> {
    return prisma.alertRecord.count({ where: { status: "ACTIVE" } });
  }

  async countByStatus(): Promise<Record<AlertStatus, number>> {
    const rows = await prisma.alertRecord.groupBy({ by: ["status"], _count: true });
    const out: Record<AlertStatus, number> = { ACTIVE: 0, RESOLVED: 0, DISMISSED: 0 };
    for (const r of rows) if (out[r.status as AlertStatus] !== undefined) out[r.status as AlertStatus] = r._count;
    return out;
  }

  async setStatus(id: string, status: AlertStatus, actor?: string): Promise<{ success: boolean; error?: string }> {
    try {
      const record = await prisma.alertRecord.findUnique({ where: { id } });
      if (!record) return { success: false, error: "Alert not found" };
      await prisma.alertRecord.update({
        where: { id },
        data: {
          status,
          resolvedAt: status === "RESOLVED" ? new Date() : record.resolvedAt,
          dismissedAt: status === "DISMISSED" ? new Date() : record.dismissedAt,
          acknowledgedBy: actor ?? record.acknowledgedBy,
        },
      });
      await logAction(record.tenantId ?? "system", `alerts:${status.toLowerCase()}`, { alertId: id, title: record.title, actor }).catch(() => {});
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to update alert" };
    }
  }

  /**
   * Evaluate real runtime conditions and persist ACTIVE alerts only when the
   * condition is new. No fake alerts — every branch is a real check.
   */
  async syncFromRuntime(actor?: string): Promise<{ created: number }> {
    const health = await healthService.checkAll().catch(() => null);
    const created: string[] = [];

    if (health) {
      for (const [name, check] of Object.entries(health.services)) {
        if (check.state === HealthState.Critical) {
          const r = await this.create({
            level: "CRITICAL",
            title: `${formatService(name)} is critical`,
            message: check.message || "Service is unavailable",
            source: "health",
            service: name,
            metadata: { latencyMs: check.latencyMs },
          });
          if (r.created) created.push(`health:${name}`);
        } else if (check.state === HealthState.Warning) {
          const r = await this.create({
            level: "WARNING",
            title: `${formatService(name)} is degraded`,
            message: check.message || "Service is degraded",
            source: "health",
            service: name,
            metadata: { latencyMs: check.latencyMs },
          });
          if (r.created) created.push(`health:${name}`);
        }
      }
    }

    const [failedPayments, failedJobs] = await Promise.all([
      prisma.billingEvent.count({ where: { type: "PAYMENT_FAILED", createdAt: { gte: new Date(Date.now() - 86400000) } } }),
      prisma.jobRecord.count({ where: { status: "FAILED", finishedAt: { gte: new Date(Date.now() - 86400000) } } }),
    ]);

    if (failedPayments > 0) {
      const r = await this.create({
        level: failedPayments > 5 ? "CRITICAL" : "WARNING",
        title: `${failedPayments} payment failure${failedPayments > 1 ? "s" : ""} in the last 24h`,
        message: "Billing events show PAYMENT_FAILED records requiring attention.",
        source: "billing",
        service: "razorpay",
        metadata: { count: failedPayments },
      });
      if (r.created) created.push("billing:payments");
    }

    if (failedJobs > 0) {
      const r = await this.create({
        level: "WARNING",
        title: `${failedJobs} failed job run${failedJobs > 1 ? "s" : ""} in the last 24h`,
        message: "Persisted job runs reported failures.",
        source: "jobs",
        service: "job-runner",
        metadata: { count: failedJobs },
      });
      if (r.created) created.push("jobs:failed");
    }

    return { created: created.length };
  }
}

function formatService(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

export const alertStore = new AlertStore();
