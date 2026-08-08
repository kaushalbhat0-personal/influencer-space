import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { COMMERCE_PLANS, COMMERCE_CAPABILITY_TO_FEATURE, LEGACY_TO_CANONICAL, isAgencyRestrictedPlan, minEligiblePlanForAgencyCreator, MIN_PLAN_FOR_AGENCY_CREATORS, getCreatorCommercePlans, getPartnerCommercePlans } from "@/config/commerce/plans";
import type { CommerceCapability } from "@/config/commerce/plans";
import { getAllPlans, getPlan, getPlansByFamily } from "@/lib/capabilities";
import { LEGACY_READER_MIGRATION_STATUS } from "@/lib/capabilities/plan-resolution";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FEATURE_GROUP_LABELS: Record<string, string> = {
  premium_themes: "Premium Themes",
  custom_domain: "Custom Domain",
  advanced_builder: "Advanced Builder",
  ai_generation: "AI Generation",
  advanced_ai: "Advanced AI",
  social_integrations: "Social Integrations",
  api_access: "API Access",
  api_integrations: "API Integrations",
  white_label: "White Label",
  brand_removal: "Brand Removal",
  advanced_analytics: "Advanced Analytics",
  priority_support: "Priority Support",
  storage: "Storage",
  basic_builder: "Basic Builder",
  basic_themes: "Basic Themes",
  creator_subdomain: "Creator Subdomain",
  ai_credits: "AI Credits",
  storage_pack: "Storage Pack",
  theme_packs: "Theme Packs",
};

const FEATURE_GROUPS: Record<string, CommerceCapability[]> = {
  "Website": ["basic_builder", "advanced_builder", "basic_themes", "premium_themes"],
  "Domain": ["creator_subdomain", "custom_domain"],
  "AI": ["ai_generation", "advanced_ai"],
  "Branding": ["brand_removal", "white_label"],
  "Analytics": ["advanced_analytics"],
  "Integrations": ["social_integrations", "api_integrations", "api_access"],
  "Support": ["priority_support"],
  "Storage": ["storage", "storage_pack", "ai_credits", "theme_packs"],
};

function planToLabel(code: string): string {
  const plan = getPlan(code);
  return plan?.name ?? code;
}

export default async function DevCommercePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return <p className="p-8 text-sm text-zinc-400">Login required.</p>;
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return <p className="p-8 text-sm text-red-400">SUPER_ADMIN only.</p>;
  }

  const allPlans = getAllPlans();
  const creatorPlans = getCreatorCommercePlans();
  const partnerPlans = getPartnerCommercePlans();
  const capabilities = getPlansByFamily("creator");

  const icon = (v: boolean) => v ? "✓" : "—";

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-5xl space-y-6" data-testid="commerce-diagnostics">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">Commerce Diagnostics</h1>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted,#71717A)]">engineering only</span>
        </div>

        {/* Canonical Commerce Registry */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Canonical Commerce Registry</h2>
          <div className="space-y-4">
            {/* Creator Plans */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-zinc-400">Creator Plans</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="cd-creator-plans">
                  <thead><tr className="text-zinc-500">
                    <th className="text-left pb-1 pr-2">Code</th>
                    <th className="text-left pb-1 pr-2">Name</th>
                    <th className="text-left pb-1 pr-2">Price</th>
                    <th className="text-left pb-1 pr-2">CTA</th>
                    <th className="text-left pb-1 pr-2">Manual</th>
                    <th className="text-left pb-1">Razorpay ID</th>
                  </tr></thead>
                  <tbody>
                    {creatorPlans.map((p) => (
                      <tr key={p.code} className="border-t border-white/5 text-zinc-300" data-plan={p.code}>
                        <td className="py-1 pr-2 font-mono">{p.code}</td>
                        <td className="py-1 pr-2">{p.name}</td>
                        <td className="py-1 pr-2">{p.price === null ? "Contact Sales" : `${formatCurrency(p.price)}/mo`}</td>
                        <td className="py-1 pr-2">{p.ctaLabel}</td>
                        <td className="py-1 pr-2">{icon(p.manual)}</td>
                        <td className="py-1 font-mono text-zinc-500">{p.razorpayPlanId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Partner Plans */}
            <div>
              <h3 className="mb-2 text-xs font-semibold text-zinc-400">Partner Plans</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs" data-testid="cd-partner-plans">
                  <thead><tr className="text-zinc-500">
                    <th className="text-left pb-1 pr-2">Code</th>
                    <th className="text-left pb-1 pr-2">Name</th>
                    <th className="text-left pb-1 pr-2">Price</th>
                    <th className="text-left pb-1 pr-2">CTA</th>
                    <th className="text-left pb-1 pr-2">Manual</th>
                    <th className="text-left pb-1">Razorpay ID</th>
                  </tr></thead>
                  <tbody>
                    {partnerPlans.map((p) => (
                      <tr key={p.code} className="border-t border-white/5 text-zinc-300" data-plan={p.code}>
                        <td className="py-1 pr-2 font-mono">{p.code}</td>
                        <td className="py-1 pr-2">{p.name}</td>
                        <td className="py-1 pr-2">{p.price === null ? "Contact Sales" : `${formatCurrency(p.price)}/mo`}</td>
                        <td className="py-1 pr-2">{p.ctaLabel}</td>
                        <td className="py-1 pr-2">{icon(p.manual)}</td>
                        <td className="py-1 font-mono text-zinc-500">{p.razorpayPlanId ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Capability Matrix */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Capability Matrix</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs" data-testid="cd-capability-matrix">
              <thead>
                <tr className="text-zinc-500">
                  <th className="text-left pb-1 pr-2 w-32">Capability</th>
                  {capabilities.map((p) => (
                    <th key={p.code} className="pb-1 px-1 w-16">{planToLabel(p.code)}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(FEATURE_GROUPS).map(([group, caps]) => (
                  <tr key={group} className="border-t border-white/5 text-zinc-300">
                    <td className="py-1 pr-2 font-semibold text-zinc-400">{group}</td>
                    <td className="py-1 text-[10px]" colSpan={capabilities.length}>
                      {caps.map((cap) => {
                        const featureKey = COMMERCE_CAPABILITY_TO_FEATURE[cap]?.feature;
                        return (
                          <span key={cap} className="mr-3">{FEATURE_GROUP_LABELS[cap] || cap}:{" "}
                            {capabilities.map((p) => {
                              const hasFeature = featureKey && (typeof p.features[featureKey] === "boolean" ? p.features[featureKey] : typeof p.features[featureKey] === "number" ? (p.features[featureKey] as number) > 0 || (p.features[featureKey] as number) === -1 : false);
                              return (
                                <span key={p.code} className="inline-block w-20" data-plan={p.code} data-cap={cap}>
                                  {icon(Boolean(hasFeature))}
                                </span>
                              );
                            })}
                          </span>
                        );
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Legacy Mapping */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Legacy → Canonical Mapping</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-testid="cd-legacy-mapping">
            {Object.entries(LEGACY_TO_CANONICAL).map(([legacy, canonical]) => (
              <div key={legacy} className="rounded border border-white/10 bg-zinc-900/50 px-3 py-2" data-legacy={legacy} data-canonical={canonical}>
                <span className="font-mono text-zinc-400">{legacy}</span>
                <span className="mx-1 text-zinc-600">→</span>
                <span className="font-mono text-emerald-400">{canonical}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Agency Restrictions */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Plan Restrictions</h2>
          <div className="space-y-2 text-xs text-zinc-300" data-testid="cd-restrictions">
            <p><span className="text-zinc-500">Agency minimum plan: </span><span className="font-mono text-emerald-400">{planToLabel(MIN_PLAN_FOR_AGENCY_CREATORS)}</span> (<code>{MIN_PLAN_FOR_AGENCY_CREATORS}</code>)</p>
            <div className="mt-2">
              <span className="text-zinc-500 text-[11px]">Agency-restricted plans:</span>
              <div className="mt-1 flex flex-wrap gap-2">
                {creatorPlans.map((p) => (
                  <span key={p.code} className={`rounded border px-2 py-0.5 font-mono text-[10px] ${isAgencyRestrictedPlan(p.code) ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"}`} data-plan={p.code} data-restricted={String(isAgencyRestrictedPlan(p.code))}>
                    {p.code} {isAgencyRestrictedPlan(p.code) ? "(restricted)" : "(allowed)"}
                  </span>
                ))}
              </div>
            </div>
            <p className="mt-3 text-[11px] text-zinc-500">
              Agency-managed creators on restricted plans are clamped to {planToLabel(MIN_PLAN_FOR_AGENCY_CREATORS)} ({MIN_PLAN_FOR_AGENCY_CREATORS}).
            </p>
          </div>
        </section>

        {/* Registry Consumers */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Commerce Consumers (Runtime Registry)</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-testid="cd-consumers">
            {allPlans.map((p) => (
              <div key={p.code} className="rounded border border-white/10 bg-zinc-900/50 px-3 py-2" data-plan={p.code}>
                <p className="font-mono text-zinc-200">{p.code}</p>
                <p className="text-zinc-400">{p.name}</p>
                <p className="text-zinc-500">{p.price === 0 ? "Free" : p.price === -1 || p.price > 9999 ? "Contact" : formatCurrency(p.price)} &middot; {p.family}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">sort: {p.sortOrder}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Migration Status */}
        <section className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4">
          <h2 className="mb-3 font-medium text-[var(--text-primary,#FAFAFA)]">Migration Status</h2>
          <div className="text-xs text-zinc-300" data-testid="cd-migration">
            <p className="text-emerald-400">Migration complete. All legacy readers migrated to Billing v2.</p>
            <div className="mt-2 space-y-1">
              {LEGACY_READER_MIGRATION_STATUS.map((r) => (
                <div key={r.reader} className="flex justify-between border-b border-white/5 py-1">
                  <span>{r.reader}</span>
                  <span className={r.migrated ? "text-emerald-400" : "text-red-400"}>{icon(r.migrated)}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
