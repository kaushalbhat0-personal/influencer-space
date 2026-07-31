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
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return { success: false, error: "Unauthorized" };

    const [content, website] = await Promise.all([
      websiteAggregateService.build(tenantId),
      prisma.website.findUnique({
        where: { tenantId },
        select: { themePackageId: true },
      }),
    ]);

    return {
      success: true,
      content: JSON.parse(JSON.stringify(content)),
      themePackageId: website?.themePackageId ?? null,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to load preview data",
    };
  }
}
