import type { SEOScore, SEOCheck, ScoreExplanation, SEOValidationResult, ScoreWeightConfig } from "./types";
import type { ScoreCategory } from "./constants";
import { SEO_SCORE_GOOD, SEO_SCORE_FAIR } from "./constants";

export interface ScoreConfig {
  categories: ScoreWeightConfig[];
}

const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  categories: [
    { category: "metadata", weight: 30, rules: ["title_length", "description_length", "slug_format"] },
    { category: "openGraph", weight: 20, rules: ["open_graph"] },
    { category: "twitter", weight: 15, rules: ["twitter_card"] },
    { category: "structuredData", weight: 15, rules: ["structured_data"] },
    { category: "technical", weight: 20, rules: ["canonical_url", "robots_directives"] },
  ],
};

export class ScoreEngine {
  private config: ScoreConfig;

  constructor(config: ScoreConfig = DEFAULT_SCORE_CONFIG) {
    this.config = config;
  }

  setConfig(config: ScoreConfig): void {
    this.config = config;
  }

  getConfig(): ScoreConfig {
    return { ...this.config, categories: [...this.config.categories] };
  }

  addCustomRule(category: ScoreCategory, ruleId: string): void {
    const cat = this.config.categories.find((c) => c.category === category);
    if (cat && !cat.rules.includes(ruleId)) {
      cat.rules.push(ruleId);
    }
  }

  validationToCheck(result: SEOValidationResult): SEOCheck {
    const severityMap = { error: 0, warning: 50, info: 100 } as const;
    return {
      id: result.rule,
      label: result.rule,
      passed: result.passed,
      score: result.passed ? severityMap[result.severity] : severityMap[result.severity],
      severity: result.severity,
      recommendation: result.recommendation,
    };
  }

  computeScore(checks: SEOCheck[], results?: SEOValidationResult[]): SEOScore {
    const total = checks.reduce((sum, c) => sum + c.score, 0);
    const max = checks.length * 100;
    const overall = max > 0 ? Math.round((total / max) * 100) : 0;

    const explanations: ScoreExplanation[] = [];

    const byCategory = (category: ScoreCategory) => {
      const config = this.config.categories.find((c) => c.category === category);
      const catChecks = checks.filter((c) => config?.rules.includes(c.id) ?? false);
      if (catChecks.length === 0) return 100;
      const catTotal = catChecks.reduce((s, c) => s + c.score, 0);
      return Math.round((catTotal / (catChecks.length * 100)) * 100);
    };

    const getCategoryLabel = (category: ScoreCategory): string => {
      const labels: Record<ScoreCategory, string> = {
        metadata: "Metadata",
        openGraph: "Open Graph",
        twitter: "Twitter",
        structuredData: "Structured Data",
        technical: "Technical",
      };
      return labels[category];
    };

    const score: SEOScore = {
      overall,
      metadata: byCategory("metadata"),
      openGraph: byCategory("openGraph"),
      twitter: byCategory("twitter"),
      structuredData: byCategory("structuredData"),
      technical: byCategory("technical"),
      checks,
    };

    if (results) {
      for (const cat of this.config.categories) {
        const catScore = byCategory(cat.category);
        explanations.push({
          category: cat.category,
          label: getCategoryLabel(cat.category),
          weight: cat.weight,
          score: catScore,
          maxScore: 100,
          details: `${cat.rules.length} rule${cat.rules.length !== 1 ? "s" : ""} evaluated`,
        });
      }
      score.explanations = explanations;
    }

    return score;
  }

  getScoreLabel(score: number): { label: string; color: string } {
    if (score >= SEO_SCORE_GOOD) return { label: "Good", color: "emerald" };
    if (score >= SEO_SCORE_FAIR) return { label: "Fair", color: "amber" };
    return { label: "Needs Work", color: "red" };
  }
}

export const scoreEngine = new ScoreEngine();
