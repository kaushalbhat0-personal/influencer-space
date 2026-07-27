export type GenerationId = string & { readonly __brand: "GenerationId" };
export type ArtifactId = string & { readonly __brand: "ArtifactId" };
export type JobId = string & { readonly __brand: "JobId" };
export type StageId = string & { readonly __brand: "StageId" };
export type CreatorId = string & { readonly __brand: "CreatorId" };

export function createGenerationId(): GenerationId {
  return crypto.randomUUID() as GenerationId;
}

export function createArtifactId(): ArtifactId {
  return crypto.randomUUID() as ArtifactId;
}

export function createJobId(): JobId {
  return crypto.randomUUID() as JobId;
}

export function createStageId(): StageId {
  return crypto.randomUUID() as StageId;
}
