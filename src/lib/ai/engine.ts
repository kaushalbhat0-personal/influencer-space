import type { IntelligenceEngine } from "./interface";
import { HeuristicIntelligenceEngine } from "./heuristic";

// Register available engines. Future: add LLMIntelligenceEngine here.
const engines: IntelligenceEngine[] = [
  new HeuristicIntelligenceEngine(),
];

/**
 * AI Analysis Engine — Facade over all registered IntelligenceEngines.
 * Website generation consumes only IntelligenceEngine output.
 * Never knows which engine produced the result.
 */
export class AIAnalysisEngine {
  private engines = engines;

  /** Returns the primary (first) engine. */
  getEngine(): IntelligenceEngine {
    return this.engines[0];
  }

  /** Returns all registered engines. */
  getAllEngines(): IntelligenceEngine[] {
    return this.engines;
  }
}

export const aiEngine = new AIAnalysisEngine();
