import { themeRegistry } from "@/lib/theme/registry-new";
import { getThemeTier, themeUnlockedForPlan } from "@/lib/theme/tiers";
import { planTier } from "@/lib/theme/access";
import { requireTenant } from "@/lib/auth/require-tenant";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { ThemeMarketplaceClient } from "./_components/theme-marketplace-client";

export const dynamic = "force-dynamic";

export default async function ThemesPage() {
  const themes = themeRegistry.getAll();
  const categories = themeRegistry.getCategories();

  // Enrich with the subscription tier (data-driven; one source).
  const enriched = themes.map((t) => ({ ...t, tier: getThemeTier(t) }));

  let plan: string | null = null;
  try {
    const { tenantId: tid } = await requireTenant();
    const resolved = await resolveActivePlan(undefined, tid);
    plan = resolved.code ?? null;
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (message.includes("authenticated") || message.includes("tenant") || message.includes("session")) {
      // Not authenticated — marketplace renders with all themes locked.
    } else {
      throw err;
    }
  }

  const planTierName = planTier(plan);
  const unlockedCount = themes.filter((t) => themeUnlockedForPlan(t, plan)).length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-[var(--text-primary)] text-2xl font-bold font-display">Theme Marketplace</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          Browse professionally designed themes and open them in the Builder. The Builder is the only place themes are applied and published.
        </p>
      </div>
      <ThemeMarketplaceClient
        themes={enriched}
        categories={categories}
        plan={plan}
        planTierName={planTierName}
        unlockedCount={unlockedCount}
      />
    </div>
  );
}
