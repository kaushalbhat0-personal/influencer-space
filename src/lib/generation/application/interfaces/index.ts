import type { AsyncResult } from "@/lib/generation/domain/types/utility";
import type {
  GenerationId, CreatorId, JobId,
} from "@/lib/generation/domain/types/ids";
import type {
  Generation, GenerationRequest, GenerationResult, GenerationJob,
  GenerationArtifact, CheckpointRow,
} from "@/lib/generation/domain/types/index";
import type {
  PipelineStage, StrategyType, GenerationMode, StageStatus,
} from "@/lib/generation/domain/types/enums";
import type {
  GenerationCost, GenerationBudget,
  GenerationProgress,
} from "@/lib/generation/domain/value-objects/index";

export interface GenerationContext {
  source: Record<string, unknown> | null;
  profile: Record<string, unknown> | null;
  strategy: StrategyType;
  options: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface PipelineRunner {
  execute(pipeline: PipelineStageDef[], context: GenerationContext, checkpoints?: CheckpointRow[]): AsyncResult<StageResult[]>;
}

export interface PipelineStageDef {
  readonly type: PipelineStage;
  readonly supportsDeterministic: boolean;
  readonly supportsAI: boolean;
  readonly supportsCache: boolean;
  readonly inputs: string[];
  readonly outputs: string[];

  execute(inputs: Record<string, unknown>, context: GenerationContext): AsyncResult<Record<string, unknown>>;
  canExecute(inputs: Record<string, unknown>): boolean;
}

export interface StageResult {
  stage: PipelineStage;
  status: StageStatus;
  progress: number;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
  retryCount: number;
}

export interface StageRegistry {
  register(stage: PipelineStageDef): void;
  unregister(type: PipelineStage): void;
  get(type: PipelineStage): PipelineStageDef | undefined;
  getAll(): PipelineStageDef[];
}

export interface QueueAdapter {
  enqueue(job: GenerationJob): AsyncResult<JobId>;
  dequeue(queue: string, workerId: string): AsyncResult<GenerationJob | null>;
  complete(jobId: JobId): AsyncResult<void>;
  fail(jobId: JobId, error: string): AsyncResult<void>;
  progress(jobId: JobId, progress: number): AsyncResult<void>;
  getStatus(jobId: JobId): AsyncResult<string>;
  getDeadLetters(queue: string): AsyncResult<GenerationJob[]>;
  requeue(jobId: JobId): AsyncResult<void>;
  getQueueDepth(queue: string): AsyncResult<number>;
}

export interface GenerationCache {
  get<T>(key: string): AsyncResult<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): AsyncResult<void>;
  invalidate(key: string): AsyncResult<void>;
  invalidateByPattern(pattern: string): AsyncResult<void>;
  exists(key: string): AsyncResult<boolean>;
}

export interface GenerationStrategy {
  readonly type: StrategyType;
  readonly allowsAI: boolean;
  readonly maxRegenerationsPerDay: number;
  readonly maxAICallsPerGeneration: number;
  readonly cacheTTL: number;
  readonly parallelStages: boolean;
  readonly budget: { dailyAiCost: number; monthlyAiCost: number };

  canRegenerate(regenerationsToday: number): boolean;
  canUseAI(aiCallsUsed: number): boolean;
}

export interface StrategyFactory {
  register(type: StrategyType, factory: () => GenerationStrategy): void;
  create(type: StrategyType): GenerationStrategy;
}

export interface AIPrompt {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  responseFormat?: "text" | "json_object";
}

export interface AIOptions {
  model?: string;
  maxTokens?: number;
  temperature?: number;
  cacheKey?: string;
  cacheTTL?: number;
}

export interface AIResponse {
  content: string;
  model: string;
  latencyMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
  cost: number;
  cached: boolean;
}

export interface AIProvider {
  readonly name: string;
  readonly supportsStreaming: boolean;
  readonly supportsJsonMode: boolean;

  generate(prompt: AIPrompt, options?: AIOptions): AsyncResult<AIResponse>;
  estimateCost(prompt: AIPrompt): number;
  health(): AsyncResult<{ ok: boolean; latencyMs: number }>;
}

export interface AIProviderFactory {
  register(name: string, provider: AIProvider): void;
  create(name: string): AIProvider;
  getDefault(): AIProvider;
  list(): string[];
}

export interface BudgetManager {
  canSpend(amount: number, creatorId: CreatorId): AsyncResult<boolean>;
  reserve(amount: number, creatorId: CreatorId): AsyncResult<void>;
  release(amount: number, creatorId: CreatorId): AsyncResult<void>;
  getRemaining(creatorId: CreatorId): AsyncResult<number>;
  getSystemBudget(): AsyncResult<number>;
}

export interface CostTracker {
  record(cost: GenerationCost, generationId: GenerationId): AsyncResult<void>;
  getGenerationCost(generationId: GenerationId): AsyncResult<GenerationCost>;
  getCreatorCost(creatorId: CreatorId): AsyncResult<GenerationCost>;
  getTotalCost(): AsyncResult<GenerationCost>;
}

export interface LockProvider {
  acquire(resource: string, ttlMs?: number): AsyncResult<boolean>;
  release(resource: string): AsyncResult<void>;
  isLocked(resource: string): AsyncResult<boolean>;
}

export interface EventPublisher {
  publish(eventType: string, payload: Record<string, unknown>): AsyncResult<void>;
}

export interface MetricsCollector {
  increment(counter: string, value?: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  gauge(metric: string, value: number): void;
}

export interface PromptDefinition {
  system: string;
  template: string;
  version: string;
  createdAt: string;
}

export interface PromptRegistry {
  get(name: string): PromptDefinition | null;
  register(name: string, prompt: PromptDefinition): void;
  getAll(): Map<string, PromptDefinition>;
}

export interface GenerationOrchestrator {
  generate(request: GenerationRequest): AsyncResult<GenerationResult>;
  cancel(generationId: GenerationId): AsyncResult<void>;
  getStatus(generationId: GenerationId): AsyncResult<string>;
  getResult(generationId: GenerationId): AsyncResult<GenerationResult | null>;
  getProgress(generationId: GenerationId): AsyncResult<GenerationProgress | null>;
}
