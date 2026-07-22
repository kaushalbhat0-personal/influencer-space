import { z } from "zod";
import type { CreatorProfile, CreatorIntelligence } from "@/lib/creators/types";
import type { IntelligenceEngine } from "./interface";

const AnalysisSchema = z.object({
  niche: z.string(),
  subNiche: z.string().nullable(),
  audience: z.string().nullable(),
  brandPersonality: z.string().nullable(),
  brandTone: z.string().nullable(),
  visualStyle: z.string().nullable(),
  contentStyle: z.string().nullable(),
  websiteGoal: z.string().nullable(),
  monetization: z.string().nullable(),
  recommendedTheme: z.string(),
  recommendedTemplate: z.string(),
  recommendedSections: z.array(z.string()),
  seoKeywords: z.array(z.string()),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().nullable(),
});

export class HeuristicIntelligenceEngine implements IntelligenceEngine {
  readonly name = "heuristic";

  async analyze(profile: CreatorProfile, correlationId?: string): Promise<CreatorIntelligence> {
    void correlationId; // Future: use for logging
    const analysis = this.heuristicAnalysis(profile);

    // Validate with Zod — retry if invalid (should not happen with heuristic)
    const parsed = AnalysisSchema.parse(analysis);
    return parsed;
  }

  private heuristicAnalysis(profile: CreatorProfile): CreatorIntelligence {
    const text = `${profile.name} ${profile.description} ${profile.keywords.join(" ")}`.toLowerCase();

    let niche = "general";
    let template = "gaming";
    let theme = "neon-dark";

    if (text.includes("gaming") || text.includes("game") || text.includes("streamer") || text.includes("esports") || text.includes("play") || text.includes("twitch")) {
      niche = "gaming"; template = "gaming"; theme = "neon-dark";
    } else if (text.includes("fitness") || text.includes("gym") || text.includes("workout") || text.includes("health") || text.includes("wellness") || text.includes("yoga") || text.includes("coach")) {
      niche = "fitness"; template = "fitness"; theme = "forest-canopy";
    } else if (text.includes("education") || text.includes("learn") || text.includes("teach") || text.includes("course") || text.includes("tutorial") || text.includes("class") || text.includes("school") || text.includes("lecture")) {
      niche = "education"; template = "education"; theme = "slate-minimal";
    } else if (text.includes("music") || text.includes("song") || text.includes("singer") || text.includes("rapper") || text.includes("band") || text.includes("beat")) {
      niche = "music"; template = "music"; theme = "royal-plum";
    } else if (text.includes("food") || text.includes("chef") || text.includes("cook") || text.includes("recipe") || text.includes("cooking") || text.includes("kitchen") || text.includes("restaurant") || text.includes("cuisine")) {
      niche = "restaurant"; template = "restaurant"; theme = "warm-ember";
    } else if (text.includes("tech") || text.includes("coding") || text.includes("programming") || text.includes("developer") || text.includes("software") || text.includes("gadget") || text.includes("review")) {
      niche = "technology"; template = "gaming"; theme = "midnight-ocean";
    } else if (text.includes("travel") || text.includes("trip") || text.includes("adventure") || text.includes("explore") || text.includes("wander") || text.includes("tourist") || text.includes("journey")) {
      niche = "travel"; template = "portfolio"; theme = "midnight-ocean";
    } else if (text.includes("fashion") || text.includes("style") || text.includes("beauty") || text.includes("makeup") || text.includes("skincare")) {
      niche = "fashion"; template = "portfolio"; theme = "royal-plum";
    } else if (text.includes("art") || text.includes("artist") || text.includes("paint") || text.includes("draw") || text.includes("design") || text.includes("creative")) {
      niche = "art"; template = "portfolio"; theme = "royal-plum";
    } else if (text.includes("photo") || text.includes("photography") || text.includes("camera")) {
      niche = "photography"; template = "portfolio"; theme = "slate-minimal";
    } else if (text.includes("business") || text.includes("entrepreneur") || text.includes("startup") || text.includes("marketing") || text.includes("agency")) {
      niche = "business"; template = "agency"; theme = "slate-minimal";
    } else if (text.includes("comedy") || text.includes("funny") || text.includes("entertainment") || text.includes("skit")) {
      niche = "entertainment"; template = "gaming"; theme = "neon-dark";
    } else if (text.includes("sports") || text.includes("athlete") || text.includes("training") || text.includes("cricket") || text.includes("football")) {
      niche = "sports"; template = "fitness"; theme = "forest-canopy";
    } else if (text.includes("lifestyle") || text.includes("vlog") || text.includes("daily") || text.includes("routine")) {
      niche = "lifestyle"; template = "fitness"; theme = "forest-canopy";
    }

    return {
      niche,
      subNiche: null,
      audience: null,
      brandPersonality: null,
      brandTone: null,
      visualStyle: null,
      contentStyle: null,
      websiteGoal: null,
      monetization: null,
      recommendedTheme: theme,
      recommendedTemplate: template,
      recommendedSections: [],
      seoKeywords: profile.keywords.slice(0, 10),
      confidence: 0.75,
      reasoning: `Analyzed via heuristic engine: name="${profile.name}", keywords="${profile.keywords.join(",")}"`,
    };
  }
}
