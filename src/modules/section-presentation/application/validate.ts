// ── Section Presentation — Runtime Validation ─────────────
// RCCF-IMPLEMENTATION-09B (Phase 1). The stored `config.presentation` shape is
// cast-only everywhere else (builder store, panel, LayoutEngine). This is the
// single runtime validator used by the creator-facing presentation surface
// (server actions) so unknown keys / wrong types never reach the Block.config
// JSON. Presentation is metadata only — canonical ids are never touched.

import type { SectionPresentation } from "../domain/types";

export const STRING_KEYS = ["titleOverride", "descriptionOverride"] as const;
export const BOOLEAN_KEYS = ["hideTitle", "visible", "hideWhenEmpty"] as const;
export const ALLOWED_PRESENTATION_KEYS: readonly string[] = [...STRING_KEYS, ...BOOLEAN_KEYS];

export interface SectionPresentationValidation {
  ok: boolean;
  value?: SectionPresentation;
  errors: string[];
}

/**
 * Validate an arbitrary input against the canonical SectionPresentation shape.
 * - null/undefined → ok, no value (nothing to persist).
 * - non-object / array → error.
 * - unknown keys → error (rejected, never persisted).
 * - wrong primitive type → error.
 * - a clean subset of the allowed keys → the sanitized value.
 */
export function validateSectionPresentation(input: unknown): SectionPresentationValidation {
  const errors: string[] = [];

  if (input === undefined || input === null) {
    return { ok: true, value: undefined, errors };
  }
  if (typeof input !== "object" || Array.isArray(input)) {
    return { ok: false, errors: ["presentation must be an object"] };
  }

  const source = input as Record<string, unknown>;
  const value: SectionPresentation = {};

  for (const [key, val] of Object.entries(source)) {
    if (!ALLOWED_PRESENTATION_KEYS.includes(key)) {
      errors.push(`unknown presentation key: ${key}`);
      continue;
    }
    if ((STRING_KEYS as readonly string[]).includes(key)) {
      if (typeof val !== "string") {
        errors.push(`${key} must be a string`);
      } else if (val.trim().length > 0) {
        (value as Record<string, unknown>)[key] = val.trim();
      }
    } else if (typeof val === "boolean") {
      (value as Record<string, unknown>)[key] = val;
    } else {
      errors.push(`${key} must be a boolean`);
    }
  }

  return { ok: errors.length === 0, value: errors.length === 0 ? value : undefined, errors };
}
