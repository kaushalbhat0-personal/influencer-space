import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { tenantSlugService } from "@/lib/slug/tenant-slug.service";
import { buildStorefrontUrl, buildDashboardUrl, buildAdminEmail } from "@/lib/config/platform";
import { ProvisionStep, ProvisionEventType, provisionStateMachine } from "./provisioning-state";
import { templateService } from "@/lib/template";
import { websitePersonalizer } from "@/lib/personalization";
import { seedStarterData } from "@/lib/data/seeder";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { tenantRepository } from "@/modules/tenant/infrastructure/tenant-repository";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";
import { brandRepository } from "@/modules/tenant/infrastructure/brand-repository";
import { publishStatusRepository } from "@/modules/tenant/infrastructure/publish-status-repository";
import { websiteSettingsRepository } from "@/modules/tenant/infrastructure/settings-repository";
import { userRepository } from "@/modules/tenant/infrastructure/user-repository";

export interface ProvisioningInput {
  creatorName: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  templateId?: string;
  strategyId?: string;
  sections?: string[];
  generatedContent?: {
    heroTitle?: string;
    heroSubtitle?: string;
    heroCta?: string;
    aboutSection?: string;
    tagline?: string;
    seoTitle?: string;
    seoDescription?: string;
    keywords?: string[];
  };
  generatedTheme?: {
    preset?: string;
    colors?: { primary?: string; secondary?: string; accent?: string };
    fontFamily?: string;
    layoutDensity?: string;
    darkMode?: boolean;
  };
}

export interface ProvisioningResult {
  success: boolean;
  tenantId: string;
  tenantSlug: string;
  workspaceId: string;
  websiteId: string;
  storefrontUrl: string;
  dashboardUrl: string;
  adminEmail: string;
  temporaryPassword: string;
  websiteStatus: string;
  tenantStatus: string;
  publicationStatus: string;
  runId: string;
}

function generateTemporaryPassword(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

export class ProvisioningService {
  async createRun(input: { creatorName: string; sourceUrl?: string; sourcePlatform?: string }): Promise<string> {
    const run = await prisma.creatorProvisionRun.create({
      data: {
        creatorName: input.creatorName,
        sourceUrl: input.sourceUrl || null,
        sourcePlatform: input.sourcePlatform || null,
        status: "PENDING",
        currentStep: ProvisionStep.IMPORT_REQUESTED,
      },
      select: { id: true },
    });
    return run.id;
  }

  async logEvent(runId: string, step: ProvisionStep, event: ProvisionEventType, message?: string) {
    await prisma.creatorProvisionEvent.create({
      data: { runId, step, event, message: message || null },
    });
    await prisma.creatorProvisionRun.update({
      where: { id: runId },
      data: { currentStep: step },
    });
  }

  async getRun(runId: string) {
    return prisma.creatorProvisionRun.findUnique({
      where: { id: runId },
      include: { events: { orderBy: { timestamp: "asc" } } },
    });
  }

  async provision(input: ProvisioningInput & { runId: string }): Promise<ProvisioningResult> {
    const runId = input.runId;
    const creatorName = input.creatorName.trim();

    if (!creatorName || creatorName.length < 2) {
      await this.completeRun(runId, ProvisionStep.PROVISION_FAILED, "Creator name must be at least 2 characters");
      throw new Error("Creator name must be at least 2 characters");
    }

    const personalization = websitePersonalizer.personalize(creatorName, input.sourceUrl);

    // ── BEFORE TRANSACTION: expensive work + preparation ──────────────────
    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    const slug = await tenantSlugService.generate(creatorName);

    await prisma.creatorProvisionRun.update({
      where: { id: runId },
      data: { status: "RUNNING" },
    });

    await this.logEvent(runId, ProvisionStep.IMPORT_REQUESTED, ProvisionEventType.COMPLETED, "Import requested");
    await this.logEvent(runId, ProvisionStep.ANALYZING, ProvisionEventType.COMPLETED, `Profile analyzed for ${creatorName}`);
    await this.logEvent(runId, ProvisionStep.PROFILE_READY, ProvisionEventType.COMPLETED, `Profile ready for ${creatorName}`);
    await this.logEvent(runId, ProvisionStep.PROVISIONING, ProvisionEventType.STARTED, "Starting resource provisioning");

    try {
      // ── TRANSACTION: repository-backed provisioning ─────────────────────
      const adminEmail = buildAdminEmail(slug);
      const socialLinks = input.sourceUrl ? [{ platform: input.sourcePlatform || "youtube", url: input.sourceUrl }] : [];

      const brandConfig = {
        name: creatorName,
        tagline: input.generatedContent?.tagline || "",
        bio: input.generatedContent?.aboutSection || "",
        heroTitle: input.generatedContent?.heroTitle || creatorName,
        aboutText: input.generatedContent?.aboutSection || "",
      };
      const seoConfig = { title: input.generatedContent?.seoTitle || personalization.seoTitle, description: input.generatedContent?.seoDescription || personalization.seoDescription };
      const influencerData = { name: creatorName, source: input.sourcePlatform || "manual", sourceUrl: input.sourceUrl || "", tagline: input.generatedContent?.tagline || personalization.tagline, bio: input.generatedContent?.aboutSection || personalization.bio, social: { instagram: "", youtube: "", twitter: "", tiktok: "" }, profileImage: null, niche: input.sourcePlatform || "general", colors: { primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5" } };
      const heroData = { title: input.generatedContent?.heroTitle || personalization.heroTitle, subtitle: input.generatedContent?.heroSubtitle || personalization.heroSubtitle, tagline: input.generatedContent?.tagline || personalization.tagline, videoUrl: "" };
      const metaData = { templateId: input.templateId || null, strategyId: input.strategyId || null, sourcePlatform: input.sourcePlatform || "manual", sourceUrl: input.sourceUrl || "", provisionedAt: new Date().toISOString() };

      const { tenantId } = await prisma.$transaction(async (tx) => {
        const tenant = await tenantRepository.create({ name: creatorName, subdomain: slug }, tx as Prisma.TransactionClient);
        const website = await websiteRepository.create({ tenantId: tenant.id }, tx as Prisma.TransactionClient);

        await brandRepository.create({
          websiteId: website.id,
          name: creatorName,
          tagline: input.generatedContent?.tagline || personalization.tagline,
          bio: input.generatedContent?.aboutSection || personalization.bio,
          socialLinks,
        }, tx as Prisma.TransactionClient);

        await publishStatusRepository.create({
          websiteId: website.id,
          state: "live",
          publishedAt: new Date(),
        }, tx as Prisma.TransactionClient);

        await websiteSettingsRepository.createBatch(tenant.id, [
          { key: "brand_config", value: brandConfig },
          { key: "seo", value: seoConfig },
          { key: "influencer_data", value: influencerData },
          { key: "hero_data", value: heroData },
          { key: "provisioning_meta", value: metaData },
        ], tx as Prisma.TransactionClient);

        const user = await userRepository.create({
          tenantId: tenant.id,
          name: creatorName,
          email: adminEmail,
          password: hashedPassword,
          role: "ADMIN",
        }, tx as Prisma.TransactionClient);

        const ws = await workspaceRepository.create({
          type: "TENANT",
          name: creatorName,
          slug,
          tenantId: tenant.id,
        }, tx as Prisma.TransactionClient);

        await workspaceRepository.addMember({
          workspaceId: ws.id,
          userId: user.id,
          role: "OWNER",
        }, tx as Prisma.TransactionClient);

        return { tenantId: tenant.id };
      });

      // Apply personalized template and theme
      const website = await websiteRepository.findByTenantId(tenantId);
      if (website) {
        const templateId = input.templateId || personalization.templateId;
        const template = templateService.getTemplate(templateId);
        if (template) {
          await templateService.apply({
            websiteId: website.id,
            templateId: template.id,
            generatedContent: input.generatedContent,
          });
          await seedStarterData(
            template,
            tenantId,
            (input.strategyId as "fast" | "balanced" | "premium") || "balanced",
            input.creatorName,
          );
        }
        const { themeService } = await import("@/lib/theme");
        await themeService.apply(website.id, { packageId: personalization.themePackageId }).catch(() => {});

        if (input.generatedTheme?.colors) {
          const colors = input.generatedTheme.colors;
          await websiteRepository.updateThemeColors(website.id, {
            "--brand-primary": colors.primary ?? "#6366F1",
            "--brand-secondary": colors.secondary ?? "#8B5CF6",
            "--brand-accent": colors.accent ?? "#10B981",
            "--surface-root": "#09090b",
            "--surface-base": "#18181b",
            "--text-primary": "#fafafa",
            "--text-secondary": "#a1a1aa",
          }).catch(() => {});
        }
      }

      // ── AFTER TRANSACTION: events, URLs, cleanup ────────────────────────
      await this.logEvent(runId, ProvisionStep.TENANT_CREATED, ProvisionEventType.COMPLETED, `Tenant "${slug}" created`);
      await this.logEvent(runId, ProvisionStep.WORKSPACE_CREATED, ProvisionEventType.COMPLETED, "Workspace settings configured");
      await this.logEvent(runId, ProvisionStep.ADMIN_CREATED, ProvisionEventType.COMPLETED, `Admin ${adminEmail} created`);
      await this.logEvent(runId, ProvisionStep.WEBSITE_CREATED, ProvisionEventType.COMPLETED, "Website provisioned");
      await this.logEvent(runId, ProvisionStep.PUBLISHED, ProvisionEventType.COMPLETED, "Storefront published");
      await this.logEvent(runId, ProvisionStep.READY, ProvisionEventType.COMPLETED, "All resources ready");

      const storefrontUrl = buildStorefrontUrl(slug);
      const dashboardUrl = buildDashboardUrl();

      const elapsed = await this.completeRun(runId, ProvisionStep.READY, null);
      await prisma.creatorProvisionRun.update({
        where: { id: runId },
        data: { tenantId, tenantSlug: slug, durationMs: elapsed ?? undefined },
      });

      const provisionedWs = await workspaceRepository.findByTenantId(tenantId);

      return {
        success: true,
        tenantId,
        tenantSlug: slug,
        workspaceId: provisionedWs?.id ?? tenantId,
        websiteId: website?.id ?? tenantId,
        storefrontUrl,
        dashboardUrl,
        adminEmail,
        temporaryPassword: tempPassword,
        websiteStatus: "published",
        tenantStatus: "active",
        publicationStatus: "published",
        runId,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Provisioning failed";
      const failureStep = provisionStateMachine.failureStep(
        (await prisma.creatorProvisionRun.findUnique({ where: { id: runId }, select: { currentStep: true } }))?.currentStep as ProvisionStep || ProvisionStep.PROVISIONING
      );
      await this.logEvent(runId, failureStep, ProvisionEventType.FAILED, message);
      await this.completeRun(runId, failureStep, message);
      throw error;
    }
  }

  private async completeRun(runId: string, step: ProvisionStep, error: string | null): Promise<number> {
    const startedAt = (await prisma.creatorProvisionRun.findUnique({
      where: { id: runId },
      select: { startedAt: true },
    }))?.startedAt;
    const durationMs = startedAt ? Date.now() - startedAt.getTime() : 0;

    await prisma.creatorProvisionRun.update({
      where: { id: runId },
      data: {
        status: error ? "FAILED" : "COMPLETED",
        currentStep: step,
        error,
        completedAt: new Date(),
        durationMs,
      },
    });

    return durationMs;
  }
}

export const provisioningService = new ProvisioningService();
