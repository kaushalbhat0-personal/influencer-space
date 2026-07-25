import type { GenerationRepository, GenerationRequest } from "@/lib/generation/contracts";
import { success } from "../infrastructure/helpers/result";

export class GenerationIdempotency {
  constructor(private repository: GenerationRepository) {}

  async check(request: GenerationRequest) {
    const existing = await this.repository.findByIdempotencyKey(request.idempotencyKey);
    if (!existing.success) return success(false);
    return success(existing.data !== null);
  }
}
