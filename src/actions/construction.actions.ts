"use server";

/**
 * Construction snapshot loader — IMPLEMENTATION-29.
 *
 * Loads the REAL storefront runtime snapshot (Builder Runtime: Draft Layout +
 * Live CMS Content) through the exact same pipeline the storefront page and the
 * Builder canvas use. The Construction Preview consumes this data — there is NO
 * second renderer and NO invented preview data. Business logic is untouched.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { BuilderService } from "@/lib/builder/builder-service";
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { sessionService } from "@/lib/generation/session";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

export interface ConstructionSnapshotData {
  theme: Record<string, string>;
  navigation: Array<{ id: string; label: string; href: string; type: string; visible: boolean }>;
  sections: Array<{ sectionId: string; moduleId: string; config: Record<string, unknown> }>;
  meta: {
    title: string;
    description: string;
    themeId: string | null;
    creatorName: string | null;
    tagline: string | null;
  };
}

export interface GetConstructionSnapshotInput {
  /** Resolve the tenant from an active generation session (onboarding). */
  sessionId?: string;
  /** Resolve the tenant from a storefront subdomain (dev/tooling). */
  subdomain?: string;
}

export interface GetConstructionSnapshotResult {
  success: boolean;
  snapshot?: ConstructionSnapshotData | null;
  error?: string;
}

export async function getConstructionSnapshot(
  input: GetConstructionSnapshotInput,
): Promise<GetConstructionSnapshotResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const isSuperAdmin = session.user.role === "SUPER_ADMIN";

    let tenantId: string | null = null;

    if (input.sessionId) {
      const generation = await sessionService.getById(input.sessionId);
      if (!generation) return { success: false, error: "Not found" };
      // A generation session is only readable by its owning creator (or an
      // established cross-tenant administrator). Non-owners are masked as
      // "Not found" to avoid revealing whether the session exists.
      if (!isSuperAdmin && generation.creatorId !== session.user.id) {
        return { success: false, error: "Not found" };
      }
      if (generation.workspaceId) {
        const workspace = await workspaceRepository.findById(generation.workspaceId);
        tenantId = workspace?.tenantId ?? null;
      }
    } else if (input.subdomain) {
      const tenant = await prisma.tenant.findFirst({ where: { subdomain: input.subdomain } });
      if (!tenant) return { success: true, snapshot: null };
      // The snapshot pipeline resolves a tenant from a client-supplied
      // subdomain, so the resolved tenant must belong to the caller. DB-backed:
      // the token's tenantId can be stale for a freshly provisioned tenant.
      const isMember = await prisma.user.count({ where: { id: session.user.id, tenantId: tenant.id } });
      if (!isSuperAdmin && isMember === 0) {
        return { success: false, error: "Not found" };
      }
      tenantId = tenant.id;
    }

    if (!tenantId) return { success: true, snapshot: null };

    const website = await prisma.website.findUnique({
      where: { tenantId },
      select: { id: true, themePackageId: true, themeColors: true, themeFonts: true },
    });
    if (!website) return { success: true, snapshot: null };

    const builderService = new BuilderService();
    const [builderPages, aggResult, navItems] = await Promise.all([
      builderService.load(website.id),
      websiteAggregateService.buildWithDiagnostics(tenantId),
      navigationService.getOrGenerate(tenantId),
    ]);
    if (builderPages.length === 0) return { success: true, snapshot: null };

    const snapshot = buildRuntimeSnapshot({
      websiteId: website.id,
      correlationId: `construction_${tenantId}`,
      builderPages,
      aggregate: aggResult.aggregate,
      navItems,
      themePackageId: website.themePackageId,
      themeColors: (website.themeColors ?? {}) as Record<string, string>,
      themeFonts: (website.themeFonts ?? {}) as Record<string, string>,
    });

    const doc = layoutEngine.resolve(snapshot as Parameters<typeof layoutEngine.resolve>[0]);
    const home = doc.pages.find((p) => p.isHome) ?? doc.pages[0];

    return {
      success: true,
      snapshot: {
        theme: doc.theme,
        navigation: doc.navigation,
        sections:
          home?.sections
            .filter((s) => s.visible)
            .map((s) => ({ sectionId: s.id, moduleId: s.moduleId, config: s.config })) ?? [],
        meta: {
          title: doc.metadata.title,
          description: doc.metadata.description,
          themeId: website.themePackageId ?? null,
          creatorName: aggResult.aggregate.identity?.name ?? null,
          tagline: aggResult.aggregate.identity?.tagline ?? null,
        },
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load construction snapshot" };
  }
}
