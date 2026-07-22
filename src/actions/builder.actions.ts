"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BuilderService } from "@/lib/builder/builder-service";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { BuilderPage } from "@/lib/builder/types";

const builderService = new BuilderService();

async function getWebsiteId(): Promise<string> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) throw new Error("Unauthorized");
  const { prisma } = await import("@/lib/prisma");
  const website = await prisma.website.findUnique({
    where: { tenantId: session.user.tenantId },
    select: { id: true },
  });
  if (!website) throw new Error("No website");
  return website.id;
}

export async function loadBuilderPages(): Promise<{ success: boolean; pages?: BuilderPage[]; error?: string }> {
  try {
    const websiteId = await getWebsiteId();
    const pages = await builderService.load(websiteId);
    return { success: true, pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveBuilderPages(pages: BuilderPage[]): Promise<{ success: boolean; error?: string }> {
  try {
    const websiteId = await getWebsiteId();
    await builderService.save(websiteId, pages);
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function publishWebsite(pages: BuilderPage[]): Promise<{ success: boolean; version?: number; error?: string }> {
  try {
    const websiteId = await getWebsiteId();

    // Save first, then publish
    await builderService.save(websiteId, pages);

    const { prisma } = await import("@/lib/prisma");
    const website = await prisma.website.findUnique({
      where: { id: websiteId },
      select: { themePackageId: true, themeColors: true, themeFonts: true },
    });

    const result = await publishSnapshotService.publish(websiteId, {
      pages,
      themePackageId: website?.themePackageId || "neon-dark",
      themeColors: (website?.themeColors || {}) as Record<string, string>,
      themeFonts: (website?.themeFonts || {}) as Record<string, string>,
    });

    return { success: true, version: result.version };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function listSnapshots(): Promise<{ success: boolean; snapshots?: { version: number; state: string; createdAt: Date }[]; error?: string }> {
  try {
    const websiteId = await getWebsiteId();
    const snapshots = await publishSnapshotService.list(websiteId);
    return { success: true, snapshots };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function rollbackToVersion(version: number): Promise<{ success: boolean; pages?: BuilderPage[]; error?: string }> {
  try {
    const websiteId = await getWebsiteId();
    const data = await publishSnapshotService.rollback(websiteId, version);

    // Restore pages to builder state
    await builderService.save(websiteId, data.pages);

    return { success: true, pages: data.pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
