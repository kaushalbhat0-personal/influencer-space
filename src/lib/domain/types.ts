import type { DomainId } from "@/lib/module/types";

export interface DomainContract {
  id: DomainId;
  name: string;
  description: string;
  version: string;
  responsibilities: string[];
  antiResponsibilities: string[];
  dependencies: DomainId[];
  events: { published: string[]; subscribed: string[] };
  capabilities: string[];
  modules: string[];
  metadata: Record<string, unknown>;
}

export interface DomainEntry {
  contract: DomainContract;
  registeredAt: string;
  metadata: Record<string, unknown>;
}

export interface DomainDependency {
  from: DomainId;
  to: DomainId;
  valid: boolean;
}

export interface DomainDiagnostics {
  total: number;
  dependencies: DomainDependency[];
  circularReferences: DomainId[][];
  orphanDomains: DomainId[];
  warnings: string[];
}
