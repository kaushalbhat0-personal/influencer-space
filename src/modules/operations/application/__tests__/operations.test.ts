import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  findFirst: vi.fn(),
  create: vi.fn(),
  findMany: vi.fn(),
  count: vi.fn(),
  groupBy: vi.fn(),
  findUnique: vi.fn(),
  update: vi.fn(),
  checkAll: vi.fn(),
  logAction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alertRecord: {
      findFirst: h.findFirst,
      create: h.create,
      findMany: h.findMany,
      count: h.count,
      groupBy: h.groupBy,
      findUnique: h.findUnique,
      update: h.update,
    },
    jobRecord: {
      create: h.create,
      update: h.update,
      findMany: h.findMany,
      count: h.count,
      findUnique: h.findUnique,
    },
    billingEvent: { count: h.count },
  },
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/observability/health-service", () => ({
  healthService: { checkAll: h.checkAll },
  HealthState: { Healthy: "healthy", Warning: "warning", Critical: "critical", Offline: "offline" },
}));

import { AlertStore } from "@/modules/operations/application/alert-store";
import { PersistedJobRuntime } from "@/modules/operations/application/job-runtime";

const alertStore = new AlertStore();
const jobRuntime = new PersistedJobRuntime();

beforeEach(() => {
  h.findFirst.mockReset();
  h.create.mockReset();
  h.findMany.mockReset();
  h.count.mockReset();
  h.groupBy.mockReset();
  h.findUnique.mockReset();
  h.update.mockReset();
  h.checkAll.mockReset();
  h.logAction.mockReset();

  h.findFirst.mockResolvedValue(null);
  h.create.mockResolvedValue({ id: "alert1" });
  h.findMany.mockResolvedValue([]);
  h.count.mockResolvedValue(0);
  h.groupBy.mockResolvedValue([]);
  h.findUnique.mockResolvedValue({ id: "x", tenantId: null, title: "t", resolvedAt: null, dismissedAt: null, acknowledgedBy: null });
  h.update.mockResolvedValue({});
  h.logAction.mockResolvedValue(undefined);
  h.checkAll.mockResolvedValue({ overall: "healthy", services: {}, timestamp: new Date().toISOString() });
});

describe("AlertStore (durable alerts)", () => {
  it("creates an alert when none exists in the dedupe window", async () => {
    const result = await alertStore.create({ level: "WARNING", title: "DB degraded", source: "health", service: "database" });
    expect(result.created).toBe(true);
    expect(h.create).toHaveBeenCalled();
  });

  it("dedupes identical active alerts within the window", async () => {
    h.findFirst.mockResolvedValue({ id: "existing" });
    const result = await alertStore.create({ level: "CRITICAL", title: "DB down", source: "health", service: "database" });
    expect(result.created).toBe(false);
    expect(result.id).toBe("existing");
    expect(h.create).not.toHaveBeenCalled();
  });

  it("setStatus transitions to RESOLVED and audits", async () => {
    const result = await alertStore.setStatus("alert1", "RESOLVED", "admin@x");
    expect(result.success).toBe(true);
    expect(h.update).toHaveBeenCalled();
    const arg = h.update.mock.calls[0]?.[0] as { where?: { id?: string }; data?: Record<string, unknown> };
    expect(arg?.where?.id).toBe("alert1");
    expect(arg?.data?.status).toBe("RESOLVED");
    expect(arg?.data?.acknowledgedBy).toBe("admin@x");
  });

  it("syncFromRuntime creates real alerts only for unhealthy services + failures", async () => {
    h.checkAll.mockResolvedValue({
      overall: "warning",
      services: {
        database: { state: "healthy", latencyMs: 2, message: "ok", lastChecked: new Date().toISOString() },
        registry: { state: "critical", latencyMs: 5000, message: "unreachable", lastChecked: new Date().toISOString() },
      },
      timestamp: new Date().toISOString(),
    });
    h.create.mockResolvedValueOnce({ id: "a1" }).mockResolvedValueOnce({ id: "a2" });
    const result = await alertStore.syncFromRuntime("admin");
    expect(result.created).toBeGreaterThan(0);
    expect(h.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ source: "health", service: "registry", level: "CRITICAL" }) }));
  });
});

describe("PersistedJobRuntime (durable jobs)", () => {
  it("records a started run and finishes it", async () => {
    h.create.mockResolvedValueOnce({ id: "run1" });
    const id = await jobRuntime.recordStarted({ type: "cron", name: "Cleanup" });
    expect(id).toBe("run1");
    await jobRuntime.recordFinished("run1", true);
    expect(h.update).toHaveBeenCalledWith({ where: { id: "run1" }, data: expect.objectContaining({ status: "SUCCEEDED", finishedAt: expect.any(Date) }) });
  });
  it("records failed runs with error", async () => {
    h.create.mockResolvedValueOnce({ id: "run2" });
    const id = await jobRuntime.recordStarted({ type: "cron", name: "Sync" });
    await jobRuntime.recordFinished(id, false, "boom");
    expect(h.update).toHaveBeenCalledWith({ where: { id: "run2" }, data: expect.objectContaining({ status: "FAILED", error: "boom" }) });
  });

  it("requeues a failed run with incremented attempts", async () => {
    h.findUnique.mockResolvedValue({ id: "r", status: "FAILED", attempts: 1, tenantId: null, title: null, resolvedAt: null, dismissedAt: null, acknowledgedBy: null });
    const result = await jobRuntime.requeue("r");
    expect(result.success).toBe(true);
    expect(h.update).toHaveBeenCalledWith({ where: { id: "r" }, data: expect.objectContaining({ status: "QUEUED", attempts: 2 }) });
  });

  it("refuses to cancel a succeeded run", async () => {
    h.findUnique.mockResolvedValue({ id: "r", status: "SUCCEEDED", tenantId: null, title: null, resolvedAt: null, dismissedAt: null, acknowledgedBy: null });
    const result = await jobRuntime.cancel("r");
    expect(result.success).toBe(false);
  });
});
