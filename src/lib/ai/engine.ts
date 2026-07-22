import type { IntelligenceEngine } from "./interface";
import { HeuristicIntelligenceEngine } from "./heuristic";
import { LlmIntelligenceEngine } from "./llm-engine";

const engines: IntelligenceEngine[] = [];

// Register engines in priority order
// LLM engine is primary if OPENAI_API_KEY is set, otherwise heuristic
const openAiKey = typeof process !== "undefined" ? process.env.OPENAI_API_KEY : undefined;
if (openAiKey) {
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
