import type {
  Generation, GenerationId, GenerationCache,
} from "@/lib/generation/contracts";
import type { CheckpointRepository, GenerationRepository } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

export class GenerationRetry {
  constructor(
    private generationRepository: GenerationRepository,
    private checkpointRepository: CheckpointRepository,
    private cache: GenerationCache,
  ) {}

  async prepareRetry(generationId: GenerationId) {
    const gen = await this.generationRepository.findById(generationId);
    if (!gen.success) return gen;
    if (!gen.data) return success(null);

    const checkpoints = await this.checkpointRepository.findByGenerationId(generationId);
    const existingCheckpoints = checkpoints.success ? (checkpoints.data ?? []) : [];

    const updated = await this.generationRepository.update({
      ...gen.data,
      status: "retrying" as Generation["status"],
      version: gen.data.version + 1,
      updatedAt: new Date(),
    });

    if (!updated.success) return updated;

    return success({ generation: updated.data ?? gen.data, checkpoints: existingCheckpoints });
  }

  async clearCacheForRetry(generationId: GenerationId) {
    return this.cache.invalidateByPattern(`stage:${generationId}:*`);
  }
}
