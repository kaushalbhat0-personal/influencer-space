import type { AIProvider, AIProviderFactory } from "@/lib/generation/contracts";

interface ProviderEntry {
  provider: AIProvider;
  healthy: boolean;
  lastChecked: number;
}

export class ProviderRegistry implements AIProviderFactory {
  private providers = new Map<string, ProviderEntry>();

  register(name: string, provider: AIProvider): void {
    if (this.providers.has(name)) throw new Error(`Provider already registered: ${name}`);
    this.providers.set(name, { provider, healthy: true, lastChecked: Date.now() });
  }

  unregister(name: string): void {
    this.providers.delete(name);
  }

  get(name: string): AIProvider | undefined {
    return this.providers.get(name)?.provider;
  }

  create(name: string): AIProvider {
    const entry = this.providers.get(name);
    if (!entry) throw new Error(`Unknown AI provider: ${name}`);
    return entry.provider;
  }

  getDefault(): AIProvider {
    const first = this.providers.values().next().value;
    if (!first) throw new Error("No AI providers registered");
    return first.provider;
  }

  list(): string[] {
    return Array.from(this.providers.keys());
  }

  async checkAll(): Promise<Record<string, boolean>> {
    const results: Record<string, boolean> = {};
    for (const [name, entry] of Array.from(this.providers)) {
      try {
        const health = await entry.provider.health();
        entry.healthy = health.success && health.data.ok;
        entry.lastChecked = Date.now();
      } catch {
        entry.healthy = false;
      }
      results[name] = entry.healthy;
    }
    return results;
  }

  isHealthy(name: string): boolean {
    return this.providers.get(name)?.healthy ?? false;
  }
}
