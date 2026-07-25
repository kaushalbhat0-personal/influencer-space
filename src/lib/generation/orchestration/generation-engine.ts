import type {
  Generation, GenerationRequest, GenerationRepository,
  JobRepository, GenerationJob, GenerationId,
  PipelineStage,
} from "@/lib/generation/contracts";
import { createGenerationId, createJobId } from "@/lib/generation/contracts";

interface StageDefRow {
  type: PipelineStage;
  inputs: string[];
  outputs: string[];
  optional: boolean;
  supportsDeterministic: boolean;
  supportsAI: boolean;
  supportsCache: boolean;
}

export interface CreateGenerationInput {
  request: GenerationRequest;
  stages: StageDefRow[];
}

export class GenerationEngine {
  constructor(
    private generationRepository: GenerationRepository,
    private jobRepository: JobRepository,
  ) {}

  async createGeneration(input: CreateGenerationInput) {
    const now = new Date();
    const generation: Generation = {
      id: createGenerationId(),
      creatorId: input.request.creatorId,
      sourceUrl: input.request.sourceUrl,
      strategy: input.request.strategy,
      mode: input.request.mode,
      status: "idle",
      pipeline: { stages: input.stages },
      context: {
        sourceUrl: input.request.sourceUrl,
        idempotencyKey: input.request.idempotencyKey,
        options: input.request.options ?? {},
        partial: input.request.options?.partial ?? false,
        sections: input.request.options?.sections ?? [],
        forceAI: input.request.options?.forceAI ?? false,
        skipAI: input.request.options?.skipAI ?? false,
      },
      result: null,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    return this.generationRepository.create(generation);
  }

  async createJob(generationId: GenerationId) {
    const now = new Date();
    const job: GenerationJob = {
      id: createJobId(),
      generationId,
      queue: "default",
      status: "queued",
      attempts: 0,
      maxAttempts: 3,
      priority: "normal" as GenerationJob["priority"],
      scheduledAt: now,
      startedAt: null,
      completedAt: null,
      error: null,
      workerId: null,
      checkpoint: null,
    };

    return this.jobRepository.create(job);
  }

  async updateGenerationStatus(generation: Generation, status: string, result?: unknown) {
    const updated: Generation = {
      ...generation,
      status: status as Generation["status"],
      result: (result ?? generation.result) as Generation["result"],
      updatedAt: new Date(),
      version: generation.version + 1,
    };
    return this.generationRepository.update(updated);
  }

  async getGeneration(id: GenerationId) {
    return this.generationRepository.findById(id);
  }

  async getExistingByKey(idempotencyKey: string) {
    return this.generationRepository.findByIdempotencyKey(idempotencyKey);
  }
}
