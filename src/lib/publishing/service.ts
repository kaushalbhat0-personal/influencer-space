/**
 * Publishing Service v2.1.0
 *
 * Canonical publish pipeline — single source of truth for publish state.
 *
 * Flow:
 *   validate → repository (transaction) → commit
 *   → event dispatch (fire-and-forget)
 *   → cache invalidation (fire-and-forget)
 *
 * Correlation flows through CorrelationContext, never self-generated.
 * Events and cache are explicitly after the transaction commits.
 */

import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant, buildPreviewUrl } from "@/lib/config/platform";
import { platformEventBus } from "@/lib/events";
import { revalidatePath } from "next/cache";
import { safeCorrelationId } from "@/lib/platform/correlation/context";
import type { CorrelationContext } from "@/lib/platform/correlation/types";
import type { BuilderPage } from "@/lib/builder/types";
import { websiteAggregateService } from "@/lib/content/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
import { themeResolver } from "@/lib/theme/resolver-new";
import type { PublishedSnapshot } from "@/types/snapshot";
import { publishRepository } from "./repository";

export type PublishState = "draft" | "preview" | "live" | "archived";

export interface PublishStatus {
  state: PublishState;
  publishedAt: string | null;
  version: number;
  previewUrl: string | null;
  storefrontUrl: string | null;
}

export class PublishingService {
  async getStatus(tenantId: string): Promise<{ success: boolean; data?: PublishStatus; error?: string }> {
    try {
      const [tenant, website] = await Promise.all([
        prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { subdomain: true, customDomain: true },
        }),
        prisma.website.findUnique({
          where: { tenantId },
          select: {
            publishStatus: { select: { state: true, liveVersion: true, publishedAt: true } },
          },
        }),
      ]);
      if (!tenant) return { success: false, error: "Tenant not found" };

      const storeRoot = buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain);
      const dbStatus = website?.publishStatus;

      return {
        success: true,
        data: {
          state: (dbStatus?.state as PublishState) ?? "draft",
          publishedAt: dbStatus?.publishedAt?.toISOString() ?? null,
          version: dbStatus?.liveVersion ?? 0,
          previewUrl: `${storeRoot}?preview=true`,
          storefrontUrl: storeRoot,
        },
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Status check failed" };
    }
  }

  async publish(
    tenantId: string,
    correlation?: CorrelationContext,
  ): Promise<{ success: boolean; version?: number; error?: string }> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, subdomain: true, customDomain: true },
      });
      if (!tenant) return { success: false, error: "Tenant not found" };

      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!website) return { success: false, error: "Website not found. Complete onboarding first." };

      const websiteId = website.id;
      const storeRoot = buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain);

      const [builderPages, websiteFull, aggregate, navItems, correlationId] = await Promise.all([
        this.loadBuilderPages(websiteId),
        prisma.website.findUnique({
          where: { id: websiteId },
          select: { themePackageId: true, themeColors: true, themeFonts: true },
        }),
        websiteAggregateService.build(tenantId),
        navigationService.getOrGenerate(tenantId),
        Promise.resolve(safeCorrelationId(correlation)),
      ]);

      const resolvedTheme = themeResolver.resolveForSnapshot(
        websiteFull?.themePackageId ?? "com.creatos.neon-dark",
      );
      const canonicalSnapshot: PublishedSnapshot = {
        _schema: "creatorstore.snapshot",
        _version: 1,
        metadata: {
          version: 0,
          publishedAt: new Date().toISOString(),
          previousVersion: null,
          correlationId,
          generatedBy: "dashboard",
        },
        content: aggregate,
        layout: {
          pages: builderPages.map((p) => ({
            id: p.id,
            name: p.name,
            slug: p.slug,
            isHome: p.isHome,
            order: p.order,
            sections: p.sections.map((s) => ({
              id: s.id,
              moduleId: s.slots.length > 0 ? s.slots[0]!.moduleId : s.name,
              config: s.slots.length > 0 ? s.slots[0]!.config : {},
              order: s.order,
              visible: s.visible,
            })),
          })),
        },
        theme: {
          packageId: resolvedTheme?.packageId ?? websiteFull?.themePackageId ?? "com.creatos.neon-dark",
          colors: {
            primary: resolvedTheme?.colors.primary ?? "#6366F1",
            secondary: resolvedTheme?.colors.secondary ?? "#818CF8",
            accent: resolvedTheme?.colors.accent ?? "#A5B4FC",
            background: resolvedTheme?.colors.background ?? "#09090b",
            foreground: resolvedTheme?.colors.foreground ?? "#fafafa",
            muted: resolvedTheme?.colors.muted ?? "#a1a1aa",
          },
          typography: {
            heading: resolvedTheme?.typography.heading ?? "Inter",
            body: resolvedTheme?.typography.body ?? "Inter",
          },
        },
        navigation: navItems.map((n) => ({
          id: n.id,
          label: n.label,
          href: n.href,
          type: n.type,
          order: n.order,
          visible: n.visible,
          ...(n.target ? { target: n.target } : {}),
          ...(n.icon ? { icon: n.icon } : {}),
        })),
        renderingHints: {},
      };

      const result = await publishRepository.createPublish(websiteId, canonicalSnapshot);

      try {
        platformEventBus.publish("WebsitePublished", {
          tenantId,
          websiteId,
          version: result.version,
          storefrontUrl: storeRoot,
          correlationId,
        });
      } catch {
        // event emission is fire-and-forget; already committed
      }

      try {
        revalidatePath("/", "layout");
        revalidatePath("/admin/dashboard");
      } catch {
        // cache invalidation is fire-and-forget; already committed
      }

      return { success: true, version: result.version };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Publish failed" };
    }
  }

  async preview(tenantId: string): Promise<{ success: boolean; version?: number; error?: string }> {
    try {
      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true, themePackageId: true, themeColors: true, themeFonts: true },
      });
      if (!website) return { success: false, error: "Website not found" };

      const [builderPages, aggregate, navItems] = await Promise.all([
        this.loadBuilderPages(website.id),
        websiteAggregateService.build(tenantId),
        navigationService.getOrGenerate(tenantId),
      ]);

      const resolvedTheme = themeResolver.resolveForSnapshot(website.themePackageId ?? "com.creatos.neon-dark");
      const previewSnapshot: PublishedSnapshot = {
        _schema: "creatorstore.snapshot",
        _version: 1,
        metadata: { version: 0, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: `preview_${website.id}`, generatedBy: "dashboard" },
        content: aggregate,
        layout: {
          pages: builderPages.map((p) => ({
            id: p.id, name: p.name, slug: p.slug, isHome: p.isHome, order: p.order,
            sections: p.sections.map((s) => ({
              id: s.id, moduleId: s.slots.length > 0 ? s.slots[0]!.moduleId : s.name,
              config: s.slots.length > 0 ? s.slots[0]!.config : {},
              order: s.order, visible: s.visible,
            })),
          })),
        },
        theme: {
          packageId: resolvedTheme?.packageId ?? website.themePackageId ?? "com.creatos.neon-dark",
          colors: { primary: resolvedTheme?.colors.primary ?? "#6366F1", secondary: resolvedTheme?.colors.secondary ?? "#818CF8", accent: resolvedTheme?.colors.accent ?? "#A5B4FC", background: resolvedTheme?.colors.background ?? "#09090b", foreground: resolvedTheme?.colors.foreground ?? "#fafafa", muted: resolvedTheme?.colors.muted ?? "#a1a1aa" },
          typography: { heading: resolvedTheme?.typography.heading ?? "Inter", body: resolvedTheme?.typography.body ?? "Inter" },
        },
        navigation: navItems.map((n) => ({
          id: n.id,
          label: n.label,
          href: n.href,
          type: n.type,
          order: n.order,
          visible: n.visible,
          ...(n.target ? { target: n.target } : {}),
          ...(n.icon ? { icon: n.icon } : {}),
        })),
        renderingHints: {},
      };

      const result = await publishRepository.createPreview(website.id, previewSnapshot);
      return { success: true, version: result.version };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Preview failed" };
    }
  }

  async rollback(tenantId: string, version: number): Promise<{ success: boolean; error?: string }> {
    try {
      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!website) return { success: false, error: "Website not found" };

      const { publishSnapshotService } = await import("./snapshot");
      const data = await publishSnapshotService.rollback(website.id, version);

      const builderService = await import("@/lib/builder/builder-service").then(
        (m) => new m.BuilderService(),
      );
      await builderService.save(website.id, data.pages);

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Rollback failed" };
    }
  }

  async getPreviewUrl(tenantId: string): Promise<{ success: boolean; data?: string; error?: string }> {
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true, customDomain: true },
      });
      if (!tenant) return { success: false, error: "Tenant not found" };

      return { success: true, data: buildPreviewUrl(tenant.subdomain, tenant.customDomain) };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Preview URL failed" };
    }
  }

  async validateBeforePublish(tenantId: string): Promise<{
    success: boolean;
    issues?: string[];
    error?: string;
  }> {
    try {
      const issues: string[] = [];

      const productCount = await prisma.product.count({ where: { tenantId } });
      if (productCount === 0) issues.push("No products. Add at least one product.");

      const hasDomain = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customDomain: true },
      });
      if (!hasDomain?.customDomain) issues.push("Using subdomain. Consider adding a custom domain.");

      return { success: true, issues };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Validation failed" };
    }
  }

  private async loadBuilderPages(websiteId: string): Promise<BuilderPage[]> {
    const builderService = await import("@/lib/builder/builder-service").then(
      (m) => new m.BuilderService(),
    );
    return builderService.load(websiteId);
  }
}

export const publishingService = new PublishingService();
