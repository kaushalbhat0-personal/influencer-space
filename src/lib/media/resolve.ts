/**
 * Centralized asset id resolution — THE single safe resolver.
 *
 * Every asset lookup or write must go through this module. It guarantees
 * Prisma is never queried with "", "null", "undefined", or a malformed id —
 * the source of `Invalid prisma.asset.findUnique() … invalid input syntax for
 * uuid: ""` production errors. Every rejection is logged with the originating
 * module and field so the bad data source can be found and fixed at the root.
 *
 * Rules:
 *   ""        → null (read: skip lookup) / throw (write)
 *   undefined → null / throw
 *   null      → null / throw
 *   "null"    → null / throw
 *   "undefined" → null / throw
 *   invalid UUID → null / throw
 *   valid UUID  → pass through
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Where an asset id came from — logged on every rejection. */
export interface AssetIdContext {
  /** e.g. "aggregate.hero", "media-queue.enqueue", "media.upload" */
  module: string;
  /** e.g. "posterAssetId", "assetId", "id" */
  field?: string;
}

function describe(ctx?: AssetIdContext): string {
  if (!ctx) return "";
  return ctx.field ? ` (${ctx.module}.${ctx.field})` : ` (${ctx.module})`;
}

export class AssetResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AssetResolutionError";
  }
}

/**
 * Normalize a raw asset id into a safe READ lookup value (or null to skip).
 * Logs the originating module/field when a bad id is rejected.
 */
export function normalizeAssetId(
  id: string | null | undefined,
  ctx?: AssetIdContext,
): string | null {
  if (id == null) return null;
  const trimmed = String(id).trim();
  if (trimmed === "") {
    warnRejected(trimmed, ctx);
    return null;
  }
  if (trimmed === "undefined" || trimmed === "null") {
    warnRejected(trimmed, ctx);
    return null;
  }
  if (!UUID_RE.test(trimmed)) {
    warnRejected(trimmed, ctx);
    return null;
  }
  return trimmed;
}

/**
 * Validate an asset id for a WRITE / processing lookup. Throws a clear
 * AssetResolutionError (with module/field) instead of letting Prisma throw an
 * opaque `Invalid UUID ""`, so the bug surfaces at the right boundary.
 */
export function requireAssetId(id: string | null | undefined, ctx: AssetIdContext): string {
  const normalized = normalizeAssetId(id, ctx);
  if (!normalized) {
    throw new AssetResolutionError(`Invalid asset id ${JSON.stringify(id ?? null)}${describe(ctx)}`);
  }
  return normalized;
}

/** Filter a list of raw asset ids down to only valid UUIDs. */
export function filterValidAssetIds(
  ids: ReadonlyArray<string | null | undefined>,
  ctx?: AssetIdContext,
): string[] {
  const out: string[] = [];
  for (const id of ids) {
    const normalized = normalizeAssetId(id, ctx);
    if (normalized) out.push(normalized);
  }
  return out;
}

function warnRejected(id: string, ctx?: AssetIdContext): void {
  if (typeof console === "undefined") return;
  console.warn(`[AssetResolver] rejected invalid asset id ${JSON.stringify(id)}${describe(ctx)}`);
}

export { normalizeAssetId as resolveAsset };
