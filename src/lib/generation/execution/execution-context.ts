import type { GenerationContext } from "@/lib/generation/contracts";
import type { GenerationCache, LockProvider, GenerationStrategy } from "@/lib/generation/contracts";
import type { MetricsCollector, EventPublisher } from "@/lib/generation/contracts";
import type { CheckpointManager } from "./checkpoint-manager";
import type { ArtifactManager } from "./artifact-manager";

export interface PipelineLogger {
  info(msg: string, meta?: Record<string, unknown>): void;
  warn(msg: string, meta?: Record<string, unknown>): void;
  error(msg: string, meta?: Record<string, unknown>): void;
}

export interface PipelineContext {
  readonly generationId: string;
  readonly generationContext: Readonly<GenerationContext>;
  readonly strategy: Readonly<GenerationStrategy>;
  readonly cache: Readonly<GenerationCache>;
  readonly lock: Readonly<LockProvider>;
  readonly metrics: Readonly<MetricsCollector>;
  readonly events: Readonly<EventPublisher>;
  readonly checkpoints: Readonly<CheckpointManager>;
  readonly artifacts: Readonly<ArtifactManager>;
  readonly logger: Readonly<PipelineLogger>;
  readonly config: Readonly<Record<string, unknown>>;
  readonly startedAt: number;
  readonly partial: boolean;
  readonly targetStages: readonly string[];
}

export function createPipelineContext(params: {
  generationId: string;
  generationContext: GenerationContext;
  strategy: GenerationStrategy;
  cache: GenerationCache;
  lock: LockProvider;
  metrics: MetricsCollector;
  events: EventPublisher;
  checkpoints: CheckpointManager;
  artifacts: ArtifactManager;
  logger?: PipelineLogger;
  config?: Record<string, unknown>;
  partial?: boolean;
  targetStages?: string[];
}): PipelineContext {
  return Object.freeze({
    generationId: params.generationId,
    generationContext: Object.freeze({ ...params.generationContext }),
    strategy: Object.freeze({ ...params.strategy }),
    cache: params.cache,
    lock: params.lock,
    metrics: params.metrics,
    events: params.events,
    checkpoints: params.checkpoints,
    artifacts: params.artifacts,
    logger: params.logger ?? createNullLogger(),
    config: Object.freeze({ ...(params.config ?? {}) }),
    startedAt: Date.now(),
    partial: params.partial ?? false,
    targetStages: Object.freeze([...(params.targetStages ?? [])]),
  });
}

function createNullLogger(): PipelineLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}
