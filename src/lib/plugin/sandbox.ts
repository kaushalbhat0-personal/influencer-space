import type { PluginManifest, PluginPermission, ExecutionContext, SandboxConfig, SandboxResult, SandboxDiagnostics } from "./types";

export class PluginSandbox {
  private manifests = new Map<string, PluginManifest>();
  private executions = 0;
  private failures = 0;
  private totalDuration = 0;
  private memoryPeak = 0;

  register(manifest: PluginManifest): { success: boolean; error?: string } {
    if (this.manifests.has(manifest.id)) return { success: false, error: `Plugin "${manifest.id}" already registered` };
    if (!manifest.id || manifest.permissions.length === 0) return { success: false, error: "Plugin ID and at least one permission are required" };
    this.manifests.set(manifest.id, manifest);
    return { success: true };
  }

  unregister(id: string): boolean { return this.manifests.delete(id); }
  get(id: string): PluginManifest | null { return this.manifests.get(id) ?? null; }
  list(): PluginManifest[] { return Array.from(this.manifests.values()); }

  hasPermission(pluginId: string, permission: PluginPermission): boolean {
    const manifest = this.manifests.get(pluginId);
    return !!manifest && manifest.permissions.includes(permission);
  }

  createContext(pluginId: string, tenantId: string, config: Record<string, unknown> = {}): ExecutionContext | null {
    const manifest = this.manifests.get(pluginId);
    if (!manifest) return null;
    return { pluginId, tenantId, permissions: new Set(manifest.permissions), resources: { memoryUsed: 0, cpuTime: 0, startTime: performance.now() }, config };
  }

  async execute(_ctx: ExecutionContext, fn: () => Promise<unknown>, limits?: Partial<SandboxConfig>): Promise<SandboxResult> {
    const start = performance.now();
    this.executions++;
    try {
      const output = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Plugin execution timeout")), limits?.maxDuration ?? 30000)),
      ]);
      const duration = performance.now() - start;
      this.totalDuration += duration;
      return { success: true, output, error: null, metrics: { memoryUsed: 0, cpuTimeMs: 0, durationMs: Math.round(duration) } };
    } catch (err) {
      this.failures++;
      return { success: false, output: null, error: err instanceof Error ? err.message : String(err), metrics: { memoryUsed: 0, cpuTimeMs: 0, durationMs: Math.round(performance.now() - start) } };
    }
  }

  diagnostics(): SandboxDiagnostics {
    return { totalPlugins: this.manifests.size, activePlugins: this.manifests.size, totalExecutions: this.executions, failedExecutions: this.failures, avgDurationMs: this.executions > 0 ? Math.round(this.totalDuration / this.executions) : 0, memoryPeak: this.memoryPeak };
  }

  get size(): number { return this.manifests.size; }
}

export const pluginSandbox = new PluginSandbox();
