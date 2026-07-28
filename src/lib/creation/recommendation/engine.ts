import { industryRegistry } from "../industry/registry";
import { styleRegistry } from "../style/registry";
import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import type { GenerationContext } from "../types";

export interface RecommendationScore {
  blueprintId: string;
  blueprintName: string;
  score: number;
  reasons: string[];
}

export interface RecommendationResult {
  recommendedBlueprintId: string | null;
  recommendedThemeId: string | null;
  recommendedThemeVariant: "light" | "dark";
  alternativeBlueprints: RecommendationScore[];
  warnings: string[];
}

export class RecommendationEngine {
  recommend(ctx: Partial<GenerationContext>): RecommendationResult {
    const warnings: string[] = [];
    const capabilities = ctx.capabilities ?? [];

    // 1. Resolve industry recommendations
    const industryBlueprints = ctx.industryId
      ? industryRegistry.getRecommendedBlueprintIds(ctx.industryId)
      : [];

    const industryThemes = ctx.industryId
      ? industryRegistry.getRecommendedThemeIds(ctx.industryId)
      : [];

    // 2. Resolve style themes
    const styleThemes = ctx.styleId
      ? styleRegistry.getCompatibleThemeIds(ctx.styleId)
      : [];

    // 3. Score available blueprints
    const allBlueprints = blueprintRegistry.getAll({ entitlements: capabilities });
    const scores: RecommendationScore[] = allBlueprints.map((bp) => {
      let score = 0;
      const reasons: string[] = [];

      // Industry match
      if (industryBlueprints.includes(bp.id)) {
        score += 40;
        reasons.push("Matches your industry");
      }

      // Capability match
      if (bp.requiredCapabilities.length === 0 || bp.requiredCapabilities.every((c) => capabilities.includes(c))) {
        score += 20;
        reasons.push("All capabilities available");
      } else {
        score -= 30;
        reasons.push("Missing required capabilities");
      }

      return { blueprintId: bp.id, blueprintName: bp.name, score, reasons };
    });

    scores.sort((a, b) => b.score - a.score);
    const topBlueprint = scores[0];

    // 4. Resolve best theme
    const preferredThemes = [...industryThemes, ...styleThemes];
    const allThemes = themeRegistry.getAll({ entitlements: capabilities });

    // Score themes — prefer intersection of industry + style recommendations
    const topTheme = preferredThemes.length > 0
      ? preferredThemes.find((t) => allThemes.some((at) => at.id === t))
      : allThemes.find((t) => !t.premium)?.id;

    // 5. Determine variant
    const themeObj = topTheme ? themeRegistry.getById(topTheme) : undefined;
    const themeVariant: "light" | "dark" = themeObj?.supportsDarkMode !== false ? "dark" : "light";

    if (!topBlueprint || topBlueprint.score < 0) {
      warnings.push("No strongly recommended blueprint found. Defaulting to Creator.");
    }

    return {
      recommendedBlueprintId: topBlueprint?.blueprintId ?? "com.creatos.creator",
      recommendedThemeId: topTheme ?? "com.creatos.neon-dark",
      recommendedThemeVariant: themeVariant,
      alternativeBlueprints: scores.slice(0, 5),
      warnings,
    };
  }

  scoreBlueprint(blueprintId: string, ctx: Partial<GenerationContext>): RecommendationScore {
    const bp = blueprintRegistry.getById(blueprintId);
    if (!bp) return { blueprintId, blueprintName: "Unknown", score: -100, reasons: ["Blueprint not found"] };

    let score = 0;
    const reasons: string[] = [];
    const industryBlueprints = ctx.industryId ? industryRegistry.getRecommendedBlueprintIds(ctx.industryId) : [];
    const capabilities = ctx.capabilities ?? [];

    if (industryBlueprints.includes(blueprintId)) { score += 40; reasons.push("Matches your industry"); }
    if (bp.requiredCapabilities.every((c) => capabilities.includes(c))) { score += 20; reasons.push("All capabilities available"); }
    if (ctx.styleId && bp.recommendedThemes.some((t) => styleRegistry.getCompatibleThemeIds(ctx.styleId!).includes(t))) {
      score += 15; reasons.push("Style-compatible themes available");
    }

    return { blueprintId, blueprintName: bp.name, score, reasons };
  }
}

export const recommendationEngine = new RecommendationEngine();
