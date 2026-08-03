import { themeRegistry } from "@/lib/theme/registry-new";
import { getThemeTier, themeUnlockedForPlan } from "@/lib/theme/tiers";
import { planTier } from "@/lib/theme/access";
import { prisma } from "@/lib/prisma";
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
  let currentThemeId: string | null = null;
  let tenantId = "";
  try {
    const { tenantId: tid } = await requireTenant();
    tenantId = tid;
    // IMPLEMENTATION-33: plan resolves through Billing v2 (legacy fallback).
    const [resolved, website] = await Promise.all([
      resolveActivePlan(undefined, tid),
      prisma.website.findUnique({ where: { tenantId: tid }, select: { themePackageId: true } }),
    ]);
    plan = resolved.code ?? null;
    currentThemeId = website?.themePackageId ?? null;
  } catch {
    // Not authenticated — marketplace still renders, all themes shown locked.
  }

  const planTierName = planTier(plan);
  const unlockedCount = themes.filter((t) => themeUnlockedForPlan(t, plan)).length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Theme Marketplace</h1>
        <p className="mt-1 text-sm text-gray-400">
          {themes.length} professionally designed themes, organized by category and gated by your subscription plan.
        </p>
      </div>
      <ThemeMarketplaceClient
        themes={enriched}
        categories={categories}
        plan={plan}
        planTierName={planTierName}
        currentThemeId={currentThemeId}
        tenantId={tenantId}
        unlockedCount={unlockedCount}
      />
    </div>
  );
}
