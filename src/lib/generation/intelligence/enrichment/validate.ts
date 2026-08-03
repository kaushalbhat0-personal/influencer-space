/**
 * Enrichment validation helpers — IMPLEMENTATION-32.
 */
import { ENTITY_TYPE_SET } from "./config";

/** Only configured entity types are accepted (config-driven). */
export function sanitizeEntityType(value: string | null | undefined): string | null {
  if (!value) return null;
  return ENTITY_TYPE_SET.has(value) ? value : null;
}

/** Provider names the existing generation stack knows. */
export function isKnownProvider(name: string | null | undefined): boolean {
  if (!name) return false;
  return ["deepseek", "google", "openai", "anthropic", "ollama"].includes(name);
}
