"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { publishingService } from "@/lib/publishing/service";
import { blueprintRegistry } from "@/lib/blueprint/registry";
import { BuilderService } from "@/lib/builder/builder-service";
import type { BuilderPage } from "@/lib/builder/types";

const builderService = new BuilderService();

function blueprintToBuilderPages(blueprintId: string): BuilderPage[] {
  const bp = blueprintRegistry.resolveInheritedBlueprint(blueprintId);
  if (!bp) return [];

  return bp.pages.map((pageDef) => ({
    id: pageDef.id,
    name: pageDef.name,
    slug: pageDef.slug,
    order: pageDef.order,
    isHome: pageDef.isHome,
    theme: "",
    metadata: {},
    sections: pageDef.sections.map((secDef) => ({
      id: secDef.id,
      name: secDef.moduleId,
      order: secDef.order,
      visible: secDef.visible,
      locked: false,
      metadata: {},
      slots: [],
    })),
  }));
}

export async function createWebsite(formData: FormData): Promise<{
  success: boolean;
  websiteId?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const tenantId = session?.user?.tenantId;
    if (!tenantId) return { success: false, error: "Unauthorized" };

    const blueprintId = formData.get("blueprintId") as string || "com.creatos.creator";
    const themeId = formData.get("themeId") as string || "com.creatos.neon-dark";

    const website = await prisma.website.findUnique({ where: { tenantId } });
    if (!website) return { success: false, error: "Website not found" };

    const pages = blueprintToBuilderPages(blueprintId);

    await prisma.website.update({
      where: { id: website.id },
      data: { themePackageId: themeId },
    });

    if (pages.length > 0) {
      await builderService.save(website.id, pages);
    }

    const result = await publishingService.publish(tenantId);
    if (!result.success) return { success: false, error: result.error ?? "Publish failed" };

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return { success: true, websiteId: website.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Creation failed" };
  }
}
