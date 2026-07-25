import type { PlanDefinition, PlanSummary, PlanComparison } from "./types";
import { getFeatureInfo } from "./features";
import { getRemaining, getUsagePercent, resolveLimitValue } from "./limits";

export function toPlanSummary(plan: PlanDefinition): PlanSummary {
  const entries = Object.entries(plan.features);
  const enabledCount = entries.filter(([, v]) => {
    if (typeof v === "boolean") return v;
    if (typeof v === "number") return v === -1 || v > 0;
    return false;
  }).length;

  return {
    code: plan.code,
    name: plan.name,
    family: plan.family,
    price: plan.price,
    currency: plan.currency,
    features: { ...plan.features },
    featureCount: entries.length,
    enabledFeatureCount: enabledCount,
  };
}

export function formatFeatureComparison(
  featureKey: string,
  fromValue: number | boolean | string,
  toValue: number | boolean | string,
): { label: string; from: string; to: string; improved: boolean } {
  const info = getFeatureInfo(featureKey);
  const fmt = (v: number | boolean | string): string => {
    if (typeof v === "boolean") return v ? "Yes" : "No";
    if (typeof v === "number") return v === -1 ? "Unlimited" : String(v);
    return String(v);
  };

  const fromFmt = fmt(fromValue);
  const toFmt = fmt(toValue);
  const fromEffective = resolveLimitValue(fromValue);
  const toEffective = resolveLimitValue(toValue);

  return {
    label: info.label,
    from: fromFmt,
    to: toFmt,
    improved: toEffective > fromEffective || (toEffective === -1 && fromEffective !== -1),
  };
}

export function formatUsageHint(
  featureKey: string,
  used: number,
  limit: number,
): string {
  if (limit === -1) return "Unlimited";
  const remaining = getRemaining(used, limit);
  const percent = getUsagePercent(used, limit);
  if (remaining === 0) return `${used}/${limit} (Full)`;
  if (percent >= 80) return `${used}/${limit} (${remaining} remaining)`;
  return `${used}/${limit}`;
}

export function comparisonToRows(
  comparison: PlanComparison,
): Array<{ type: "feature" | "limit"; label: string; detail: string }> {
  const rows: Array<{ type: "feature" | "limit"; label: string; detail: string }> = [];

  for (const f of comparison.addedFeatures) {
    rows.push({ type: "feature", label: f.label, detail: "New" });
  }

  for (const l of comparison.upgradedLimits) {
    const fromStr = l.from === -1 ? "Unlimited" : String(l.from);
    const toStr = l.to === -1 ? "Unlimited" : String(l.to);
    rows.push({ type: "limit", label: l.label, detail: `${fromStr} → ${toStr}` });
  }

  return rows;
}
