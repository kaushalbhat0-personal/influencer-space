import { capabilityService } from "./service";
import { getFeatureInfo } from "./features";
import { groupForFeature } from "./features";
import { LIMIT_FEATURES } from "./constants";

/**
 * RCCF-68.2 — ONE canonical plan/capability authority.
 *
 * Replaces the retired duplicate matrix (lib/entitlements/runtime.ts) with a
 * catalog DERIVED from capabilityService / FEATURE_CATALOG — the single source
 * of truth that resolves plans, capabilities, limits and enforcement. Nothing
 * here re-defines plan values; it only groups the canonical feature registry
 * for UI consumption.
 */
export interface CapabilityCatalogItem {
  key: string;
  label: string;
  category: string;
}

export function buildCapabilityCatalog(): Array<{ category: string; items: CapabilityCatalogItem[] }> {
  const grouped = new Map<string, CapabilityCatalogItem[]>();
  for (const id of capabilityService.getAllFeatureIds()) {
    const info = getFeatureInfo(id);
    const category = groupForFeature(id);
    const list = grouped.get(category) ?? [];
    list.push({ key: id, label: info.label, category });
    grouped.set(category, list);
  }
  return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
}

export function buildLimitFeatureList(): Array<{ id: string; label: string }> {
  return Array.from(LIMIT_FEATURES).map((id) => ({ id, label: getFeatureInfo(id).label }));
}
