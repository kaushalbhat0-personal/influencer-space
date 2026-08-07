// ── Website Versioning (Phase 3) ────────────────────────────
// Tracks current / previous / generated / builder versions, the blueprint and
// experience versions, and evolution history length. Read-only.

import { prisma } from "@/lib/prisma";
import { experienceRegistry } from "@/modules/theme/runtime/experience";
import { evolutionHistoryStore } from "../infrastructure/history-store";
import type { WebsiteVersionInfo } from "../domain/types";

export class WebsiteVersioning {
  async info(tenantId: string): Promise<WebsiteVersionInfo> {
    const [website, publishStatus, provisioningMeta, evolutionHistory] = await Promise.all([
      prisma.website.findUnique({ where: { tenantId }, select: { id: true, themePackageId: true } }).catch(() => null),
      prisma.publishStatus.findFirst({ where: { website: { tenantId } }, select: { state: true, publishedAt: true } }).catch(() => null),
      prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: "provisioning_meta" } }, select: { value: true } }).catch(() => null),
      evolutionHistoryStore.get(tenantId).catch(() => ({})),
    ]);

    const snapshots = website
      ? await prisma.publishSnapshot.findMany({
          where: { websiteId: website.id, state: "live" },
          select: { version: true },
          orderBy: { version: "desc" },
          take: 2,
        }).catch(() => [])
      : [];

    const versions = snapshots.map((s) => s.version);
    const current = versions[0] ?? null;
    const previous = versions[1] ?? null;
    const generated = versions.length > 0 ? versions[versions.length - 1] : null;
    const blueprint = (provisioningMeta?.value as { templateId?: string | null })?.templateId ?? null;
    const experience = website?.themePackageId
      ? (experienceRegistry.resolve({ id: website.themePackageId })?.id ?? website.themePackageId)
      : null;

    return {
      currentVersion: current,
      previousVersion: previous,
      generatedVersion: generated,
      builderVersion: current, // the builder's latest publish equals the live version
      blueprint,
      experience,
      publishedAt: publishStatus?.publishedAt?.toISOString() ?? null,
      evolutionHistoryLength: Object.keys(evolutionHistory).length,
    };
  }
}

export const websiteVersioning = new WebsiteVersioning();
