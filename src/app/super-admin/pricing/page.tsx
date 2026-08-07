import { prisma } from "@/lib/prisma";
import { COMMERCE_PLANS, getMarketingPlans } from "@/config/commerce/plans";
import { PricingCenterClient } from "./_components/pricing-center-client";

export const dynamic = "force-dynamic";

export default async function PricingCenterPage() {
  const dbPlans = await prisma.billingPlan.findMany({
    orderBy: { code: "asc" },
    select: { code: true, name: true, price: true, family: true, cycle: true, status: true, version: true, marketing: true },
  });

  const dbByCode = new Map(dbPlans.map((p) => [p.code, p]));

  const rows = COMMERCE_PLANS.map((cfg) => {
    const db = dbByCode.get(cfg.code);
    const marketing = (cfg as { marketingHighlights?: string[] })?.marketingHighlights ?? [];
    return {
      code: cfg.code,
      name: cfg.name,
      family: cfg.family,
      price: cfg.price,
      annualPrice: cfg.annualPrice ?? null,
      badge: cfg.badge ?? null,
      popular: !!cfg.popular,
      bestValue: !!cfg.bestValue,
      recommended: !!cfg.recommended,
      hidden: !!cfg.hidden,
      enterprise: !!cfg.enterprise,
      trialDays: cfg.trialDays ?? null,
      marketingDescription: (cfg as { marketingDescription?: string })?.marketingDescription ?? cfg.description,
      targetAudience: (cfg as { targetAudience?: string })?.targetAudience ?? null,
      highlights: marketing,
      dbStatus: db ? { status: db.status, version: db.version, syncedPrice: db.price } : null,
    };
  });

  const marketingPlans = getMarketingPlans("creator").length + getMarketingPlans("partner").length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Pricing Center</h1>
      <p className="mt-1 max-w-2xl text-sm text-zinc-400">
        The canonical commerce registry is the single source for every pricing surface — marketing, checkout, billing and
        capabilities. {marketingPlans} plans are shown publicly; enterprise and hidden tiers are excluded. Changes are made in the
        registry and propagated to the plan catalog via <span className="font-mono text-zinc-300">Re-sync catalog</span>.
      </p>
      <PricingCenterClient rows={rows} />
    </div>
  );
}
