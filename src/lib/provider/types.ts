import type { SemVer } from "@/lib/theme/types";

export type ProviderId = string;
export type ProviderType = "payment" | "storage" | "email" | "ai" | "social" | "domain" | "analytics" | "search" | "sms" | "push";

export interface ProviderContract {
  id: ProviderId;
  type: ProviderType;
  name: string;
  version: SemVer;
  description: string;
  methods: string[];
}

export interface ProviderEntry {
  contract: ProviderContract;
  priority: number;
  enabled: boolean;
  healthy: boolean;
  registeredAt: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
  healthCheck: () => Promise<boolean>;
}

export interface ProviderHealthResult {
  providerId: ProviderId;
  healthy: boolean;
  latency: number;
  error: string | null;
}

export interface ProviderDiagnostics {
  total: number;
  enabled: number;
  healthy: number;
  byType: Record<string, number>;
  health: ProviderHealthResult[];
}

export interface ProviderSelector {
  select(type: ProviderType, tenantId: string): ProviderEntry | null;
  getAlternatives(type: ProviderType, excludeId: ProviderId): ProviderEntry[];
}
