import type { IntelligenceEngine } from "./interface";
import { HeuristicIntelligenceEngine } from "./heuristic";
import { LlmIntelligenceEngine } from "./llm-engine";
import { aiProviderRegistry } from "./providers/registry";

const engines: IntelligenceEngine[] = [];

// Register LLM engine as primary if any AI provider is configured
if (aiProviderRegistry.getAll().length > 0) {
  engines.push(new LlmIntelligenceEngine({ fallbackOnFailure: true }));
}
engines.push(new HeuristicIntelligenceEngine());

/**
 * AI Analysis Engine — Facade over all registered IntelligenceEngines.
 * Website generation consumes only IntelligenceEngine output.
 * Never knows which engine produced the result.
 */
export class AIAnalysisEngine {
  private engines = engines;

  getEngine(): IntelligenceEngine {
    return this.engines[0];
  }

  getAllEngines(): IntelligenceEngine[] {
    return this.engines;
  }
}

export const aiEngine = new AIAnalysisEngine();
