/* eslint-disable @typescript-eslint/no-explicit-any */
import type { EvaluationRuleResult, EvaluationRecommendation, EvaluationCategory, EvaluationContext } from "../types";

export abstract class BaseEvaluationRule {
  abstract readonly id: string;
  abstract readonly category: EvaluationCategory;
  abstract readonly weight: number;
  abstract readonly description: string;

  abstract evaluate(context: EvaluationContext): EvaluationRuleResult;

  protected pass(message: string): EvaluationRuleResult {
    return this.result(true, this.weight, this.weight, message, null);
  }

  protected fail(message: string, recommendation: EvaluationRecommendation | null = null, penalty = 0): EvaluationRuleResult {
    return this.result(false, penalty, this.weight, message, recommendation);
  }

  private result(passed: boolean, score: number, maxScore: number, message: string, recommendation: EvaluationRecommendation | null): EvaluationRuleResult {
    return { ruleId: this.id, category: this.category, passed, score, maxScore, message, recommendation };
  }
}
