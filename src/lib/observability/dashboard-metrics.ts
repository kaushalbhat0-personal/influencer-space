import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { logger } from "./logger";

export interface DashboardMetrics {
  failedPublishes: number;
  failedProvisions: number;
  failedBillingOperations: number;
  averagePublishDurationMs: number;
  averageProvisionDurationMs: number;
  generationSuccessRate: number;
  workspaceCount: number;
  tenantCount: number;
  creatorCount: number;
  agencyCount: number;
  mrr: number;
  arr: number;
  timestamp: string;
}

export class DashboardMetricsService {
  async collect(): Promise<DashboardMetrics> {
    const start = Date.now();

    try {
      const [
        publishStats,
        provisionStats,
        generationSessions,
        workspaceCount,
        tenantCount,
        subscriptionData,
      ] = await Promise.all([
        this.getPublishStats(),
        this.getProvisionStats(),
        this.getGenerationStats(),
        prisma.workspace.count(),
        prisma.tenant.count(),
        this.getSubscriptionRevenue(),
      ]);

      const metrics: DashboardMetrics = {
        failedPublishes: publishStats.failed,
        failedProvisions: provisionStats.failed,
        failedBillingOperations: 0,
        averagePublishDurationMs: publishStats.avgDurationMs,
        averageProvisionDurationMs: provisionStats.avgDurationMs,
        generationSuccessRate: generationSessions.successRate,
        workspaceCount,
        tenantCount,
        creatorCount: tenantCount,
        agencyCount: 0,
        mrr: subscriptionData.mrr,
        arr: subscriptionData.mrr * 12,
        timestamp: new Date().toISOString(),
      };

      logger.debug("Dashboard metrics collected", "dashboard-metrics", {
        metadata: { durationMs: Date.now() - start } as Record<string, unknown>,
      });

      return metrics;
    } catch (error) {
      logger.error("Failed to collect dashboard metrics", "dashboard-metrics", {
        error: error instanceof Error ? error : new Error(String(error)),
      });
      return this.getEmptyMetrics();
    }
  }

  private async getPublishStats(): Promise<{ failed: number; avgDurationMs: number }> {
    const failed = await prisma.publishStatus.count({
      where: { state: "failed" },
    });

    const recent = await prisma.publishStatus.findMany({
      where: { publishedAt: { not: null } },
      orderBy: { publishedAt: "desc" },
      take: 100,
    });

    const avgDurationMs = recent.length > 0
      ? Math.round(recent.reduce((sum, p) => sum + (p.publishedAt ? Date.now() - p.publishedAt.getTime() : 0), 0) / recent.length)
      : 0;

    return { failed, avgDurationMs };
  }

  private async getProvisionStats(): Promise<{ failed: number; avgDurationMs: number }> {
    const [failed, completed] = await Promise.all([
      prisma.creatorProvisionRun.count({ where: { status: "FAILED" } }),
      prisma.creatorProvisionRun.findMany({
        where: { status: "COMPLETED", durationMs: { not: null } },
        orderBy: { startedAt: "desc" },
        take: 100,
        select: { durationMs: true },
      }),
    ]);

    const durations = completed
      .map((r) => r.durationMs)
      .filter((d): d is number => d !== null);

    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

    return { failed, avgDurationMs };
  }

  private async getGenerationStats(): Promise<{ successRate: number; total: number }> {
    const [failed, completed] = await Promise.all([
      prisma.generationSession.count({ where: { status: "FAILED" } }),
      prisma.generationSession.count({ where: { status: "COMPLETED" } }),
    ]);

    const total = failed + completed;
    return {
      successRate: total > 0 ? Math.round((completed / total) * 100) : 100,
      total,
    };
  }

  private async getSubscriptionRevenue(): Promise<{ mrr: number }> {
    try {
      const subscriptions = await billingRepository.getAllSubscriptionsWithPlan();
      const mrr = subscriptions
        .filter((s) => s.status === "ACTIVE")
        .reduce((sum, s) => sum + (s.plan?.price ?? 0), 0);
      return { mrr };
    } catch {
      return { mrr: 0 };
    }
  }

  private getEmptyMetrics(): DashboardMetrics {
    return {
      failedPublishes: 0,
      failedProvisions: 0,
      failedBillingOperations: 0,
      averagePublishDurationMs: 0,
      averageProvisionDurationMs: 0,
      generationSuccessRate: 100,
      workspaceCount: 0,
      tenantCount: 0,
      creatorCount: 0,
      agencyCount: 0,
      mrr: 0,
      arr: 0,
      timestamp: new Date().toISOString(),
    };
  }
}

export const dashboardMetricsService = new DashboardMetricsService();
