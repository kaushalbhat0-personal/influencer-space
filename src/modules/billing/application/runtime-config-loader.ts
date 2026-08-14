/**
 * RCCF-29 — Super Admin runtime configuration loader.
 *
 * Bridges the persisted `BillingPlan.runtimeConfig` (edited by the Super Admin
 * Pricing Center) into the synchronous capability engine. The capability
 * engine keeps reading the code-baked registry, but `getPlan()` now overlays
 * any persisted `runtimeConfig.featureOverrides` (numeric limits / boolean
 * feature values) on top, so a Super Admin can change enforced limits without
 * a code deploy. Capability-array toggles are NOT treated as authoritative
 * (enable-only surface today) — only featureOverrides propagate to enforcement.
 *
 * Promise-cached per process; re-invoked on a fresh instance (eventual
 * propagation). Falls back to the static registry when the DB is unavailable.
 */
import { prisma } from "@/lib/prisma";
import { applyRuntimeFeatureOverrides, resetRuntimeFeatureOverrides } from "@/lib/capabilities/plans";

let loadPromise: Promise<void> | null = null;

/**
 * Clear the cached load so the next call re-reads the DB. Also clears the
 * in-memory feature-override map so stale overrides from deactivated/changed
 * plans are not left applied to the enforcement engine.
 */
export function resetRuntimeConfigLoaderCache(): void {
  loadPromise = null;
  resetRuntimeFeatureOverrides();
}

export function loadRuntimeFeatureOverrides(): Promise<void> {
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const rows = await prisma.billingPlan.findMany({
        where: { status: "ACTIVE" },
        select: { code: true, runtimeConfig: true },
      });
      for (const row of rows) {
        const rc = row.runtimeConfig as { featureOverrides?: Record<string, number | boolean | string> } | null;
        const overrides = rc?.featureOverrides;
        if (overrides && Object.keys(overrides).length > 0) {
          applyRuntimeFeatureOverrides(row.code, overrides);
        }
      }
    } catch {
      // DB unavailable — fall back to the static registry (current behavior).
    }
  })();
  return loadPromise;
}
