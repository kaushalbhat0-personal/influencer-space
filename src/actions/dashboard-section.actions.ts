"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BuilderService } from "@/lib/builder/builder-service";
import { componentRegistry } from "@/lib/registry/components";
import { SECTION_CATALOG } from "@/lib/builder/catalog";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";

export async function addSectionFromDashboard(componentId: string): Promise<{ success: boolean; sectionId?: string; error?: string }> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { success: false, error: "Unauthorized" };
  const entry = SECTION_CATALOG.find((e) => e.componentId === componentId);
  if (!entry) return { success: false, error: "Unknown section" };
  try { registerBuiltinComponents(); } catch {}
  if (!componentRegistry.get(componentId)) return { success: false, error: "Component not registered" };

  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) return { success: false, error: "Website not found" };

  const service = new BuilderService();
  const pages = await service.load(website.id);
  const page = pages.find((p) => p.isHome) ?? pages[0];
  if (!page) return { success: false, error: "No page" };

  // Create a new section instance with unique id, same moduleId, empty config
  const uid = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const newSectionId = uid();
  const newSlotId = uid();
  const newSection = {
    id: newSectionId,
    name: entry.name,
    order: page.sections.length,
    visible: true,
    locked: false,
    slots: [
      {
        id: newSlotId,
        moduleId: componentId,
        parentId: newSectionId,
        order: 0,
        visible: true,
        locked: false,
        config: {},
        metadata: {},
      },
    ],
    metadata: {},
  };

  const newPages = [...pages];
  const pageIdx = newPages.findIndex((p) => p.id === page.id);
  if (pageIdx === -1) return { success: false, error: "Page not found" };
  newPages[pageIdx] = { ...page, sections: [...page.sections, newSection] };

  await service.save(website.id, newPages);
  try {
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/admin/dashboard");
    revalidatePath("/builder");
  } catch {}
  return { success: true, sectionId: newSectionId };
}
