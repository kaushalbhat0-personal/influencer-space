export const INTEGRATION_EVENTS = {
  GENERATION_INTEGRATED: "generation.integrated",
  WEBSITE_PROVISIONED: "website.provisioned",
  BUILDER_INITIALIZED: "builder.initialized",
  SNAPSHOT_CREATED: "snapshot.created",
  STOREFRONT_UPDATED: "storefront.updated",
  GENERATION_REGENERATED: "generation.regenerated",
  GENERATION_ROLLBACK: "generation.rollback",
} as const;

export interface GenerationIntegratedPayload {
  generationId: string;
  creatorId: string;
  sourceUrl: string;
  blueprintVersion: number;
  artifactCount: number;
  timestamp: string;
}

export interface WebsiteProvisionedPayload {
  websiteId: string;
  title: string;
  domain: string;
  version: number;
  timestamp: string;
}

export interface BuilderInitializedPayload {
  websiteId: string;
  blocks: number;
  layout: string;
  version: number;
  timestamp: string;
}

export interface SnapshotCreatedPayload {
  snapshotId: string;
  version: number;
  artifactCount: number;
  checksum: string;
  timestamp: string;
}

export interface StorefrontUpdatedPayload {
  websiteId: string;
  sections: number;
  products: number;
  version: number;
  timestamp: string;
}

export interface GenerationRegeneratedPayload {
  generationId: string;
  previousVersion: number;
  newVersion: number;
  timestamp: string;
}

export interface GenerationRollbackPayload {
  generationId: string;
  fromVersion: number;
  toVersion: number;
  timestamp: string;
}
