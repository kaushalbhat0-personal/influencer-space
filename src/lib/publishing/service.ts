/**
 * Publishing Service v1.0.0
 *
 * Orchestrates the website publish lifecycle.
 * Draft → Preview → Published → Rollback.
 */

import { prisma } from "@/lib/prisma";
import { buildStorefrontUrlWithTenant, buildPreviewUrl } from "@/lib/config/platform";
import { BaseAppService } from "@/lib/application/base";
import type { ServiceResult, CommandResult } from "@/lib/application/types";

export type PublishState = "draft" | "preview" | "published";

export interface PublishStatus {
  state: PublishState;
  publishedAt: string | null;
  version: number;
  previewUrl: string | null;
  storefrontUrl: string | null;
}

export class PublishingService extends BaseAppService {
  constructor() {
    super("PublishingService");
  }

  async getStatus(tenantId: string): Promise<ServiceResult<PublishStatus>> {
    return this.wrapAsync(async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true, customDomain: true },
      });
      if (!tenant) throw new Error("Tenant not found");

      const storeRoot = buildStorefrontUrlWithTenant(tenant.customDomain, tenant.subdomain);

      return {
        state: "published",
        publishedAt: null,
        version: 1,
        previewUrl: `${storeRoot}?preview=true`,
        storefrontUrl: storeRoot,
      };
    }, "Publish");
  }

  async publish(tenantId: string): Promise<CommandResult> {
    return this.wrapCommand(async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, subdomain: true, customDomain: true },
      });
      if (!tenant) throw new Error("Tenant not found");

      // Future: trigger Vercel redeploy webhook
      // Future: save builder snapshot to DB
      // Future: invalidate CDN cache
      // For now: SSR storefront is always "published" — publish means "validate + confirm"
    }, "Publish");
  }

  async rollback(): Promise<CommandResult> {
    return this.wrapCommand(async () => {
      // Future: restore previous snapshot
      // Future: redeploy previous version
    }, "Publish");
  }

  async getPreviewUrl(tenantId: string): Promise<ServiceResult<string>> {
    return this.wrapAsync(async () => {
      const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { subdomain: true, customDomain: true },
      });
      if (!tenant) throw new Error("Tenant not found");

      return buildPreviewUrl(tenant.subdomain, tenant.customDomain);
    }, "Preview");
  }

  validateBeforePublish(tenantId: string): Promise<ServiceResult<{ valid: boolean; issues: string[] }>> {
    return this.wrapAsync(async () => {
      const issues: string[] = [];

      const productCount = await prisma.product.count({ where: { tenantId } });
      if (productCount === 0) issues.push("No products. Add at least one product.");

      const hasDomain = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customDomain: true },
      });
      if (!hasDomain?.customDomain) issues.push("Using subdomain. Consider adding a custom domain.");

      return { valid: issues.length === 0, issues };
    }, "Publish");
  }
}

export const publishingService = new PublishingService();
