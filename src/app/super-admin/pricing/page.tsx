import { getPricingCenterData, getPricingAnalytics } from "@/actions/super-admin-pricing.actions";
import { CAPABILITY_CATALOG, type TypedCapability } from "@/lib/entitlements/runtime";
import { getFeatureInfo, LIMIT_FEATURES } from "@/lib/capabilities";
import { PricingCenterClient } from "./_components/pricing-center-client";

export const dynamic = "force-dynamic";

/** Grouped capability list for the editor (canonical entitlements catalog). */
const CAPABILITY_GROUPS: Array<{ category: string; items: TypedCapability[] }> = (() => {
  const grouped = new Map<string, TypedCapability[]>();
  for (const cap of CAPABILITY_CATALOG) {
    const list = grouped.get(cap.category) ?? [];
    list.push(cap);
    grouped.set(cap.category, list);
  }
  return Array.from(grouped.entries()).map(([category, items]) => ({ category, items }));
})();

const LIMIT_FEATURES_LIST = Array.from(LIMIT_FEATURES).map((id) => ({
  id,
  label: getFeatureInfo(id).label,
}));

export default async function PricingCenterPage() {
  const [data, analytics] = await Promise.all([getPricingCenterData(), getPricingAnalytics()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Pricing Center</h1>
      <p className="mt-1 max-w-3xl text-sm text-zinc-400">
        BillingPlan is the runtime source of truth; the registry provides defaults. Edit plans, capabilities, limits,
        marketing and scheduled pricing here — every surface (marketing, checkout, upgrade dialogs, the public API)
        reflects your changes without a redeploy. Every save is versioned and audited.
      </p>
      <PricingCenterClient
        plans={data.plans}
        versions={data.versions}
        coupons={data.coupons}
        programs={data.programs}
        analytics={analytics}
        capabilityGroups={CAPABILITY_GROUPS}
        limitFeatures={LIMIT_FEATURES_LIST}
      />
    </div>
  );
}
