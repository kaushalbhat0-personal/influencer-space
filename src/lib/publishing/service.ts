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
import { websiteAggregateService } from "@/modules/tenant/application/website-aggregate.service";
import { navigationService } from "@/lib/navigation/service";
import { themeResolver } from "@/lib/theme/resolver-new";
import type { ResolvedSnapshotTheme } from "@/lib/theme/resolver-new";
import { resolveModuleId } from "@/lib/registry/resolve-module";
import { workspacePolicy } from "@/lib/workspace/policy";
import type { PublishedSnapshot } from "@/types/snapshot";
import { publishRepository } from "@/modules/tenant/infrastructure/publishing-repository";
import { logger } from "@/lib/observability/logger";
import { runWorkflow } from "@/lib/observability/workflow-diagnostics";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";

const FALLBACK_THEME_ID = "com.creatos.neon-dark";

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
    const startTime = Date.now();
    logger.info("Publishing started", "publishing", { correlation, metadata: { tenantId } });
    try {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, subdomain: true, customDomain: true },
      });
      if (!tenant) return { success: false, error: "Tenant not found" };

      const workspace = await prisma.workspace.findUnique({ where: { tenantId } });
      if (workspace) {
        try {
          await workspacePolicy.assertCanPublish(workspace.id);
        } catch (e) {
          return { success: false, error: e instanceof Error ? e.message : "Cannot publish" };
        }
      }

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

      const blocking = await this.collectBlockingIssues(builderPages);
      if (blocking.length > 0) {
        return { success: false, error: blocking.join("; ") };
      }

      const websiteColors = websiteFull?.themeColors as Record<string, string> | null ?? {};
      const websiteFonts = websiteFull?.themeFonts as Record<string, string> | null ?? {};
      const resolvedTheme = themeResolver.resolveForSnapshot(
        websiteFull?.themePackageId ?? FALLBACK_THEME_ID,
        "dark",
        {
          overrides: Object.keys(websiteColors).length > 0 || Object.keys(websiteFonts).length > 0 ? {
            colors: {
              primary: websiteColors.primary as string | undefined,
              secondary: websiteColors.secondary as string | undefined,
              accent: websiteColors.accent as string | undefined,
              background: websiteColors.background as string | undefined,
              foreground: websiteColors.foreground as string | undefined,
              muted: websiteColors.muted as string | undefined,
            },
            typography: {
              heading: websiteFonts.heading as string | undefined,
              body: websiteFonts.body as string | undefined,
            },
          } as Partial<ResolvedSnapshotTheme> : undefined,
        },
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
            // Publish EVERY block in a section (not just the first slot).
            // Sections with no blocks are omitted — an empty section cannot
            // render and would otherwise emit an unregistered module id.
            sections: p.sections.flatMap((s) =>
              s.slots.length > 0
                ? s.slots.map((slot, i) => ({
                    id: `${s.id}__${slot.id}`,
                    moduleId: slot.moduleId,
                    config: slot.config ?? {},
                    order: s.order * 100 + i,
                    visible: s.visible && slot.visible !== false,
                  }))
                : [],
            ),
          })),
        },
        theme: {
          packageId: resolvedTheme?.packageId ?? websiteFull?.themePackageId ?? FALLBACK_THEME_ID,
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
        revalidatePath(`/${tenant.subdomain}`);
        if (tenant.customDomain) {
          revalidatePath(`/${tenant.customDomain}`);
        }
      } catch {
        // cache invalidation is fire-and-forget; already committed
      }

      logger.info("Publishing completed", "publishing", { correlation, duration: Date.now() - startTime, metadata: { tenantId, version: result.version } });
      metricsService.recordDuration("publish", Date.now() - startTime, { status: "success", tenantId });
      metricsService.recordOutcome("publish", true, { tenantId });
      return { success: true, version: result.version };
    } catch (error) {
      captureError(error, { service: "publishing", operation: "publish", correlation, tenantId });
      return { success: false, error: error instanceof Error ? error.message : "Publish failed" };
    }
  }

  async markChangesPending(tenantId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
      if (!website) return { success: false, error: "Website not found" };

      const status = await prisma.publishStatus.findUnique({ where: { websiteId: website.id } });
      if (status?.state === "live") {
        await prisma.publishStatus.update({
          where: { websiteId: website.id },
          data: { state: "draft" },
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Failed to mark changes" };
    }
  }

  async preview(tenantId: string): Promise<{ success: boolean; version?: number; error?: string }> {
    const startTime = Date.now();
    logger.info("Preview started", "publishing", { metadata: { tenantId } });
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

      const websiteColors = (website.themeColors ?? {}) as Record<string, string>;
      const websiteFonts = (website.themeFonts ?? {}) as Record<string, string>;
      const resolvedTheme = themeResolver.resolveForSnapshot(
        website.themePackageId ?? FALLBACK_THEME_ID,
        "dark",
        {
          overrides: Object.keys(websiteColors).length > 0 || Object.keys(websiteFonts).length > 0 ? {
            colors: {
              primary: websiteColors.primary,
              secondary: websiteColors.secondary,
              accent: websiteColors.accent,
              background: websiteColors.background,
              foreground: websiteColors.foreground,
              muted: websiteColors.muted,
            },
            typography: {
              heading: websiteFonts.heading,
              body: websiteFonts.body,
            },
          } as Partial<ResolvedSnapshotTheme> : undefined,
        },
      );
      const previewSnapshot: PublishedSnapshot = {
        _schema: "creatorstore.snapshot",
        _version: 1,
        metadata: { version: 0, publishedAt: new Date().toISOString(), previousVersion: null, correlationId: `preview_${website.id}`, generatedBy: "dashboard" },
        content: aggregate,
        layout: {
          pages: builderPages.map((p) => ({
            id: p.id, name: p.name, slug: p.slug, isHome: p.isHome, order: p.order,
            sections: p.sections.flatMap((s) =>
              s.slots.length > 0
                ? s.slots.map((slot, i) => ({
                    id: `${s.id}__${slot.id}`,
                    moduleId: slot.moduleId,
                    config: slot.config ?? {},
                    order: s.order * 100 + i,
                    visible: s.visible && slot.visible !== false,
                  }))
                : [],
            ),
          })),
        },
        theme: {
          packageId: resolvedTheme?.packageId ?? website.themePackageId ?? FALLBACK_THEME_ID,
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
      logger.info("Preview completed", "publishing", { duration: Date.now() - startTime, metadata: { tenantId, version: result.version } });
      return { success: true, version: result.version };
    } catch (error) {
      captureError(error, { service: "publishing", operation: "preview", tenantId });
      return { success: false, error: error instanceof Error ? error.message : "Preview failed" };
    }
  }

  async rollback(tenantId: string, version: number): Promise<{ success: boolean; error?: string }> {
    const startTime = Date.now();
    logger.info("Rollback started", "publishing", { metadata: { tenantId, version } });
    try {
      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!website) return { success: false, error: "Website not found" };

      const { publishSnapshotService } = await import("./snapshot");
      const data = await publishSnapshotService.rollback(website.id, version);
      if (data.pages.length === 0) {
        return { success: false, error: `Snapshot version ${version} contains no pages` };
      }

      const builderService = await import("@/lib/builder/builder-service").then(
        (m) => new m.BuilderService(),
      );
      await builderService.save(website.id, data.pages);

      // Rollback restores the DRAFT; the live site stays as-is until republish.
      await this.markChangesPending(tenantId);

      logger.info("Rollback completed", "publishing", { duration: Date.now() - startTime, metadata: { tenantId, version } });
      metricsService.recordOutcome("publish", true, { tenantId, operation: "rollback" });
      return { success: true };
    } catch (error) {
      captureError(error, { service: "publishing", operation: "rollback", tenantId });
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

      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (website) {
        const builderService = await import("@/lib/builder/builder-service").then(
          (m) => new m.BuilderService(),
        );
        const pages = await builderService.load(website.id);
        const blocking = await this.collectBlockingIssues(pages);
        if (blocking.length > 0) issues.push(...blocking);
        if (pages.length === 0) issues.push("No pages. The builder is empty.");
      }

      return { success: true, issues };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : "Validation failed" };
    }
  }

  /**
   * Blocking issues that prevent a publish: no homepage, duplicate slugs,
   * or unknown (unregistered) components. Non-blocking warnings (products,
   * custom domain) are reported separately by validateBeforePublish.
   */
  private async collectBlockingIssues(pages: BuilderPage[]): Promise<string[]> {
    const issues: string[] = [];

    if (pages.length === 0) {
      return ["No pages to publish. Add sections in the builder first."];
    }

    if (!pages.some((p) => p.isHome)) {
      issues.push("No homepage selected. Mark one page as Home.");
    }

    const slugSeen = new Set<string>();
    for (const page of pages) {
      const slug = page.slug || "/";
      if (slugSeen.has(slug)) {
        issues.push(`Duplicate page slug: "${slug}".`);
      }
      slugSeen.add(slug);
    }

    const { componentRegistry } = await import("@/lib/registry/components");
    const unknown = new Set<string>();
    for (const page of pages) {
      for (const section of page.sections) {
        for (const slot of section.slots) {
          const moduleId = resolveModuleId(slot.moduleId);
          if (!componentRegistry.get(moduleId)) {
            unknown.add(moduleId);
          }
        }
      }
    }
    for (const moduleId of Array.from(unknown)) {
      issues.push(`Unknown component: "${moduleId}". Remove it in the builder.`);
    }

    return issues;
  }

  private async loadBuilderPages(websiteId: string): Promise<BuilderPage[]> {
    const builderService = await import("@/lib/builder/builder-service").then(
      (m) => new m.BuilderService(),
    );
    return builderService.load(websiteId);
  }
}

export const publishingService = new PublishingService();
