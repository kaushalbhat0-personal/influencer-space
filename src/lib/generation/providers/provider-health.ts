import type { AIProvider } from "@/lib/generation/contracts";
import type { ProviderStats } from "./shared/provider-types";

interface HealthEntry {
  latencyMs: number;
  available: boolean;
  lastSuccess: number | null;
  lastFailure: number | null;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  failures: number;
}

export class ProviderHealthTracker {
  private entries = new Map<string, HealthEntry>();

  recordSuccess(providerName: string, latencyMs: number, tokens: number, cost: number): void {
    const entry = this.getOrCreate(providerName);
    entry.latencyMs = latencyMs;
    entry.available = true;
    entry.lastSuccess = Date.now();
    entry.totalRequests++;
    entry.totalTokens += tokens;
    entry.totalCost += cost;
  }

  recordFailure(providerName: string): void {
    const entry = this.getOrCreate(providerName);
    entry.available = false;
    entry.lastFailure = Date.now();
    entry.totalRequests++;
    entry.failures++;
  }

  getStats(providerName: string): ProviderStats | null {
    const entry = this.entries.get(providerName);
    if (!entry) return null;
    const name = providerName;
    return {
      name,
      model: "",
      available: entry.available,
      healthy: entry.available && entry.failures < 3,
      latencyMs: entry.latencyMs,
      lastSuccess: entry.lastSuccess,
      lastFailure: entry.lastFailure,
      totalRequests: entry.totalRequests,
      totalTokens: entry.totalTokens,
      totalCost: entry.totalCost,
      failures: entry.failures,
      failureRate: entry.totalRequests > 0 ? entry.failures / entry.totalRequests : 0,
    };
  }

  getAllStats(): ProviderStats[] {
    return Array.from(this.entries.keys())
      .map((name) => this.getStats(name))
      .filter((s): s is ProviderStats => s !== null);
  }

  isAvailable(providerName: string): boolean {
    return this.entries.get(providerName)?.available ?? true;
  }

  async refreshHealth(provider: AIProvider): Promise<void> {
    const start = Date.now();
    try {
      const result = await provider.health();
      const latencyMs = Date.now() - start;
      if (result.success && result.data.ok) {
        this.recordSuccess(provider.name, latencyMs, 0, 0);
      } else {
        this.recordFailure(provider.name);
      }
    } catch {
      this.recordFailure(provider.name);
    }
  }

  reset(providerName?: string): void {
    if (providerName) {
      this.entries.delete(providerName);
    } else {
      this.entries.clear();
    }
  }

  private getOrCreate(providerName: string): HealthEntry {
    let entry = this.entries.get(providerName);
    if (!entry) {
      entry = {
        latencyMs: 0,
        available: true,
        lastSuccess: null,
        lastFailure: null,
        totalRequests: 0,
        totalTokens: 0,
        totalCost: 0,
        failures: 0,
      };
      this.entries.set(providerName, entry);
    }
    return entry;
  }
}
