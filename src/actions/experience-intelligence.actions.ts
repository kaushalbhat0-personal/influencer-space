"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { computeExperienceIntelligence } from "@/modules/experience-intelligence";
import { businessHealthRuntime } from "@/modules/business-health";

async function requireTenantId(): Promise<string> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) throw new Error("Unauthorized");
  return tenantId;
}

/**
 * Full Experience Intelligence for a creator — Conversion Readiness, Business
 * Health, Goal Alignment, CTA, trust, theme emphasis and the section plan.
 * Read-only (never records projections, never marks recommendations).
 */
export async function getExperienceIntelligence(): Promise<{
  success: boolean;
  data?: {
    conversionScore: { overall: number; dimensions: Array<{ id: string; label: string; score: number }> };
    businessHealth: { overall: number; grade: string } | null;
    goalAlignment: { overall: number } | null;
    cta: { primary: string; secondary: string | null };
    themeEmphasis: { whitespace: string; mediaEmphasis: string; trustEmphasis: string; contentEmphasis: string };
    hiddenBases: string[];
    homepageOrder: string[];
    sectionPlan: Record<string, { base: string; label: string; priority: number; visible: boolean; mobilePriority: number; collapseOnMobile: boolean; conversionWeight: number; trustWeight: number; commerceWeight: number; seoWeight: number }>;
  };
  error?: string;
}> {
  try {
    const tenantId = await requireTenantId();
    const ctx = await runtimeContextBuilder.build(tenantId, { markShown: false });
    const intelligence = computeExperienceIntelligence(ctx);
    const health = await businessHealthRuntime.evaluateFrom(ctx, tenantId);

    const plan = Object.fromEntries(
      Object.entries(intelligence.sectionPlan).map(([base, entry]) => [base, entry]),
    );

    return {
      success: true,
      data: {
        conversionScore: intelligence.conversionScore,
        businessHealth: { overall: health.health.overallScore, grade: health.health.grade },
        goalAlignment: { overall: ctx.goals.alignment.overall },
        cta: intelligence.cta,
        themeEmphasis: intelligence.themeEmphasis,
        hiddenBases: intelligence.hiddenBases,
        homepageOrder: intelligence.homepageOrder,
        sectionPlan: plan,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}
