import type { AIPrompt } from "@/lib/generation/contracts";
import { getModelCapability, estimateTokens } from "./shared/provider-types";

export interface CostBreakdown {
  providerName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costPerInputToken: number;
  costPerOutputToken: number;
  totalCost: number;
}

export class ProviderCostEstimator {
  estimate(prompt: AIPrompt, model: string, providerName: string): CostBreakdown {
    const cap = getModelCapability(model);
    const inputTokens = this.countInputTokens(prompt);
    const outputTokens = 500;

    if (!cap) {
      return {
        providerName,
        model,
        inputTokens,
        outputTokens,
        costPerInputToken: 0,
        costPerOutputToken: 0,
        totalCost: 0,
      };
    }

    const totalCost = (inputTokens * cap.costPerInputToken) + (outputTokens * cap.costPerOutputToken);

    return {
      providerName,
      model,
      inputTokens,
      outputTokens,
      costPerInputToken: cap.costPerInputToken,
      costPerOutputToken: cap.costPerOutputToken,
      totalCost,
    };
  }

  compareProviders(prompt: AIPrompt, models: Array<{ model: string; provider: string }>): CostBreakdown[] {
    return models
      .map((m) => this.estimate(prompt, m.model, m.provider))
      .sort((a, b) => a.totalCost - b.totalCost);
  }

  private countInputTokens(prompt: AIPrompt): number {
    let count = 0;
    count += estimateTokens(prompt.system);
    for (const msg of prompt.messages) {
      count += 4;
      count += estimateTokens(msg.content);
    }
    return count;
  }
}
