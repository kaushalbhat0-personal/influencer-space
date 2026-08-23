"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";

/**
 * Live content for the builder preview. The builder canvas renders the exact
 * same runtime as the storefront: live aggregate → LayoutEngine → renderers.
 * This action supplies only the LIVE content + theme; layout comes from the
 * current builder draft, so the preview always equals Published Blueprint +
 * Current Draft.
 */
export async function getLivePreviewData(): Promise<{
  success: boolean;
  content?: unknown;
  themePackageId?: string | null;
  themeColors?: Record<string, string>;
  themeFonts?: Record<string, string>;
  /** RCCF-71.1: persisted appearance config (borderRadius/layoutDensity) so the
   * Builder canvas resolves the same appearance as the preview route + publish. */
  themeConfig?: Record<string, string>;
  /** RCCF-LAUNCH-TRACK-05: the tenant's plan so the preview resolves theme
   * experience capabilities identically to the storefront. */
  planCode?: string | null;
  diagnostics?: { invalidAssetIds: Array<{ id: string; module: string; field?: string }>; skippedAssets: number; moduleFailures: string[] };
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return { success: false, error: "Unauthorized" };

    const [aggResult, website, plan] = await Promise.all([
      websiteAggregateService.buildWithDiagnostics(tenantId),
      prisma.website.findUnique({
        where: { tenantId },
        select: { themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
      }),
      resolveActivePlan(undefined, tenantId).catch(() => ({ code: null })),
    ]);

    return {
      success: true,
      content: JSON.parse(JSON.stringify(aggResult.aggregate)),
      themePackageId: website?.themePackageId ?? null,
      themeColors: (website?.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website?.themeFonts ?? {}) as Record<string, string>,
      themeConfig: (website?.themeConfig ?? {}) as Record<string, string>,
      planCode: plan?.code ?? null,
      diagnostics: {
        invalidAssetIds: aggResult.invalidAssetIds,
        skippedAssets: aggResult.skippedAssets,
        moduleFailures: aggResult.moduleFailures,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load preview data",
    };
  }
}
