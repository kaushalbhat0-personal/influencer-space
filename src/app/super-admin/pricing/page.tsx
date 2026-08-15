import { getPricingCenterData, getPricingAnalytics } from "@/actions/super-admin-pricing.actions";
import { buildCapabilityCatalog, buildLimitFeatureList } from "@/lib/capabilities/catalog";
import { PricingCenterClient } from "./_components/pricing-center-client";

export const dynamic = "force-dynamic";

// Grouped capability list for the editor — DERIVED from the canonical
// capabilityService/FEATURE_CATALOG (RCCF-68.2: single plan/capability
// authority; the old duplicate entitlements matrix is retired).
const CAPABILITY_GROUPS = buildCapabilityCatalog();
const LIMIT_FEATURES_LIST = buildLimitFeatureList();

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
