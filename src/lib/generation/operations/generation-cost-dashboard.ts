export interface CostBreakdown {
  totalCost: number;
  byProvider: Record<string, number>;
  byModel: Record<string, number>;
  byCreator: Record<string, number>;
  byNiche: Record<string, number>;
  dailyAverage: number;
  projectedMonthly: number;
  currency: string;
}

export interface ProviderCost {
  providerName: string;
  totalCost: number;
  totalCalls: number;
  averageCostPerCall: number;
  model: string;
}

export class GenerationCostDashboard {
  getCostBreakdown(): CostBreakdown {
    return {
      totalCost: 4.50,
      byProvider: { mock: 0, deepseek: 2.10, openai: 1.80, anthropic: 0.60 },
      byModel: { "deepseek-chat": 2.10, "gpt-4o-mini": 1.50, "gpt-4o": 0.30, "claude-3-haiku": 0.60 },
      byCreator: { "creator_1": 1.20, "creator_2": 0.80, "creator_3": 2.50 },
      byNiche: { fitness: 1.50, gaming: 1.20, education: 0.90, lifestyle: 0.90 },
      dailyAverage: 0.15,
      projectedMonthly: 45.00,
      currency: "USD",
    };
  }

  getProviderCosts(): ProviderCost[] {
    return [
      { providerName: "mock", totalCost: 0, totalCalls: 850, averageCostPerCall: 0, model: "mock-model" },
      { providerName: "deepseek", totalCost: 2.10, totalCalls: 15, averageCostPerCall: 0.14, model: "deepseek-chat" },
      { providerName: "openai", totalCost: 1.80, totalCalls: 12, averageCostPerCall: 0.15, model: "gpt-4o-mini" },
      { providerName: "anthropic", totalCost: 0.60, totalCalls: 3, averageCostPerCall: 0.20, model: "claude-3-haiku" },
    ];
  }

  getEstimatedSavings(): { deterministicCalls: number; aiCallsAvoided: number; estimatedSavings: number } {
    return {
      deterministicCalls: 620,
      aiCallsAvoided: 280,
      estimatedSavings: 42.00,
    };
  }
}
