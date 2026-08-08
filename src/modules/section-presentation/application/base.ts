// ── Section Presentation — Base id ─────────────────────────
// Leaf module (no internal imports) so both runtime.ts and resolver.ts can use
// it without a circular dependency.

/** Base id from a full module id ("products.grid" → "products"). */
export function baseOf(moduleId: string): string {
  const base = moduleId.split(".")[0];
  return base === "contentFeed" ? "content_feed" : base;
}
