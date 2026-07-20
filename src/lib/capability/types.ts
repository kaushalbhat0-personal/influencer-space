import type { SemVer } from "@/lib/theme/types";
import type { DomainId } from "@/lib/module/types";

export type CapabilityId = string;

export type CapabilityStatus = "draft" | "published" | "deprecated" | "archived";

export type CapabilityCategory = "core" | "integration" | "business" | "infrastructure";

export interface CapabilityContract {
  id: CapabilityId;
  name: string;
  version: SemVer;
  domain: DomainId;
  description: string;
  category: CapabilityCategory;
  interfaceMethods: string[];
  events: { published: string[]; subscribed: string[] };
  dependencies: { capabilityId: CapabilityId; minVersion?: SemVer }[];
  config: Record<string, unknown>;
}

export interface CapabilityEntry {
  contract: CapabilityContract;
  status: CapabilityStatus;
  registeredAt: string;
  enabled: boolean;
  metadata: Record<string, unknown>;
}

export interface CapabilityQuery {
  domain?: DomainId;
  status?: CapabilityStatus;
  category?: CapabilityCategory;
  enabled?: boolean;
}

export interface CapabilityDependency {
  capabilityId: CapabilityId;
  requiredBy: CapabilityId;
  minVersion?: SemVer;
  satisfied: boolean;
}

export interface CapabilityDiagnostics {
  total: number;
  enabled: number;
  byDomain: Record<string, number>;
  byCategory: Record<string, number>;
  dependencyGraph: CapabilityDependency[];
  warnings: string[];
}

export interface CapabilityProvider {
  id: string;
  capabilityId: CapabilityId;
  name: string;
  version: SemVer;
  priority: number;
  enabled: boolean;
  healthy: boolean;
  healthCheck: () => Promise<boolean>;
  metadata: Record<string, unknown>;
}
