import type { LockProvider, GenerationCache } from "@/lib/generation/contracts";
import type { GenerationRetention } from "./generation-retention";

export interface HealthStatus {
  healthy: boolean;
  checks: HealthCheck[];
  uptime: number;
  lastCheck: string;
}

export interface HealthCheck {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  message: string;
  latencyMs: number;
}

export class GenerationHealth {
  private startTime = Date.now();

  constructor(
    private lockProvider: LockProvider,
    private cache: GenerationCache,
    private retention: GenerationRetention,
  ) {}

  async check(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    checks.push(await this.checkCache());
    checks.push(await this.checkLock());
    checks.push(this.checkUptime());
    checks.push(this.checkRetention());

    const hasUnhealthy = checks.some((c) => c.status === "unhealthy");

    return {
      healthy: !hasUnhealthy,
      checks,
      uptime: Date.now() - this.startTime,
      lastCheck: new Date().toISOString(),
    };
  }

  private async checkCache(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.cache.get("health_check");
      return { name: "generation_cache", status: "healthy", message: "Cache is responsive", latencyMs: Date.now() - start };
    } catch {
      return { name: "generation_cache", status: "degraded", message: "Cache is not responding", latencyMs: Date.now() - start };
    }
  }

  private async checkLock(): Promise<HealthCheck> {
    const start = Date.now();
    try {
      await this.lockProvider.acquire("health_check", 1000);
      await this.lockProvider.release("health_check");
      return { name: "lock_provider", status: "healthy", message: "Lock provider is responsive", latencyMs: Date.now() - start };
    } catch {
      return { name: "lock_provider", status: "unhealthy", message: "Lock provider is not responding", latencyMs: Date.now() - start };
    }
  }

  private checkUptime(): HealthCheck {
    const uptime = Date.now() - this.startTime;
    return {
      name: "generation_engine",
      status: uptime > 0 ? "healthy" : "degraded",
      message: `Engine running for ${Math.floor(uptime / 1000)}s`,
      latencyMs: 0,
    };
  }

  private checkRetention(): HealthCheck {
    const config = this.retention.getConfig();
    return {
      name: "retention_policy",
      status: config.maxCacheAgeMs > 0 ? "healthy" : "degraded",
      message: `Retention policy active (cache: ${config.maxCacheAgeMs}ms)`,
      latencyMs: 0,
    };
  }
}
