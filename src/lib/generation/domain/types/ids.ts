export type GenerationId = string & { readonly __brand: "GenerationId" };
export type ArtifactId = string & { readonly __brand: "ArtifactId" };
export type JobId = string & { readonly __brand: "JobId" };
export type StageId = string & { readonly __brand: "StageId" };
export type CreatorId = string & { readonly __brand: "CreatorId" };

export function createGenerationId(): GenerationId {
  return `gen_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as GenerationId;
}

export function createArtifactId(): ArtifactId {
  return `art_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as ArtifactId;
}

export function createJobId(): JobId {
  return `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as JobId;
}

export function createStageId(): StageId {
  return `stg_${Date.now()}_${crypto.randomUUID().slice(0, 8)}` as StageId;
}
