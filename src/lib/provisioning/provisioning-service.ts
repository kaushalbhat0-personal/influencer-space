import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { tenantSlugService } from "@/lib/slug/tenant-slug.service";
import { buildStorefrontUrl, buildDashboardUrl, buildAdminEmail } from "@/lib/config/platform";
import { ProvisionStep, ProvisionEventType, provisionStateMachine } from "./provisioning-state";
import type { Prisma } from "@/generated/prisma/client";

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

    const tempPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    await prisma.creatorProvisionRun.update({
      where: { id: runId },
      data: { status: "RUNNING" },
    });

    await this.logEvent(runId, ProvisionStep.IMPORT_REQUESTED, ProvisionEventType.COMPLETED, "Import requested");
    await this.logEvent(runId, ProvisionStep.ANALYZING, ProvisionEventType.COMPLETED, `Profile analyzed for ${creatorName}`);

    let slug: string;

    await this.logEvent(runId, ProvisionStep.PROFILE_READY, ProvisionEventType.COMPLETED, `Profile ready for ${creatorName}`);
    await this.logEvent(runId, ProvisionStep.PROVISIONING, ProvisionEventType.STARTED, "Starting resource provisioning");

    try {
      const result = await prisma.$transaction(async (tx) => {
        slug = await tenantSlugService.generate(creatorName);

        const tenant = await tx.tenant.create({
          data: { name: creatorName, subdomain: slug },
        });

        await this.logEvent(runId, ProvisionStep.TENANT_CREATED, ProvisionEventType.COMPLETED, `Tenant "${slug}" created`);

        const settingUpsert = (key: string, value: Prisma.InputJsonValue) =>
          tx.setting.upsert({
            where: { tenantId_key: { tenantId: tenant.id, key } },
            create: { tenantId: tenant.id, key, value },
            update: { value },
          });

        await settingUpsert("brand_config", {
          name: creatorName,
          tagline: input.generatedContent?.tagline || "",
          bio: input.generatedContent?.aboutSection || "",
          heroTitle: input.generatedContent?.heroTitle || creatorName,
          aboutText: input.generatedContent?.aboutSection || "",
          palette: {
            primary: input.generatedTheme?.colors?.primary || "#6366f1",
            secondary: input.generatedTheme?.colors?.secondary || "#a78bfa",
          },
        } as Prisma.InputJsonValue);

        await settingUpsert("seo", {
          title: input.generatedContent?.seoTitle || creatorName,
          description: input.generatedContent?.seoDescription || "",
        } as Prisma.InputJsonValue);

        await settingUpsert("influencer_data", {
          name: creatorName,
          source: input.sourcePlatform || "manual",
          sourceUrl: input.sourceUrl || "",
          tagline: input.generatedContent?.tagline || "",
          bio: input.generatedContent?.aboutSection || "",
        } as Prisma.InputJsonValue);

        await settingUpsert("hero_data", {
          title: input.generatedContent?.heroTitle || creatorName,
          subtitle: input.generatedContent?.heroSubtitle || "",
          tagline: input.generatedContent?.tagline || "",
          videoUrl: "",
        } as Prisma.InputJsonValue);

        await settingUpsert("provisioning_meta", {
          templateId: input.templateId || null,
          strategyId: input.strategyId || null,
          sourcePlatform: input.sourcePlatform || "manual",
          sourceUrl: input.sourceUrl || "",
          provisionedAt: new Date().toISOString(),
        } as Prisma.InputJsonValue);

        await this.logEvent(runId, ProvisionStep.WORKSPACE_CREATED, ProvisionEventType.COMPLETED, "Workspace settings configured");

        const adminEmail = buildAdminEmail(slug);

        await tx.user.create({
          data: {
            tenantId: tenant.id,
            name: creatorName,
            email: adminEmail,
            password: hashedPassword,
            role: "ADMIN",
          },
        });

        await this.logEvent(runId, ProvisionStep.ADMIN_CREATED, ProvisionEventType.COMPLETED, `Admin ${adminEmail} created`);

        await tx.setting.upsert({
          where: { tenantId_key: { tenantId: tenant.id, key: "demo_metadata" } },
          create: {
            tenantId: tenant.id, key: "demo_metadata",
            value: { published: true, publishedAt: new Date().toISOString(), provisionedBy: "creator-import" } as Prisma.InputJsonValue,
          },
          update: {
            value: { published: true, publishedAt: new Date().toISOString(), provisionedBy: "creator-import" } as Prisma.InputJsonValue,
          },
        });

        await this.logEvent(runId, ProvisionStep.WEBSITE_CREATED, ProvisionEventType.COMPLETED, "Website provisioned");
        await this.logEvent(runId, ProvisionStep.PUBLISHED, ProvisionEventType.COMPLETED, "Storefront published");
        await this.logEvent(runId, ProvisionStep.READY, ProvisionEventType.COMPLETED, "All resources ready");

        const storefrontUrl = buildStorefrontUrl(slug);
        const dashboardUrl = buildDashboardUrl(slug);

        return {
          success: true,
          tenantId: tenant.id,
          tenantSlug: slug,
          workspaceId: tenant.id,
          websiteId: tenant.id,
          storefrontUrl,
          dashboardUrl,
          adminEmail,
          temporaryPassword: tempPassword,
          websiteStatus: "published",
          tenantStatus: "active",
          publicationStatus: "published",
          runId,
        };
      });

      const elapsed = await this.completeRun(runId, ProvisionStep.READY, null);
      await prisma.creatorProvisionRun.update({
        where: { id: runId },
        data: { tenantId: result.tenantId, tenantSlug: result.tenantSlug, durationMs: elapsed ?? undefined },
      });

      return result;
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
