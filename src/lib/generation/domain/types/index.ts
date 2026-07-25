import type { GenerationId, ArtifactId, JobId, CreatorId } from "./ids";
import type {
  GenerationStatus, StageStatus, GenerationPriority, GenerationMode,
  PipelineStage, StrategyType, JobStatus,
} from "./enums";

export interface Generation {
  id: GenerationId;
  creatorId: CreatorId;
  sourceUrl: string;
  strategy: StrategyType;
  mode: GenerationMode;
  status: GenerationStatus;
  pipeline: PipelineDefinition;
  context: Record<string, unknown>;
  result: GenerationResult | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerationRequest {
  sourceUrl: string;
  creatorId: CreatorId;
  idempotencyKey: string;
  strategy: StrategyType;
  mode: GenerationMode;
  options?: GenerationOptions;
}

export interface GenerationOptions {
  partial: boolean;
  sections?: PipelineStage[];
  forceAI: boolean;
  skipAI: boolean;
  forceTheme?: string;
  cacheTTL?: number;
}

export interface ResolvedSource {
  platform: string;
  identifier: string;
  normalizedUrl: string;
  confidence: number;
}

export interface CreatorProfile {
  name: string;
  username: string;
  bio: string;
  niche: string;
}

export interface GenerationResult {
  generationId: GenerationId;
  status: GenerationStatus;
  version: number;
  snapshotId: string | null;
  storefrontUrl: string | null;
  artifacts: ArtifactSummary[];
  cost: GenerationCostData;
  durationMs: number;
  stages: StageResultRow[];
  error: string | null;
}

export interface ArtifactSummary {
  artifactId: ArtifactId;
  type: string;
  source: string;
  aiCost: number;
  cached: boolean;
}

export interface GenerationCostData {
  total: number;
  aiCalls: number;
  tokensUsed: number;
}

export interface StageResultRow {
  stage: PipelineStage;
  status: StageStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  retryCount: number;
}

export interface GenerationJob {
  id: JobId;
  generationId: GenerationId;
  queue: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  priority: GenerationPriority;
  scheduledAt: Date;
  startedAt: Date | null;
  completedAt: Date | null;
  error: string | null;
  workerId: string | null;
  checkpoint: Record<string, unknown> | null;
}

export interface GenerationArtifact {
  id: ArtifactId;
  generationId: GenerationId;
  parentId: ArtifactId | null;
  type: string;
  stage: PipelineStage;
  data: Record<string, unknown>;
  source: string;
  aiCost: number;
  cached: boolean;
  version: number;
  promptVersion: string | null;
  createdAt: Date;
}

export interface PipelineDefinition {
  stages: StageDefRow[];
}

export interface StageDefRow {
  type: PipelineStage;
  inputs: string[];
  outputs: string[];
  optional: boolean;
  supportsDeterministic: boolean;
  supportsAI: boolean;
  supportsCache: boolean;
}

export interface StageInputRow {
  stage: PipelineStage;
  dependencies: PipelineStage[];
}

export interface GenerationMetrics {
  generationId: GenerationId;
  activeGenerations: number;
  queueDepth: number;
  aiCostTotal: number;
  cacheHitRate: number;
  stageDurations: Record<string, number>;
  errorsByStage: Record<string, number>;
}

export interface CheckpointRow {
  stageId: string;
  status: string;
  output: Record<string, unknown>;
}
