/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach } from "vitest";
import { GenerationAnalytics } from "@/lib/generation/operations/generation-analytics";
import { GenerationBudgetMonitor } from "@/lib/generation/operations/generation-budget-monitor";
import { GenerationCostDashboard } from "@/lib/generation/operations/generation-cost-dashboard";
import { GenerationAlerts } from "@/lib/generation/operations/generation-alerts";
import { GenerationRateControl } from "@/lib/generation/operations/generation-rate-control";
import { GenerationRetention } from "@/lib/generation/operations/generation-retention";
import { GenerationCleanup } from "@/lib/generation/operations/generation-cleanup";
import { GenerationRecovery } from "@/lib/generation/operations/generation-recovery";
import { GenerationAudit } from "@/lib/generation/operations/generation-audit";
import { GenerationHealth } from "@/lib/generation/operations/generation-health";
import { GenerationDashboard } from "@/lib/generation/operations/generation-dashboard";
import { GenerationReporting } from "@/lib/generation/operations/generation-reporting";
import { GenerationAdmin } from "@/lib/generation/operations/generation-admin";
import { success } from "@/lib/generation/infrastructure/helpers/result";

// ==================== Analytics ====================
describe("GenerationAnalytics", () => {
  let analytics: GenerationAnalytics;

  beforeEach(() => { analytics = new GenerationAnalytics(); });

  it("generates daily report", async () => {
    const report = await analytics.generateDailyReport();
    expect(report.period).toBe("daily");
    expect(report.totalGenerations).toBeGreaterThan(0);
  });

  it("generates weekly report", async () => {
    const report = await analytics.generateWeeklyReport();
    expect(report.period).toBe("weekly");
  });

  it("generates monthly report", async () => {
    const report = await analytics.generateMonthlyReport();
    expect(report.period).toBe("monthly");
  });

  it("generates custom report", async () => {
    const report = await analytics.generateCustomReport("2025-01-01", "2025-01-31");
    expect(report.totalGenerations).toBeGreaterThan(0);
  });
});

// ==================== Budget Monitor ====================
describe("GenerationBudgetMonitor", () => {
  let monitor: GenerationBudgetMonitor;

  beforeEach(() => { monitor = new GenerationBudgetMonitor(); });

  it("tracks spend per creator", () => {
    monitor.trackSpend("creator_1", 10);
    const budget = monitor.getBudget("creator_1");
    expect(budget).not.toBeNull();
    expect(budget!.dailySpend).toBe(10);
  });

  it("generates alert when daily limit exceeded", () => {
    monitor.setLimits("creator_1", 5, 100);
    monitor.trackSpend("creator_1", 10);
    const alerts = monitor.getAlerts();
    expect(alerts.length).toBeGreaterThan(0);
    expect(alerts[0]!.type).toBe("daily_limit");
  });

  it("generates alert when monthly limit exceeded", () => {
    monitor.setLimits("creator_1", 100, 5);
    monitor.trackSpend("creator_1", 10);
    const alerts = monitor.getAlerts();
    expect(alerts.some((a) => a.type === "hard_limit")).toBe(true);
  });

  it("resets daily spend", () => {
    monitor.trackSpend("creator_1", 50);
    monitor.resetDaily("creator_1");
    expect(monitor.getBudget("creator_1")!.dailySpend).toBe(0);
  });

  it("resets all daily spends", () => {
    monitor.trackSpend("c1", 10);
    monitor.trackSpend("c2", 20);
    monitor.resetDaily();
    expect(monitor.getBudget("c1")!.dailySpend).toBe(0);
    expect(monitor.getBudget("c2")!.dailySpend).toBe(0);
  });

  it("clearAlerts removes all alerts", () => {
    monitor.setLimits("c1", 1, 100);
    monitor.trackSpend("c1", 10);
    monitor.clearAlerts();
    expect(monitor.getAlerts()).toHaveLength(0);
  });

  it("getAllBudgets returns all entries", () => {
    monitor.trackSpend("c1", 10);
    monitor.trackSpend("c2", 20);
    expect(monitor.getAllBudgets()).toHaveLength(2);
  });
});

// ==================== Cost Dashboard ====================
describe("GenerationCostDashboard", () => {
  let dashboard: GenerationCostDashboard;

  beforeEach(() => { dashboard = new GenerationCostDashboard(); });

  it("returns cost breakdown", () => {
    const costs = dashboard.getCostBreakdown();
    expect(costs.totalCost).toBeGreaterThan(0);
    expect(costs.byProvider).toBeDefined();
  });

  it("returns provider costs", () => {
    const costs = dashboard.getProviderCosts();
    expect(costs.length).toBeGreaterThan(0);
  });

  it("returns estimated savings", () => {
    const savings = dashboard.getEstimatedSavings();
    expect(savings.deterministicCalls).toBeGreaterThan(0);
  });
});

// ==================== Alerts ====================
describe("GenerationAlerts", () => {
  let alerts: GenerationAlerts;

  beforeEach(() => { alerts = new GenerationAlerts(); });

  it("creates budget exceeded alert", () => {
    alerts.budgetExceeded("creator_1", 100, 50);
    expect(alerts.getAlerts()).toHaveLength(1);
    expect(alerts.getAlerts()[0]!.category).toBe("budget");
  });

  it("creates provider down alert", () => {
    alerts.providerDown("deepseek");
    expect(alerts.getAlerts()[0]!.severity).toBe("critical");
  });

  it("creates queue backed up alert", () => {
    alerts.queueBackedUp(100, 50);
    expect(alerts.getAlerts()).toHaveLength(1);
  });

  it("creates worker offline alert", () => {
    alerts.workerOffline("worker_1");
    expect(alerts.getAlerts()[0]!.severity).toBe("critical");
  });

  it("creates retry storm alert", () => {
    alerts.retryStorm("gen_1", 5);
    expect(alerts.getAlerts()).toHaveLength(1);
  });

  it("acknowledges specific alert", () => {
    alerts.budgetExceeded("c1", 100, 50);
    const id = alerts.getAlerts()[0]!.id;
    alerts.acknowledge(id);
    expect(alerts.getUnacknowledged()).toHaveLength(0);
  });

  it("acknowledges all alerts", () => {
    alerts.budgetExceeded("c1", 100, 50);
    alerts.providerDown("mock");
    alerts.acknowledgeAll();
    expect(alerts.getUnacknowledged()).toHaveLength(0);
  });

  it("subscribes to alerts", () => {
    const handler = vi.fn();
    alerts.subscribe(handler);
    alerts.budgetExceeded("c1", 100, 50);
    expect(handler).toHaveBeenCalled();
  });

  it("caps alert history at 1000", () => {
    for (let i = 0; i < 1100; i++) alerts.budgetExceeded(`c${i}`, 1, 1);
    expect(alerts.getAlerts().length).toBeLessThanOrEqual(1000);
  });

  it("clear removes all alerts", () => {
    alerts.budgetExceeded("c1", 100, 50);
    alerts.clear();
    expect(alerts.getAlerts()).toHaveLength(0);
  });
});

// ==================== Rate Control ====================
describe("GenerationRateControl", () => {
  let control: GenerationRateControl;

  beforeEach(() => {
    control = new GenerationRateControl({ maxGenerationsPerMinute: 100, maxGenerationsPerHour: 100, maxGenerationsPerDay: 500, maxConcurrentGenerations: 3 });
  });

  it("allows requests within limits", () => {
    expect(control.checkLimit("c1").limited).toBe(false);
  });

  it("blocks requests exceeding concurrent limit", () => {
    control.increment("c1");
    control.increment("c2");
    control.increment("c3");
    expect(control.checkLimit("c4").limited).toBe(true);
  });

  it("tracks concurrent generations", () => {
    control.increment("c1");
    control.increment("c2");
    expect(control.checkLimit("c3").limited).toBe(false);
  });

  it("decrement releases concurrent slot", () => {
    control.increment("c1");
    control.increment("c2");
    control.increment("c3");
    control.decrement("c1");
    expect(control.checkLimit("c4").limited).toBe(false);
  });

  it("reset clears all counters", () => {
    control.increment("c1");
    control.increment("c1");
    control.reset();
    expect(control.checkLimit("c1").limited).toBe(false);
  });
});

// ==================== Retention ====================
describe("GenerationRetention", () => {
  let retention: GenerationRetention;

  beforeEach(() => { retention = new GenerationRetention(); });

  it("returns configuration", () => {
    const config = retention.getConfig();
    expect(config.maxCacheAgeMs).toBeGreaterThan(0);
  });

  it("detects expired checkpoints", () => {
    const old = new Date(Date.now() - 30 * 86400000);
    expect(retention.isCheckpointExpired(old)).toBe(true);
  });

  it("detects non-expired checkpoints", () => {
    const recent = new Date();
    expect(retention.isCheckpointExpired(recent)).toBe(false);
  });

  it("updates configuration", () => {
    retention.updateConfig({ maxCacheAgeMs: 1000 });
    expect(retention.getConfig().maxCacheAgeMs).toBe(1000);
  });

  it("shouldPruneVersions returns true above limit", () => {
    expect(retention.shouldPruneVersions(15)).toBe(true);
    expect(retention.shouldPruneVersions(5)).toBe(false);
  });
});

// ==================== Cleanup ====================
describe("GenerationCleanup", () => {
  it("runs cleanup", async () => {
    const cache = {
      get: async () => success(null),
      set: async () => success(undefined),
      invalidate: async () => success(undefined),
      invalidateByPattern: async () => success(undefined),
      exists: async () => success(false),
    };
    const retention = new GenerationRetention();
    const cleanup = new GenerationCleanup(cache as any, retention);
    const report = await cleanup.runFullCleanup();
    expect(report.totalRemoved).toBeGreaterThanOrEqual(0);
  });
});

// ==================== Recovery ====================
describe("GenerationRecovery", () => {
  let recovery: GenerationRecovery;

  beforeEach(() => {
    recovery = new GenerationRecovery(
      { findById: async () => success({ id: "gen1", status: "failed" }), update: async (g: any) => success(g) } as any,
      {} as any,
      { findByGenerationId: async () => success([]) } as any,
      { invalidateByPattern: async () => success(undefined) } as any,
      { publish: async () => success(undefined) } as any,
      { acquire: async () => success(true), release: async () => success(undefined) } as any,
      { requeue: async () => success(undefined), fail: async () => success(undefined) } as any,
    );
  });

  it("retries failed generation", async () => {
    const result = await recovery.retryFailedGeneration("gen1");
    expect(result.status).toBe("completed");
  });

  it("replays dead letter", async () => {
    const result = await recovery.replayDeadLetter("job1");
    expect(result.status).toBe("completed");
  });

  it("cancels stuck job", async () => {
    const result = await recovery.cancelStuckJob("job1");
    expect(result.status).toBe("completed");
  });

  it("recovers expired worker", async () => {
    const result = await recovery.recoverExpiredWorker("worker1");
    expect(result.status).toBe("completed");
  });

  it("clears orphan locks", async () => {
    const result = await recovery.clearOrphanLocks();
    expect(result.status).toBe("completed");
  });

  it("resumes from checkpoint", async () => {
    const result = await recovery.resumeFromCheckpoint("gen1");
    expect(result.status).toBe("completed");
  });

  it("inspects checkpoints", async () => {
    const result = await recovery.inspectCheckpoints("gen1");
    expect(result.status).toBe("completed");
  });
});

// ==================== Audit ====================
describe("GenerationAudit", () => {
  let audit: GenerationAudit;

  beforeEach(() => { audit = new GenerationAudit(); });

  it("logs audit entries", () => {
    audit.log("generate", "admin", "gen_1", { sourceUrl: "https://example.com" });
    expect(audit.getRecent()).toHaveLength(1);
  });

  it("filters by action", () => {
    audit.log("generate", "admin", "gen_1", {});
    audit.log("cancel", "admin", "gen_2", {});
    expect(audit.getEntries({ action: "generate" })).toHaveLength(1);
  });

  it("filters by actor", () => {
    audit.log("generate", "admin", "gen_1", {});
    audit.log("generate", "user", "gen_2", {});
    expect(audit.getEntries({ actor: "admin" })).toHaveLength(1);
  });

  it("limits results", () => {
    audit.log("a", "admin", "g1", {});
    audit.log("a", "admin", "g2", {});
    audit.log("a", "admin", "g3", {});
    expect(audit.getEntries({ limit: 2 })).toHaveLength(2);
  });

  it("clear removes all entries", () => {
    audit.log("generate", "admin", "gen_1", {});
    audit.clear();
    expect(audit.getRecent()).toHaveLength(0);
  });
});

// ==================== Health ====================
describe("GenerationHealth", () => {
  it("performs health check", async () => {
    const health = new GenerationHealth(
      { acquire: async () => success(true), release: async () => success(undefined) } as any,
      { get: async () => success(null) } as any,
      new GenerationRetention(),
    );
    const result = await health.check();
    expect(result.healthy).toBe(true);
    expect(result.checks.length).toBeGreaterThan(0);
  });
});

// ==================== Dashboard ====================
describe("GenerationDashboard", () => {
  it("returns admin dashboard", async () => {
    const dashboard = new GenerationDashboard(
      {} as any, {} as any, {} as any, {} as any, {} as any,
      { getQueueDepth: async () => success(5), getDeadLetters: async () => success([]) } as any,
      {} as any, {} as any,
    );
    const result = await dashboard.getAdminDashboard();
    expect(result.overview.totalGenerations).toBeGreaterThanOrEqual(0);
  });
});

// ==================== Reporting ====================
describe("GenerationReporting", () => {
  let reporting: GenerationReporting;

  beforeEach(() => { reporting = new GenerationReporting(); });

  it("generates summary report", async () => {
    const report = await reporting.generateSummaryReport("2025-01");
    expect(report.type).toBe("summary");
  });

  it("generates cost report", async () => {
    const report = await reporting.generateCostReport("2025-01");
    expect(report.type).toBe("cost");
  });

  it("generates performance report", async () => {
    const report = await reporting.generatePerformanceReport("2025-01");
    expect(report.type).toBe("performance");
  });

  it("retrieves reports by type", async () => {
    await reporting.generateSummaryReport("2025-01");
    await reporting.generateCostReport("2025-01");
    const reports = reporting.getReports("summary");
    expect(reports).toHaveLength(1);
  });
});

// ==================== Admin ====================
describe("GenerationAdmin", () => {
  let admin: GenerationAdmin;

  beforeEach(() => {
    admin = new GenerationAdmin(
      { findById: async () => success({ id: "g1" }) } as any,
      {} as any,
      { getQueueDepth: async () => success(0) } as any,
      {} as any,
      { publish: async () => success(undefined) } as any,
      { retryFailedGeneration: async () => ({ status: "completed", message: "ok" }) } as any,
      new GenerationAlerts(),
      new GenerationRateControl(),
    );
  });

  it("pauses generation", async () => {
    const result = await admin.pauseGeneration();
    expect(result.success).toBe(true);
    expect(admin.isPaused()).toBe(true);
  });

  it("resumes generation", async () => {
    await admin.pauseGeneration();
    const result = await admin.resumeGeneration();
    expect(result.success).toBe(true);
    expect(admin.isPaused()).toBe(false);
  });

  it("drains queue", async () => {
    const result = await admin.drainQueue();
    expect(result.success).toBe(true);
  });

  it("disables provider", async () => {
    const result = await admin.disableProvider("deepseek");
    expect(result.success).toBe(true);
  });

  it("force retries generation", async () => {
    const result = await admin.forceRetry("gen1");
    expect(result.success).toBe(true);
  });

  it("inspects artifacts", async () => {
    const result = await admin.inspectArtifacts("gen1");
    expect(result.success).toBe(true);
  });

  it("rolls back generation", async () => {
    const result = await admin.rollbackGeneration("gen1");
    expect(result.success).toBe(true);
  });
});
