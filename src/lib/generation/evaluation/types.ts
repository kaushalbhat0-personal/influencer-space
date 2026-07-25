import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import type { WebsiteBlueprint } from "@/lib/generation/composition/types";
import type { Artifact } from "@/lib/generation/artifacts/types";

export type EvaluationCategory = "branding" | "content" | "commerce" | "ux" | "technical";

export type RecommendationAction = "generate" | "regenerate" | "review" | "accept";

export interface EvaluationRuleResult {
  ruleId: string;
  category: EvaluationCategory;
  passed: boolean;
  score: number;
  maxScore: number;
  message: string;
  recommendation: EvaluationRecommendation | null;
}

export interface EvaluationRecommendation {
  action: RecommendationAction;
  summary: string;
  details: string;
  priority: "high" | "medium" | "low";
}

export interface EvaluationScore {
  category: EvaluationCategory;
  score: number;
  maxScore: number;
  percentage: number;
  rulesPassed: number;
  rulesTotal: number;
}

export interface EvaluationReport {
  overall: { score: number; maxScore: number; percentage: number };
  categories: EvaluationScore[];
  rules: EvaluationRuleResult[];
  recommendations: EvaluationRecommendation[];
  passed: boolean;
  threshold: number;
}

export interface EvaluationContext {
  graph: KnowledgeGraph;
  blueprint: WebsiteBlueprint;
  artifacts: Artifact[];
  strategy: string;
  creatorName: string;
}
