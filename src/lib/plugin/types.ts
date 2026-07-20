export type PluginPermission = "read:tenant" | "read:products" | "read:orders" | "write:email" | "subscribe:events" | "publish:events" | "read:analytics" | "write:webhook";

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  author: { name: string; url?: string };
  permissions: PluginPermission[];
  resources: { maxMemory: number; maxCpu: number; maxDuration: number; maxRequests: number };
  hooks: string[];
  events: string[];
  config: Record<string, unknown>;
}

export interface SandboxConfig { maxMemory: number; maxCpu: number; maxDuration: number; allowNetwork: boolean; allowFS: boolean; env: Record<string, string>; }
export interface ExecutionContext { pluginId: string; tenantId: string; permissions: Set<PluginPermission>; resources: { memoryUsed: number; cpuTime: number; startTime: number }; config: Record<string, unknown>; }
export interface SandboxResult { success: boolean; output: unknown; error: string | null; metrics: { memoryUsed: number; cpuTimeMs: number; durationMs: number }; }
export interface SandboxDiagnostics { totalPlugins: number; activePlugins: number; totalExecutions: number; failedExecutions: number; avgDurationMs: number; memoryPeak: number; }
