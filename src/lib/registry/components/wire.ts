/**
 * RCCF-VISUAL-02B-01 — RSC Wire Contract for Registry Fields
 *
 * Keep canonical definition server-side; expose a WIRE type of
 * strings/booleans/null + pure serializer. Mirrors the
 * rsc-wire-contract skill: no Lucide forwardRef, no functions,
 * no class instances cross the server → client boundary.
 */

import type { RegistryFieldDefinition } from "./fields";

// Wire type is identical to RegistryFieldDefinition (already serializable).
// Explicit alias documents the contract boundary.
export type RegistryFieldWire = RegistryFieldDefinition;

export function serializeRegistryFields(fields: RegistryFieldDefinition[]): RegistryFieldWire[] {
  return JSON.parse(JSON.stringify(fields)) as RegistryFieldWire[];
}

export function deserializeRegistryFields(wire: RegistryFieldWire[]): RegistryFieldDefinition[] {
  return wire as RegistryFieldDefinition[];
}

/**
 * Build a wire-safe payload for a component's registry entry.
 * Server calls this; Client receives only the wire.
 */
export function toRegistryWire(
  def: { id: string; fields?: RegistryFieldDefinition[]; defaultProps?: Record<string, unknown> } | undefined,
): { id: string; fields: RegistryFieldWire[]; defaultProps: Record<string, unknown> } | null {
  if (!def) return null;
  return {
    id: def.id,
    fields: serializeRegistryFields(def.fields ?? []),
    defaultProps: JSON.parse(JSON.stringify(def.defaultProps ?? {})) as Record<string, unknown>,
  };
}
