import type { PreviewProvider } from "./types";

interface ProviderEntry {
  provider: PreviewProvider;
  priority: number;
}

export class PreviewEngine {
  private providers = new Map<string, ProviderEntry>();

  register(provider: PreviewProvider, priority = 10): void {
    this.providers.set(provider.type, { provider, priority });
  }

  unregister(type: string): boolean {
    return this.providers.delete(type);
  }

  get(type: string): PreviewProvider | undefined {
    return this.providers.get(type)?.provider;
  }

  getAll(): PreviewProvider[] {
    return Array.from(this.providers.values())
      .sort((a, b) => a.priority - b.priority)
      .map((e) => e.provider);
  }
}

export const previewEngine = new PreviewEngine();
