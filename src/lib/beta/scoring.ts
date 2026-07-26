import type { AssertionResult, HealthScore, FailureReport, AssertionCategory } from "./types";

const CATEGORY_WEIGHTS: Record<AssertionCategory, number> = {
  identity: 15,
  lifecycle: 10,
  generation: 20,
  provisioning: 15,
  publishing: 15,
  storefront: 10,
  builder: 5,
  dashboard: 3,
  navigation: 2,
  permissions: 2,
  performance: 2,
  infrastructure: 1,
};

const MAX_SCORE = 100;

export function calculateHealthScore(
  assertions: AssertionResult[],
  failures: FailureReport[],
): HealthScore {
  const categoryResults: Partial<Record<AssertionCategory, { passed: number; total: number }>> = {};

  for (const a of assertions) {
    if (!categoryResults[a.category]) categoryResults[a.category] = { passed: 0, total: 0 };
    categoryResults[a.category]!.total++;
    if (a.passed) categoryResults[a.category]!.passed++;
  }

  const categories: Partial<Record<AssertionCategory, number>> = {};
  let weightedSum = 0;
  let totalWeight = 0;

  for (const [cat, result] of Object.entries(categoryResults)) {
    const category = cat as AssertionCategory;
    const weight = CATEGORY_WEIGHTS[category] ?? 5;
    const score = result.total > 0 ? Math.round((result.passed / result.total) * 100) : 100;
    categories[category] = score;
    weightedSum += score * weight;
    totalWeight += weight;
  }

  for (const f of failures) {
    if (f.severity === "critical") {
      const penalty = 10;
      const weight = CATEGORY_WEIGHTS[f.category] ?? 5;
      weightedSum = Math.max(0, weightedSum - penalty * (weight / 10));
    }
  }

  const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  return { overall: Math.min(MAX_SCORE, Math.max(0, overall)), categories };
}

export function scoreToLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Good";
  if (score >= 50) return "Fair";
  if (score >= 25) return "Poor";
  return "Critical";
}

export function scoreToColor(score: number): string {
  if (score >= 90) return "text-emerald-400";
  if (score >= 75) return "text-s8ul-cyan";
  if (score >= 50) return "text-amber-400";
  if (score >= 25) return "text-orange-400";
  return "text-red-400";
}
