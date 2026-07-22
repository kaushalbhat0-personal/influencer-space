import type { IntelligenceEngine } from "./interface";
import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import { CreatorIntelligenceSchema } from "./intelligence";
import { aiProviderRegistry } from "./providers/registry";
import { promptRegistry } from "./prompts/registry";
import { HeuristicIntelligenceEngine } from "./heuristic";
import { intelligenceCache } from "./cache";

export interface LlmEngineConfig {
  providerName?: string;
  promptId?: string;
  model?: string;
  confidenceThreshold?: number;
  maxRetries?: number;
  fallbackOnFailure?: boolean;
}

const DEFAULT_CONFIDENCE_THRESHOLD = 0.7;
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_STATUSES = [429, 500, 502, 503, 504];

function isRetryable(error: unknown): boolean {
  if (error && typeof error === "object" && "status" in error) {
    return RETRYABLE_STATUSES.includes((error as { status: number }).status);
  }
  // Retry on network/timeout errors
  const msg = String(error);
  return msg.includes("timeout") || msg.includes("ECONNRESET") || msg.includes("fetch failed");
}

/**
 * Hardened LLM Intelligence Engine.
 * Uses Provider Registry, Prompt Registry, retry logic, confidence threshold.
 */
export class LlmIntelligenceEngine implements IntelligenceEngine {
  readonly name = "llm";
  private heuristic: HeuristicIntelligenceEngine;
  private config: Required<LlmEngineConfig>;
  private stats = { llmCalls: 0, cacheHits: 0, fallbacks: 0, failures: 0, retries: 0, lowConfidence: 0 };

  constructor(config?: LlmEngineConfig) {
    this.heuristic = new HeuristicIntelligenceEngine();
    this.config = {
      providerName: config?.providerName || "openai",
      promptId: config?.promptId || "creator-intelligence",
      model: config?.model || "gpt-4o-mini",
      confidenceThreshold: config?.confidenceThreshold ?? DEFAULT_CONFIDENCE_THRESHOLD,
      maxRetries: config?.maxRetries ?? DEFAULT_MAX_RETRIES,
      fallbackOnFailure: config?.fallbackOnFailure ?? true,
    };
  }

  async analyze(profile: CreatorProfile, correlationId?: string): Promise<CreatorIntelligence> {
    // Check profile-hash cache first — eliminates 80-95% of LLM calls
    const cached = intelligenceCache.get(profile);
    if (cached) {
      this.stats.llmCalls++;
      this.stats.cacheHits++;
      return cached.intelligence;
    }

    // Get provider and prompt from registries
    const provider = aiProviderRegistry.getDefault(this.config.providerName);
    const promptEntry = promptRegistry.getLatest(this.config.promptId);
    if (!promptEntry) {
      console.warn(`[LLM Engine] Prompt "${this.config.promptId}" not found, falling back to heuristic`);
      this.stats.fallbacks++;
      return this.heuristic.analyze(profile, correlationId);
    }

    const prompt = promptEntry.build({
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

    // Execute with retry
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        this.stats.llmCalls++;
        const response = await provider.execute(prompt.messages, { model: this.config.model });

        const parsed = JSON.parse(response.content);
        const validated = CreatorIntelligenceSchema.parse(parsed);

        // Cache the valid result keyed by profile hash
        intelligenceCache.set(profile, {
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
        });

        // Confidence threshold check
        if (validated.confidence < this.config.confidenceThreshold) {
          this.stats.lowConfidence++;
          console.warn(`[LLM Engine] Confidence ${validated.confidence} below threshold ${this.config.confidenceThreshold}, falling back`);
          this.stats.fallbacks++;
          return this.heuristic.analyze(profile, correlationId);
        }

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
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry JSON parse errors — they won't succeed on retry
        if (error instanceof SyntaxError && error.message.includes("JSON")) {
          break;
        }

        if (attempt < this.config.maxRetries && isRetryable(error)) {
          this.stats.retries++;
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s
          console.warn(`[LLM Engine] Retry ${attempt + 1}/${this.config.maxRetries} after ${delay}ms`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }

        break; // Non-retryable or out of retries
      }
    }

    // All retries exhausted
    this.stats.failures++;
    console.error(`[LLM Engine] Analysis failed after ${this.config.maxRetries + 1} attempts: ${lastError?.message}`);

    if (this.config.fallbackOnFailure) {
      this.stats.fallbacks++;
      return this.heuristic.analyze(profile, correlationId);
    }

    throw lastError || new Error("LLM analysis failed");
  }

  getStats() {
    return { ...this.stats, config: { ...this.config } };
  }
}
