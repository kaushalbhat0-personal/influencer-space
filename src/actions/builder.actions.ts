"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BuilderService } from "@/lib/builder/builder-service";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import type { BuilderPage } from "@/lib/builder/types";
import { storefrontToBuilderPages } from "@/lib/builder/artifact-loader";

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

async function tryLoadFromArtifact(_websiteId: string): Promise<BuilderPage[] | null> {
  try {
    void _websiteId;
    const session = await getServerSession(authOptions);
    if (!session?.user?.tenantId) return null;
    const { prisma } = await import("@/lib/prisma");
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: session.user.tenantId, key: "builder_artifact" } },
    });
    if (!setting?.value) return null;

    const data = typeof setting.value === "string" ? JSON.parse(setting.value) : setting.value;
    if (!data?.sections || data.sections.length === 0) return null;

    return storefrontToBuilderPages(data);
  } catch {
    return null;
  }
}

export async function loadBuilderPages(): Promise<{ success: boolean; pages?: BuilderPage[]; error?: string }> {
  try {
    const websiteId = await getWebsiteId();

    const artifactPages = await tryLoadFromArtifact(websiteId);
    if (artifactPages) {
      return { success: true, pages: artifactPages };
    }

    const pages = await builderService.load(websiteId);
    return { success: true, pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveBuilderPages(pages: BuilderPage[]): Promise<{ success: boolean; error?: string }> {
  try {
    const websiteId = await getWebsiteId();
    const { prisma } = await import("@/lib/prisma");
    await builderService.save(websiteId, pages);

    const publishStatus = await prisma.publishStatus.findUnique({
      where: { websiteId },
      select: { state: true, liveVersion: true },
    });

    if (publishStatus?.state === "live") {
      await prisma.publishStatus.update({
        where: { websiteId },
        data: { state: "draft" },
      });
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function publishWebsite(_pages: BuilderPage[]): Promise<{ success: boolean; version?: number; error?: string }> {
  return { success: false, error: "Publishing from builder is no longer supported. Use the Dashboard to publish." };
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

    await builderService.save(websiteId, data.pages);

    return { success: true, pages: data.pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
