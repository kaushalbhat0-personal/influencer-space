import type { BudgetManager } from "@/lib/generation/contracts";
import { success, failure } from "../infrastructure/helpers/result";

export class GenerationBudget {
  constructor(private budgetManager: BudgetManager) {}

  async check(creatorId: string, estimatedCost: number) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    const canSpend = await this.budgetManager.canSpend(estimatedCost, creatorId as any);
    if (!canSpend.success) return failure(new Error("Budget check failed"));
    if (!canSpend.data) {
      return failure(new Error(`Budget exceeded: estimated cost ${estimatedCost}`));
    }
    return success(undefined);
  }
}
