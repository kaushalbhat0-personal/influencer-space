"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BuilderService } from "@/lib/builder/builder-service";
import type { BuilderPage } from "@/lib/builder/types";

const builderService = new BuilderService();

export async function loadBuilderPages(): Promise<{ success: boolean; pages?: BuilderPage[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    const tenantId = session.user.tenantId;
    if (!tenantId) return { success: false, error: "No tenant" };

    const website = await (await import("@/lib/prisma")).prisma.website.findUnique({
      where: { tenantId },
      select: { id: true },
    });
    if (!website) return { success: false, error: "No website" };

    const pages = await builderService.load(website.id);
    return { success: true, pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveBuilderPages(pages: BuilderPage[]): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) return { success: false, error: "Unauthorized" };
    const tenantId = session.user.tenantId;
    if (!tenantId) return { success: false, error: "No tenant" };

    const website = await (await import("@/lib/prisma")).prisma.website.findUnique({
      where: { tenantId },
      select: { id: true },
    });
    if (!website) return { success: false, error: "No website" };

    await builderService.save(website.id, pages);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
