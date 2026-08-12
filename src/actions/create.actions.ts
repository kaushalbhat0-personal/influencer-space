"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { publishingService } from "@/lib/publishing/service";
import { blueprintRegistry } from "@/lib/blueprint/registry";
import { BuilderService } from "@/lib/builder/builder-service";
import { resolveModuleId, moduleIdToDisplayName } from "@/lib/registry/resolve-module";
import { componentRegistry } from "@/lib/registry/components";
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
    // RCCF-19 P1-M: each blueprint section becomes a REAL slot (moduleId +
    // config). Previously sections were created with `slots: []`, which
    // builderPagesToLayoutSnapshot drops at publish — producing a blank site.
    sections: pageDef.sections
      .filter((secDef) => componentRegistry.get(resolveModuleId(secDef.moduleId)) !== undefined)
      .map((secDef) => {
        const moduleId = resolveModuleId(secDef.moduleId);
        return {
          id: secDef.id,
          name: moduleIdToDisplayName(moduleId),
          order: secDef.order,
          visible: secDef.visible,
          locked: false,
          metadata: {},
          slots: [
            {
              id: `slot_${secDef.id}_0`,
              moduleId,
              parentId: null,
              order: 0,
              visible: true,
              locked: false,
              config: secDef.config ?? {},
              metadata: {},
            },
          ],
        };
      }),
  }));
}

/**
 * RCCF-19 P1-M / RCCF-21: apply a blueprint layout to a website and publish.
 *
 * AUTHORIZED (RCCF-21): the client-supplied `tenantId` parameter has been
 * removed — ownership is derived entirely from the authenticated session and
 * the database. The website's tenant must match the caller's authoritative
 * tenant (from the User row, which provisioning updates; the session token can
 * be stale immediately after a fresh manual provision). The check runs BEFORE
 * any mutation or publish, so an unauthorized caller causes zero side effects.
 *
 * NON-DESTRUCTIVE: if the website already has builder pages, the existing
 * layout is preserved (a repeated/manual creation request must never wipe
 * creator content). Theme is still applied (presentation), then the canonical
 * PublishingService produces a new PublishedSnapshot.
 */
export async function applyBlueprintToWebsite(
  websiteId: string,
  blueprintId: string,
  themeId: string,
): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return { success: false, error: "Unauthorized" };

  const website = await prisma.website.findUnique({
    where: { id: websiteId },
    select: { tenantId: true },
  });
  if (!website) return { success: false, error: "Website not found" };

  // Authoritative ownership: the authenticated user's tenant (DB row) must own
  // the website's tenant. No mutation/publish happens unless this passes.
  const caller = await prisma.user.findUnique({
    where: { id: userId },
    select: { tenantId: true },
  });
  if (!caller?.tenantId || caller.tenantId !== website.tenantId) {
    return { success: false, error: "Forbidden" };
  }

  const tenantId = website.tenantId;
  const pages = blueprintToBuilderPages(blueprintId);

  const existing = await builderService.load(websiteId);
  if (existing.length === 0 && pages.length > 0) {
    await builderService.save(websiteId, pages);
  }

  await prisma.website.update({
    where: { id: websiteId },
    data: { themePackageId: themeId },
  });

  const result = await publishingService.publish(tenantId);
  if (!result.success) return { success: false, error: result.error ?? "Publish failed" };

  return { success: true };
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

    const result = await applyBlueprintToWebsite(website.id, blueprintId, themeId);
    if (!result.success) return result;

    revalidatePath("/");
    revalidatePath("/admin/dashboard");

    return { success: true, websiteId: website.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Creation failed" };
  }
}
