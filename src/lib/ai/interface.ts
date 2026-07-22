import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";

/**
 * Abstract intelligence engine.
 * Every implementation (heuristic, LLM, etc.) must implement this interface.
 * Website generation never knows which engine produced the intelligence.
 */
export interface IntelligenceEngine {
  readonly name: string;
  analyze(profile: CreatorProfile, _correlationId?: string): Promise<CreatorIntelligence>;
}
