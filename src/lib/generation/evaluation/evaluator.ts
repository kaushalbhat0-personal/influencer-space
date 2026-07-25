import type { EvaluationContext, EvaluationReport, EvaluationScore, EvaluationRecommendation, EvaluationCategory } from "./types";
import { EvaluationRegistry } from "./rules/registry";

export class GenerationEvaluator {
  private registry: EvaluationRegistry;

  constructor(registry?: EvaluationRegistry) {
    this.registry = registry ?? new EvaluationRegistry();
  }

  evaluate(context: EvaluationContext): EvaluationReport {
    const allRules = this.registry.getAll();
    const results = allRules.map((rule) => rule.evaluate(context));

    const categories = this.computeCategoryScores(results);
    const overall = this.computeOverallScore(categories);
    const recommendations = this.extractRecommendations(results);

    const threshold = this.getThreshold(context.strategy);

    return {
      overall,
      categories,
      rules: results,
      recommendations,
      passed: overall.percentage >= threshold,
      threshold,
    };
  }

  getRegistry(): EvaluationRegistry {
    return this.registry;
  }

  private computeCategoryScores(results: EvaluationRuleResult[]): EvaluationScore[] {
    const categoryMap = new Map<string, { score: number; maxScore: number; passed: number; total: number }>();

    for (const r of results) {
      const entry = categoryMap.get(r.category) ?? { score: 0, maxScore: 0, passed: 0, total: 0 };
      entry.score += r.score;
      entry.maxScore += r.maxScore;
      entry.total++;
      if (r.passed) entry.passed++;
      categoryMap.set(r.category, entry);
    }

    return Array.from(categoryMap.entries()).map(([category, data]) => ({
      category: category as EvaluationCategory,
      score: data.score,
      maxScore: data.maxScore,
      percentage: data.maxScore > 0 ? Math.round((data.score / data.maxScore) * 100) : 0,
      rulesPassed: data.passed,
      rulesTotal: data.total,
    }));
  }

  private computeOverallScore(categories: EvaluationScore[]): { score: number; maxScore: number; percentage: number } {
    const weights: Record<string, number> = {
      branding: 0.25,
      content: 0.20,
      commerce: 0.20,
      ux: 0.15,
      technical: 0.20,
    };

    let weightedScore = 0;
    let totalWeight = 0;

    for (const cat of categories) {
      const w = weights[cat.category] ?? 0.15;
      weightedScore += (cat.percentage / 100) * w;
      totalWeight += w;
    }

    const percentage = totalWeight > 0 ? Math.round((weightedScore / totalWeight) * 100) : 0;

    return {
      score: Math.round(weightedScore * 100),
      maxScore: 100,
      percentage,
    };
  }

  private extractRecommendations(results: EvaluationRuleResult[]): EvaluationRecommendation[] {
    const recommendations: EvaluationRecommendation[] = [];
    for (const r of results) {
      if (!r.passed && r.recommendation) {
        recommendations.push(r.recommendation);
      }
    }
    return recommendations;
  }

  private getThreshold(strategy: string): number {
    const thresholds: Record<string, number> = {
      free: 40,
      pro: 60,
      elite: 75,
      agency: 85,
    };
    return thresholds[strategy] ?? 50;
  }
}

interface EvaluationRuleResult {
  ruleId: string;
  category: string;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
  recommendation: EvaluationRecommendation | null;
}
