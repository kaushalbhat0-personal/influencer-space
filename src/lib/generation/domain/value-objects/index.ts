import { ARTIFACT_SOURCES } from "../types/enums";
import type { ArtifactSource } from "../types/enums";

export class GenerationProgress {
  readonly stage: string;
  readonly progress: number;
  readonly status: string;

  constructor(stage: string, progress: number, status: string) {
    if (progress < 0 || progress > 100) throw new Error(`Progress must be 0–100, got: ${progress}`);
    this.stage = stage;
    this.progress = progress;
    this.status = status;
  }
}

export class GenerationDuration {
  readonly startedAt: Date;
  readonly completedAt: Date | null;

  constructor(startedAt: Date, completedAt: Date | null = null) {
    this.startedAt = startedAt;
    this.completedAt = completedAt;
  }

  get elapsedMs(): number | null {
    if (!this.completedAt) return null;
    return this.completedAt.getTime() - this.startedAt.getTime();
  }
}

export class GenerationCost {
  readonly total: number;
  readonly aiCalls: number;
  readonly tokensUsed: number;

  constructor(total = 0, aiCalls = 0, tokensUsed = 0) {
    this.total = total;
    this.aiCalls = aiCalls;
    this.tokensUsed = tokensUsed;
  }

  add(cost: GenerationCost): GenerationCost {
    return new GenerationCost(
      this.total + cost.total,
      this.aiCalls + cost.aiCalls,
      this.tokensUsed + cost.tokensUsed,
    );
  }
}

export class GenerationBudget {
  readonly dailyLimit: number;
  readonly monthlyLimit: number;
  readonly systemLimit: number;

  constructor(dailyLimit: number, monthlyLimit: number, systemLimit: number) {
    this.dailyLimit = dailyLimit;
    this.monthlyLimit = monthlyLimit;
    this.systemLimit = systemLimit;
  }

  canSpend(amount: number): boolean {
    return amount <= this.dailyLimit && amount <= this.monthlyLimit && amount <= this.systemLimit;
  }
}

export class RetryPolicy {
  readonly maxAttempts: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;

  constructor(maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000) {
    this.maxAttempts = maxAttempts;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  getDelay(attempt: number): number {
    const delay = Math.min(this.baseDelayMs * Math.pow(2, attempt - 1), this.maxDelayMs);
    return delay + Math.random() * delay * 0.1;
  }
}

export class StageCheckpoint {
  readonly stageId: string;
  readonly status: string;
  readonly output: Record<string, unknown>;

  constructor(stageId: string, status: string, output: Record<string, unknown>) {
    this.stageId = stageId;
    this.status = status;
    this.output = output;
  }
}

export class ArtifactMetadata {
  readonly artifactId: string;
  readonly source: ArtifactSource;
  readonly aiCost: number;
  readonly cached: boolean;
  readonly promptVersion: string | null;

  constructor(
    artifactId: string,
    source: ArtifactSource,
    aiCost = 0,
    cached = false,
    promptVersion: string | null = null,
  ) {
    this.artifactId = artifactId;
    this.source = source;
    this.aiCost = aiCost;
    this.cached = cached;
    this.promptVersion = promptVersion;
  }
}
