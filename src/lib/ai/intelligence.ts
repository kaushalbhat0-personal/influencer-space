import { z } from "zod";

/**
 * Structured intelligence output — the ONLY thing the LLM produces.
 * No HTML, no JSX, no rendering data. Pure domain intelligence.
 */
export const CreatorIntelligenceSchema = z.object({
  /** Primary niche/category */
  niche: z.string(),
  /** Sub-niche for finer classification */
  subNiche: z.string().nullable(),
  /** Target audience description */
  audience: z.string().nullable(),
  /** Brand personality traits */
  brandPersonality: z.string().nullable(),
  /** Brand communication tone */
  brandTone: z.string().nullable(),
  /** Recommended visual style direction */
  visualStyle: z.string().nullable(),
  /** Content style / format */
  contentStyle: z.string().nullable(),
  /** Primary website goal */
  websiteGoal: z.string().nullable(),
  /** Monetization strategy */
  monetization: z.string().nullable(),
  /** Recommended theme package ID */
  recommendedTheme: z.string(),
  /** Recommended template ID */
  recommendedTemplate: z.string(),
  /** Ordered list of recommended component section IDs */
  recommendedSections: z.array(z.string()),
  /** SEO keywords */
  seoKeywords: z.array(z.string()),
  /** Suggested CTA text */
  suggestedCta: z.string().nullable(),
  /** Trust signals to feature */
  trustSignals: z.array(z.string()),
  /** Content pillars */
  contentPillars: z.array(z.string()),
  /** Confidence score 0-1 */
  confidence: z.number().min(0).max(1),
  /** Human-readable reasoning */
  reasoning: z.string().nullable(),
});

export type CreatorIntelligence = z.infer<typeof CreatorIntelligenceSchema>;
