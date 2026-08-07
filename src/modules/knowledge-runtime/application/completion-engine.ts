// ── Knowledge Completion Engine ─────────────────────────────
// Turns validated answers into an updated knowledge snapshot and a set of
// declared facts that are persisted under the `knowledge_completion` setting.
//
// Boundaries:
//  - Only DECLARED fields accept inline answers (facts the creator confirms).
//  - Content fields (products, gallery, testimonials…) never accept invented
//    values — their answers are deep-link actions handled by existing admin
//    pages. No duplicate onboarding forms.
//  - Validation is registry-driven (FieldValidation).

import type { KnowledgeField, KnowledgeSnapshot } from "../domain/types";
import { declaredKeyFor, getField } from "../domain/registry";

export interface AnswerError {
  fieldId: string;
  message: string;
}

export interface ApplyAnswersResult {
  /** Declared facts to persist (declared fact key → value). */
  facts: Record<string, unknown>;
  errors: AnswerError[];
  /** Snapshot with the accepted facts merged (for immediate re-scoring). */
  updatedSnapshot: KnowledgeSnapshot;
}

export interface ValidateAnswerResult {
  valid: boolean;
  error?: string;
}

export function validateAnswer(field: KnowledgeField, value: unknown): ValidateAnswerResult {
  const v = field.validation;
  if (!v) return { valid: true };

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (v.minLength !== undefined && trimmed.length < v.minLength) {
      return { valid: false, error: `Please provide at least ${v.minLength} characters.` };
    }
    if (v.maxLength !== undefined && trimmed.length > v.maxLength) {
      return { valid: false, error: `Please keep it under ${v.maxLength} characters.` };
    }
    if ((v.minCount !== undefined && v.minCount > 0) && trimmed.length === 0) {
      return { valid: false, error: "This field cannot be empty." };
    }
    return { valid: true };
  }

  if (Array.isArray(value)) {
    if (v.minCount !== undefined && value.length < v.minCount) {
      return { valid: false, error: `Please select at least ${v.minCount} option${v.minCount > 1 ? "s" : ""}.` };
    }
    return { valid: true };
  }

  if (value === undefined || value === null || value === "") {
    return { valid: false, error: "Please provide a value." };
  }

  return { valid: true };
}

/**
 * Apply a batch of answers to a snapshot. Only fields whose source is
 * "declared" are accepted (creator-confirmed facts). Answers for content
 * fields (products, gallery…) are rejected here — the UI sends those as
 * deep-link actions instead. Returns facts to persist + a re-scorable snapshot.
 */
export function applyDeclaredAnswers(
  snapshot: KnowledgeSnapshot,
  answers: Array<{ fieldId: string; value: unknown }>,
): ApplyAnswersResult {
  const facts: Record<string, unknown> = {};
  const errors: AnswerError[] = [];

  for (const answer of answers) {
    const field = getField(answer.fieldId);
    if (!field) {
      errors.push({ fieldId: answer.fieldId, message: `Unknown field "${answer.fieldId}".` });
      continue;
    }
    if (field.source !== "declared") {
      errors.push({
        fieldId: answer.fieldId,
        message: `${field.label} is managed in ${field.href} — complete it there instead.`,
      });
      continue;
    }
    const validated = validateAnswer(field, answer.value);
    if (!validated.valid) {
      errors.push({ fieldId: answer.fieldId, message: validated.error ?? "Invalid value." });
      continue;
    }
    facts[declaredKeyFor(field.id)] = normalizeFact(field, answer.value);
  }

  return { facts, errors, updatedSnapshot: mergeDeclared(snapshot, facts) };
}

function normalizeFact(field: KnowledgeField, value: unknown): unknown {
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string" && v.trim().length > 0);
  if (typeof value === "string") return value.trim();
  return value;
}

/**
 * Merge declared facts into a snapshot, deriving any composite fields the
 * registry reads (business hours, keywords, languages) so re-scoring reflects
 * the answers immediately.
 */
export function mergeDeclared(snapshot: KnowledgeSnapshot, declared: Record<string, unknown>): KnowledgeSnapshot {
  const nextDeclared = { ...snapshot.declared, ...declared };

  const next: KnowledgeSnapshot = {
    ...snapshot,
    declared: nextDeclared,
  };

  if (typeof nextDeclared.business_hours === "string") {
    next.contact = { ...next.contact, businessHours: [nextDeclared.business_hours] };
  }

  return next;
}
