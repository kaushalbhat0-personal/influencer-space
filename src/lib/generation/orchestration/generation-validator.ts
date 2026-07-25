import type { GenerationRequest } from "@/lib/generation/contracts";
import { ValidationError } from "@/lib/generation/contracts";
import type { StrategyType } from "@/lib/generation/contracts";
import { STRATEGY_TYPES } from "@/lib/generation/contracts";

export class GenerationValidator {
  validateRequest(request: GenerationRequest): void {
    this.validateSourceUrl(request.sourceUrl);
    this.validateCreatorId(request.creatorId);
    this.validateIdempotencyKey(request.idempotencyKey);
    this.validateStrategy(request.strategy);
    this.validateMode(request.mode);
  }

  validateCredentials(idempotencyKey: string): void {
    if (!idempotencyKey) throw new ValidationError({ idempotencyKey: "Idempotency key is required" });
  }

  private validateSourceUrl(url: string): void {
    if (!url || url.trim().length === 0) throw new ValidationError({ sourceUrl: "Source URL is required" });
    try { new URL(url); } catch { throw new ValidationError({ sourceUrl: "Source URL must be a valid URL" }); }
  }

  private validateCreatorId(id: string): void {
    if (!id || id.trim().length === 0) throw new ValidationError({ creatorId: "Creator ID is required" });
  }

  private validateIdempotencyKey(key: string): void {
    if (!key || key.trim().length === 0) throw new ValidationError({ idempotencyKey: "Idempotency key is required" });
  }

  private validateStrategy(strategy: StrategyType): void {
    if (!strategy) throw new ValidationError({ strategy: "Strategy is required" });
    if (!(STRATEGY_TYPES as readonly string[]).includes(strategy)) {
      throw new ValidationError({ strategy: `Invalid strategy: ${strategy}` });
    }
  }

  private validateMode(mode: string): void {
    const validModes = ["full", "partial", "regenerate", "scheduled", "batch"];
    if (!mode) throw new ValidationError({ mode: "Mode is required" });
    if (!validModes.includes(mode)) throw new ValidationError({ mode: `Invalid mode: ${mode}` });
  }
}
