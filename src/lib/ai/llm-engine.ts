import type { IntelligenceEngine } from "./interface";
import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import { CreatorIntelligenceSchema } from "./intelligence";
import { OpenAIProvider } from "./providers/openai";
import { buildPrompt } from "./prompts/v1";
import { HeuristicIntelligenceEngine } from "./heuristic";

export interface LlmEngineConfig {
  provider?: "openai" | "gemini" | "anthropic";
  model?: string;
  fallbackOnFailure?: boolean;
}

/**
 * LLM-powered Intelligence Engine.
 * Implements the IntelligenceEngine interface — Builder and Templates never know the difference.
 * Falls back to heuristic engine if AI is unavailable or returns invalid data.
 */
export class LlmIntelligenceEngine implements IntelligenceEngine {
  readonly name = "llm";
  private provider: OpenAIProvider;
  private heuristic: HeuristicIntelligenceEngine;
  private fallbackOnFailure: boolean;
  private stats = { cacheHits: 0, llmCalls: 0, fallbacks: 0, failures: 0 };

  constructor(config?: LlmEngineConfig) {
    this.provider = new OpenAIProvider({
      model: config?.model || "gpt-4o-mini",
    });
    this.heuristic = new HeuristicIntelligenceEngine();
    this.fallbackOnFailure = config?.fallbackOnFailure ?? true;
  }

  async analyze(profile: CreatorProfile, correlationId?: string): Promise<CreatorIntelligence> {
    const prompt = buildPrompt({
      name: profile.name || "Unknown",
      description: profile.description || "",
      followers: profile.followers,
      videoCount: profile.videoCount,
      viewCount: Number(profile.viewCount) || 0,
      keywords: profile.keywords,
      platform: profile.platform,
      latestContent: profile.latestContent.map((c) => ({
        title: c.title,
        description: c.description,
      })),
    });

    try {
      this.stats.llmCalls++;
      const response = await this.provider.execute(prompt.messages);

      const parsed = JSON.parse(response.content);
      const validated = CreatorIntelligenceSchema.parse(parsed);

      // Map validated LLM output to the canonical CreatorIntelligence type
      return {
        niche: validated.niche,
        subNiche: validated.subNiche,
        audience: validated.audience,
        brandPersonality: validated.brandPersonality,
        brandTone: validated.brandTone,
        visualStyle: validated.visualStyle,
        contentStyle: validated.contentStyle,
        websiteGoal: validated.websiteGoal,
        monetization: validated.monetization,
        recommendedTheme: validated.recommendedTheme,
        recommendedTemplate: validated.recommendedTemplate,
        recommendedSections: validated.recommendedSections,
        seoKeywords: validated.seoKeywords,
        confidence: validated.confidence,
        reasoning: validated.reasoning,
      };
    } catch (error) {
      this.stats.failures++;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[LLM Engine] Analysis failed: ${message}`);

      if (this.fallbackOnFailure) {
        this.stats.fallbacks++;
        console.warn(`[LLM Engine] Falling back to heuristic engine`);
        return this.heuristic.analyze(profile, correlationId);
      }

      throw error;
    }
  }

  getStats() {
    return { ...this.stats };
  }
}
