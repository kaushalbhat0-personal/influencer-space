// ── Missing Field Detection (Phase 2) ──────────────────────
// Detect exactly what is missing from the profile — and only what is missing.
// "Do not ask for data already known": a field is missing only when its
// registry `complete()` predicate fails against the live snapshot.

import type { KnowledgeField, KnowledgeSnapshot, MissingField } from "../domain/types";
import { applicableForSnapshot } from "../domain/category-packs";

export function detectMissingFields(
  snapshot: KnowledgeSnapshot,
  fields: KnowledgeField[] = applicableForSnapshot(snapshot),
): MissingField[] {
  return fields
    .filter((field) => !field.complete(snapshot))
    .map((field) => ({
      fieldId: field.id,
      label: field.label,
      category: field.category,
      required: field.required,
      priority: field.priority,
      href: field.href,
      hint: field.hint,
      aiRelevance: field.aiRelevance,
      currentValue: field.value?.(snapshot),
    }))
    .sort((a, b) => {
      if (a.required !== b.required) return a.required ? -1 : 1;
      if (a.priority !== b.priority) return a.priority - b.priority;
      // Stable within equal priority: preserve registry order (business
      // priority), never alphabetical — the registry IS the ordering.
      const indexA = fields.findIndex((f) => f.id === a.fieldId);
      const indexB = fields.findIndex((f) => f.id === b.fieldId);
      return indexA - indexB;
    });
  }

/** Fields that are NOT missing (already known). */
export function detectCompleteFields(
  snapshot: KnowledgeSnapshot,
  fields: KnowledgeField[] = applicableForSnapshot(snapshot),
): string[] {
  return fields.filter((field) => field.complete(snapshot)).map((field) => field.id);
}
