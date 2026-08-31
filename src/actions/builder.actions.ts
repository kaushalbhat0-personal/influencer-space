"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { BuilderService } from "@/lib/builder/builder-service";
import { publishingService } from "@/lib/publishing/service";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import { workspaceContext } from "@/modules/workspace/application/workspace-context";
import { workspacePolicy } from "@/lib/workspace/policy";
import { metricsService } from "@/lib/observability/metrics-service";
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

    // DB pages are the source of truth for the builder draft. The onboarding
    // artifact is a one-time seed and must NOT shadow real edits, so it is
    // only used when the creator has never saved any pages.
    const pages = await builderService.load(websiteId);
    if (pages.length > 0) {
      return { success: true, pages };
    }

    const artifactPages = await tryLoadFromArtifact(websiteId);
    if (artifactPages) {
      return { success: true, pages: artifactPages };
    }

    return { success: true, pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function saveBuilderPages(pages: BuilderPage[]): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await workspaceContext.getActive();
    if (ctx?.workspaceId) {
      try {
        await workspacePolicy.assertCanEdit(ctx.workspaceId);
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Cannot edit" };
      }
    }

    const websiteId = await getWebsiteId();
    const { prisma } = await import("@/lib/prisma");
    // R2.9 empty-state protection: an unhydrated/invalid draft must not
    // overwrite a valid DB draft with sections. This distinguishes
    // UNINITIALIZED (different page ID, e.g. defaultPage 60fa... or empty 0)
    // from INTENTIONAL user-empty (same canonical page ID, 0 sections after
    // user deleted all sections via UI and set isDirty true).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingPages = await builderService.load(websiteId).catch(() => [] as any[]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existingCount = (existingPages as any[]).reduce((acc: number, p: any) => acc + (p.sections?.length ?? 0), 0);
    const incomingCount = pages.reduce((acc, p) => acc + p.sections.length, 0);
    if (existingCount > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const existingIds = new Set((existingPages as any[]).map((p: any) => p.id));
      const incomingIds = new Set(pages.map((p) => p.id));
      const hasOverlap = Array.from(incomingIds).some((id) => existingIds.has(id));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const isSameSinglePage = pages.length === 1 && (existingPages as any[]).length === 1 && pages[0].id === (existingPages as any[])[0].id;
      if (incomingCount === 0) {
        // Empty incoming: only block if page IDs differ (uninitialized), allow if same page intentional empty
        if (!isSameSinglePage && !hasOverlap) {
          return { success: false, error: "Draft has no sections — not overwriting valid draft" };
        }
      } else if (incomingCount > 0 && incomingCount < existingCount && !hasOverlap && existingCount - incomingCount >= 5) {
        // Large drop with different page ID likely uninitialized default overwriting DB 8 with 1
        return { success: false, error: "Draft has fewer sections than valid draft — not overwriting" };
      }
    }
    const saveStart = Date.now();
    await builderService.save(websiteId, pages);
    metricsService.recordDuration("builder_save", Date.now() - saveStart, { websiteId });

    // VALIDATION-03.5 C2: the draft is the source of truth. markChangesPending
    // is cosmetic (publish-status flag) — a failure must not report the save as
    // failed (which previously dead-stopped autosave after the draft committed).
    try {
      const { tenantId } = await prisma.website.findUniqueOrThrow({
        where: { id: websiteId },
        select: { tenantId: true },
      });
      await publishingService.markChangesPending(tenantId);
    } catch {
      // best-effort — the draft is committed.
    }

    return { success: true };
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
    if (data.pages.length === 0) {
      return { success: false, error: `Snapshot version ${version} contains no pages` };
    }

    await builderService.save(websiteId, data.pages);

    // VALIDATION-03.5 B3: after restoring a draft from a snapshot, the site is
    // no longer in sync with the live version — flag changes pending so the
    // publish status reflects the divergence.
    const { prisma } = await import("@/lib/prisma");
    try {
      const website = await prisma.website.findUniqueOrThrow({
        where: { id: websiteId },
        select: { tenantId: true },
      });
      await publishingService.markChangesPending(website.tenantId);
    } catch {
      // best-effort — the draft is restored.
    }

    return { success: true, pages: data.pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}
