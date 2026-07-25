import type { Generation, GenerationId, GenerationRepository } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

export class GenerationCancellation {
  constructor(private generationRepository: GenerationRepository) {}

  async cancel(generationId: GenerationId) {
    const gen = await this.generationRepository.findById(generationId);
    if (!gen.success) return gen;
    if (!gen.data) return success(null);

    const cancellableStatuses = ["idle", "queued", "running", "retrying"];
    if (!cancellableStatuses.includes(gen.data.status)) {
      return success(null);
    }

    const updated: Generation = {
      ...gen.data,
      status: "cancelled" as Generation["status"],
      result: gen.data.result ?? {
        generationId: gen.data.id,
        status: "cancelled" as Generation["status"],
        version: gen.data.version,
        snapshotId: null,
        storefrontUrl: null,
        artifacts: [],
        cost: { total: 0, aiCalls: 0, tokensUsed: 0 },
        durationMs: Date.now() - gen.data.createdAt.getTime(),
        stages: [],
        error: "Generation cancelled",
      },
      updatedAt: new Date(),
      version: gen.data.version + 1,
    };

    return this.generationRepository.update(updated);
  }
}
