export const GENERATION_STATUSES = [
  "idle", "queued", "running", "paused", "retrying",
  "completed", "cancelled", "failed", "published", "archived",
] as const;
export type GenerationStatus = (typeof GENERATION_STATUSES)[number];

export const STAGE_STATUSES = [
  "pending", "running", "completed", "skipped", "failed",
] as const;
export type StageStatus = (typeof STAGE_STATUSES)[number];

export const ARTIFACT_SOURCES = ["deterministic", "ai", "manual"] as const;
export type ArtifactSource = (typeof ARTIFACT_SOURCES)[number];

export const GENERATION_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type GenerationPriority = (typeof GENERATION_PRIORITIES)[number];

export const GENERATION_MODES = [
  "full", "partial", "regenerate", "scheduled", "batch",
] as const;
export type GenerationMode = (typeof GENERATION_MODES)[number];

export const PIPELINE_STAGES = [
  "source_resolution",
  "profile_extraction",
  "intelligence_analysis",
  "theme_selection",
  "content_generation",
  "seo_generation",
  "section_composition",
  "website_composition",
  "provisioning",
  "snapshot_creation",
  "publishing",
  "analytics_tracking",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export const STRATEGY_TYPES = ["free", "pro", "elite", "agency", "batch"] as const;
export type StrategyType = (typeof STRATEGY_TYPES)[number];

export const JOB_STATUSES = [
  "queued", "running", "completed", "failed", "cancelled",
] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];
