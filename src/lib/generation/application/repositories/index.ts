import type { AsyncResult } from "@/lib/generation/domain/types/utility";
import type {
  GenerationId, ArtifactId, JobId,
} from "@/lib/generation/domain/types/ids";
import type {
  Generation, GenerationJob, GenerationArtifact, CheckpointRow,
} from "@/lib/generation/domain/types/index";

export interface GenerationRepository {
  create(generation: Generation): AsyncResult<Generation>;
  update(generation: Generation): AsyncResult<Generation>;
  findById(id: GenerationId): AsyncResult<Generation | null>;
  findByCreatorId(creatorId: string): AsyncResult<Generation[]>;
  findByStatus(status: string): AsyncResult<Generation[]>;
  findByIdempotencyKey(key: string): AsyncResult<Generation | null>;
  delete(id: GenerationId): AsyncResult<void>;
}

export interface JobRepository {
  create(job: GenerationJob): AsyncResult<GenerationJob>;
  update(job: GenerationJob): AsyncResult<GenerationJob>;
  findById(id: JobId): AsyncResult<GenerationJob | null>;
  findByGenerationId(generationId: GenerationId): AsyncResult<GenerationJob[]>;
  findQueued(queue: string): AsyncResult<GenerationJob[]>;
  findDeadLetters(queue: string): AsyncResult<GenerationJob[]>;
  delete(id: JobId): AsyncResult<void>;
}

export interface ArtifactRepository {
  create(artifact: GenerationArtifact): AsyncResult<GenerationArtifact>;
  findById(id: ArtifactId): AsyncResult<GenerationArtifact | null>;
  findByGenerationId(generationId: GenerationId): AsyncResult<GenerationArtifact[]>;
  findByTypeAndGeneration(type: string, generationId: GenerationId): AsyncResult<GenerationArtifact[]>;
  delete(id: ArtifactId): AsyncResult<void>;
}

export interface CheckpointRepository {
  save(generationId: GenerationId, checkpoint: CheckpointRow): AsyncResult<void>;
  findByGenerationId(generationId: GenerationId): AsyncResult<CheckpointRow[]>;
  findByStageId(generationId: GenerationId, stageId: string): AsyncResult<CheckpointRow | null>;
  deleteByGenerationId(generationId: GenerationId): AsyncResult<void>;
}
