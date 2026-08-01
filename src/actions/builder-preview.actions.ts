"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";

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
  diagnostics?: { invalidAssetIds: Array<{ id: string; module: string; field?: string }>; skippedAssets: number; moduleFailures: string[] };
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return { success: false, error: "Unauthorized" };

    const [aggResult, website] = await Promise.all([
      websiteAggregateService.buildWithDiagnostics(tenantId),
      prisma.website.findUnique({
        where: { tenantId },
        select: { themePackageId: true, themeColors: true, themeFonts: true },
      }),
    ]);

    return {
      success: true,
      content: JSON.parse(JSON.stringify(aggResult.aggregate)),
      themePackageId: website?.themePackageId ?? null,
      themeColors: (website?.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website?.themeFonts ?? {}) as Record<string, string>,
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
