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
import { publishRepository } from "./repository";

type PageData = {
  pages: BuilderPage[];
  themePackageId: string;
  themeColors: Record<string, string>;
  themeFonts: Record<string, string>;
};

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
    options?: { pages?: PageData; correlation?: CorrelationContext },
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

      const snapshotData = options?.pages ?? await this.loadFromBuilder(websiteId);

      const result = await publishRepository.createPublish(websiteId, snapshotData);

      const correlationId = safeCorrelationId(options?.correlation);

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

  async publishFromPages(
    tenantId: string,
    pages: PageData,
    correlation?: CorrelationContext,
  ): Promise<{ success: boolean; version?: number; error?: string }> {
    return this.publish(tenantId, { pages, correlation });
  }

  async preview(tenantId: string): Promise<{ success: boolean; version?: number; error?: string }> {
    try {
      const website = await prisma.website.findUnique({
        where: { tenantId },
        select: { id: true },
      });
      if (!website) return { success: false, error: "Website not found" };

      const snapshotData = await this.loadFromBuilder(website.id);
      const result = await publishRepository.createPreview(website.id, snapshotData);

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

  private async loadFromBuilder(websiteId: string): Promise<PageData> {
    const builderService = await import("@/lib/builder/builder-service").then(
      (m) => new m.BuilderService(),
    );
    const [pages, websiteConfig] = await Promise.all([
      builderService.load(websiteId),
      prisma.website.findUnique({
        where: { id: websiteId },
        select: { themePackageId: true, themeColors: true, themeFonts: true },
      }),
    ]);

    return {
      pages,
      themePackageId: websiteConfig?.themePackageId ?? "neon-dark",
      themeColors: (websiteConfig?.themeColors ?? {}) as Record<string, string>,
      themeFonts: (websiteConfig?.themeFonts ?? {}) as Record<string, string>,
    };
  }
}

export const publishingService = new PublishingService();
