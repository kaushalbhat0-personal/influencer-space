// ── Knowledge Score Engine (Phase 1) ────────────────────────
// Canonical scoring engine. Returns per-category %, overall %, confidence and
// missing fields. Everything derives from the registry — the engine itself
// contains no field knowledge.

import type {
  CategoryScore,
  KnowledgeCategory,
  KnowledgeField,
  KnowledgeScore,
  KnowledgeSnapshot,
} from "../domain/types";
import { KNOWLEDGE_CATEGORY_LABELS } from "../domain/types";
import { applicableForSnapshot } from "../domain/category-packs";
import { detectMissingFields } from "./analyzer";

export const KNOWLEDGE_CATEGORY_ORDER: KnowledgeCategory[] = [
  "identity",
  "brand",
  "media",
  "commerce",
  "content",
  "trust",
  "social",
  "seo",
  "contact",
  "business",
];

/** Priority → weight. priority 1 is the most important, weight 5. */
export function priorityWeight(priority: number): number {
  return Math.max(1, 6 - priority);
}

const SOURCE_CONFIDENCE: Record<KnowledgeField["source"], number> = {
  aggregate: 0.95,
  table: 0.95,
  setting: 0.85,
  declared: 0.6,
};

function clampPercent(value: number): number {
  return Math.round(Math.min(100, Math.max(0, value)));
}

export function computeKnowledgeScore(
  snapshot: KnowledgeSnapshot,
  fields: KnowledgeField[] = applicableForSnapshot(snapshot),
): KnowledgeScore {
  const missing = detectMissingFields(snapshot, fields);
  const missingByCategory = new Map<KnowledgeCategory, Map<string, (typeof missing)[number]>>();
  for (const m of missing) {
    if (!missingByCategory.has(m.category)) missingByCategory.set(m.category, new Map());
    missingByCategory.get(m.category)!.set(m.fieldId, m);
  }

  const completeFields = fields.filter((field) => field.complete(snapshot));

  const categories: CategoryScore[] = KNOWLEDGE_CATEGORY_ORDER
    .map((categoryId) => {
      const categoryFields = fields.filter((f) => f.category === categoryId);
      if (categoryFields.length === 0) return null;
      const totalWeight = categoryFields.reduce((sum, f) => sum + priorityWeight(f.priority), 0);
      const weightedScore = categoryFields.reduce(
        (sum, f) => sum + (f.complete(snapshot) ? priorityWeight(f.priority) : 0),
        0,
      );
      const missingInCategory = Array.from(missingByCategory.get(categoryId)?.values() ?? []);
      return {
        id: categoryId,
        label: KNOWLEDGE_CATEGORY_LABELS[categoryId],
        percent: clampPercent(Math.round((weightedScore / totalWeight) * 100)),
        completeCount: categoryFields.length - missingInCategory.length,
        totalCount: categoryFields.length,
        missing: missingInCategory,
      };
    })
    .filter((c): c is CategoryScore => c !== null);

  const totalWeight = fields.reduce((sum, f) => sum + priorityWeight(f.priority), 0);
  const weightedScore = fields.reduce(
    (sum, f) => sum + (f.complete(snapshot) ? priorityWeight(f.priority) : 0),
    0,
  );
  const overall = totalWeight > 0 ? clampPercent(Math.round((weightedScore / totalWeight) * 100)) : 0;

  const completeSourceConfidences = completeFields.map((f) => SOURCE_CONFIDENCE[f.source]);
  const confidence = completeSourceConfidences.length > 0
    ? Math.round((completeSourceConfidences.reduce((a, b) => a + b, 0) / completeSourceConfidences.length) * 100) / 100
    : 0.5;

  return {
    overall,
    categories,
    confidence,
    completeFields: completeFields.map((f) => f.id),
    missingFields: missing,
    generatedAt: new Date().toISOString(),
    entityType: snapshot.entityType,
  };
}

/** Short human label for a 0-100 score. */
export function scoreLabel(percent: number): "poor" | "developing" | "solid" | "premium" {
  if (percent >= 80) return "premium";
  if (percent >= 60) return "solid";
  if (percent >= 40) return "developing";
  return "poor";
}

export function confidenceLabel(confidence: number): "low" | "medium" | "high" {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.55) return "medium";
  return "low";
}

export { KNOWLEDGE_CATEGORY_LABELS };
