import type { GenerationId, GenerationResult } from "@/lib/generation/contracts";
import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact } from "@/lib/generation/artifacts/types";
import type { ArtifactType } from "@/lib/generation/artifacts/types";

export interface IntegrationConfig {
  generationId: GenerationId;
  creatorId: string;
  sourceUrl: string;
  strategy: string;
  mode: string;
}

export interface PipelineResult {
  generationResult: GenerationResult;
  knowledgeGraph: KnowledgeGraph | null;
  blueprint: WebsiteBlueprint | null;
  artifacts: Artifact[];
  provisioned: boolean;
  snapshotId: string | null;
  storefrontUrl: string | null;
  version: number;
}

export interface WebsiteRecord {
  id: string;
  title: string;
  domain: string;
  locale: string;
  currency: string;
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  navigation: Record<string, unknown>;
  status: string;
  version: number;
}

export interface BuilderInitResult {
  websiteId: string;
  blocks: number;
  layout: string;
  version: number;
  createdAt: string;
}

export interface PublishSnapshotResult {
  snapshotId: string;
  version: number;
  artifactCount: number;
  checksum: string;
  createdAt: string;
}

export interface StorefrontRenderResult {
  website: Record<string, unknown>;
  navigation: Record<string, unknown>;
  sections: Array<Record<string, unknown>>;
  theme: Record<string, unknown>;
  seo: Record<string, unknown>;
  products: Array<Record<string, unknown>>;
  gallery: Record<string, unknown>;
  feed: Record<string, unknown>;
  metadata: Record<string, unknown>;
  renderedAt: string;
}

export interface VersionEntry {
  version: number;
  generationId: string;
  blueprintChecksum: string;
  artifactChecksums: Record<ArtifactType, string>;
  snapshotId: string | null;
  createdAt: string;
  reason: string;
}
