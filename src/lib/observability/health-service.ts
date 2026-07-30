import { prisma } from "@/lib/prisma";
import { getPlatformHealth } from "@/lib/reliability/health";
import { platformTelemetry } from "@/lib/telemetry/telemetry";

export enum HealthState {
  Healthy = "healthy",
  Warning = "warning",
  Critical = "critical",
  Offline = "offline",
}

export interface ServiceHealth {
  state: HealthState;
  latencyMs: number;
  message: string;
  lastChecked: string;
}

export interface HealthReport {
  overall: HealthState;
  services: Record<string, ServiceHealth>;
  timestamp: string;
}

function toHealthState(status: "ok" | "degraded" | "error"): HealthState {
  switch (status) {
    case "ok": return HealthState.Healthy;
    case "degraded": return HealthState.Warning;
    case "error": return HealthState.Critical;
  }
}

function aggregateState(services: Record<string, ServiceHealth>): HealthState {
  const values = Object.values(services);
  if (values.some((s) => s.state === HealthState.Critical)) return HealthState.Critical;
  if (values.some((s) => s.state === HealthState.Warning)) return HealthState.Warning;
  if (values.some((s) => s.state === HealthState.Offline)) return HealthState.Offline;
  return HealthState.Healthy;
}

const DEFAULT_CHECK_TIMEOUT = 5000;

async function timeCheck<T>(fn: () => Promise<T>): Promise<{ result: T; latencyMs: number }> {
  const start = Date.now();
  const result = await fn();
  return { result, latencyMs: Date.now() - start };
}

export class HealthService {
  async checkAll(): Promise<HealthReport> {
    const platform = await getPlatformHealth();
    const services: Record<string, ServiceHealth> = {};

    for (const [name, check] of Object.entries(platform.checks)) {
      services[name] = {
        state: toHealthState(check.status),
        latencyMs: check.latencyMs,
        message: check.detail || "",
        lastChecked: platform.timestamp,
      };
    }

    const [dbHealth, storageHealth] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkStorage(),
    ]);

    if (dbHealth.status === "fulfilled") services.database = dbHealth.value;
    else services.database = { state: HealthState.Offline, latencyMs: 0, message: "Database check failed", lastChecked: new Date().toISOString() };

    if (storageHealth.status === "fulfilled") services.storage = storageHealth.value;
    else services.storage = { state: HealthState.Offline, latencyMs: 0, message: "Storage check failed", lastChecked: new Date().toISOString() };

    services.registry = await this.checkRegistry();

    const report: HealthReport = {
      overall: aggregateState(services),
      services,
      timestamp: new Date().toISOString(),
    };

    platformTelemetry.counter("health_check", 1, { overall: report.overall });
    return report;
  }

  async checkDatabase(): Promise<ServiceHealth> {
    try {
      const { latencyMs } = await timeCheck(() =>
        prisma.$queryRaw`SELECT 1` as Promise<unknown>,
      );
      return { state: HealthState.Healthy, latencyMs, message: "Database responsive", lastChecked: new Date().toISOString() };
    } catch {
      return { state: HealthState.Critical, latencyMs: 0, message: "Database unreachable", lastChecked: new Date().toISOString() };
    }
  }

  async checkStorage(): Promise<ServiceHealth> {
    try {
      const { latencyMs } = await timeCheck(() =>
        prisma.tenant.count({ take: 1 }),
      );
      return { state: HealthState.Healthy, latencyMs, message: "Storage accessible", lastChecked: new Date().toISOString() };
    } catch {
      return { state: HealthState.Warning, latencyMs: 0, message: "Storage check unavailable", lastChecked: new Date().toISOString() };
    }
  }

  async checkRegistry(): Promise<ServiceHealth> {
    try {
      const { latencyMs } = await timeCheck(() =>
        prisma.billingPlan.findFirst({ select: { id: true } }),
      );
      return { state: HealthState.Healthy, latencyMs, message: "Registry accessible", lastChecked: new Date().toISOString() };
    } catch {
      return { state: HealthState.Critical, latencyMs: 0, message: "Registry unreachable", lastChecked: new Date().toISOString() };
    }
  }

  async quickHealth(): Promise<{ healthy: boolean; state: HealthState }> {
    const db = await this.checkDatabase();
    if (db.state === HealthState.Critical) {
      return { healthy: false, state: HealthState.Critical };
    }
    return { healthy: true, state: HealthState.Healthy };
  }
}

export const healthService = new HealthService();
