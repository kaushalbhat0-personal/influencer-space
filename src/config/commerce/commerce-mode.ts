// ── Commerce Mode — Canonical Per-Product Sales Mode ─────────
// RCCF-66.2. The sole source of truth for Product.commerceMode values and the
// single guard/normalizer. Consumers (validators, service, aggregate, renderer)
// import from here — never duplicate the enum.

export const COMMERCE_MODES = ["ONLINE", "WHATSAPP", "BOTH"] as const;

export type CommerceMode = (typeof COMMERCE_MODES)[number];

export const DEFAULT_COMMERCE_MODE: CommerceMode = "ONLINE";

export function isCommerceMode(value: unknown): value is CommerceMode {
  return typeof value === "string" && (COMMERCE_MODES as readonly string[]).includes(value);
}

/** Normalize any input to a valid mode; legacy/missing/invalid → ONLINE. */
export function normalizeCommerceMode(value: unknown): CommerceMode {
  return isCommerceMode(value) ? value : DEFAULT_COMMERCE_MODE;
}
