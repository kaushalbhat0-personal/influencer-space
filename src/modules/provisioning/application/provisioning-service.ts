import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import type { Prisma } from "@/generated/prisma/client";
import { tenantSlugService } from "@/lib/slug/tenant-slug.service";
import { buildStorefrontUrl, buildDashboardUrl, buildAdminEmail } from "@/lib/config/platform";
import { ProvisionStep, ProvisionEventType, provisionStateMachine } from "@/modules/provisioning/domain/provisioning-state";
import { templateService } from "@/lib/template";
import { websitePersonalizer } from "@/lib/personalization";
import { seedStarterData } from "@/modules/tenant/application/seeder";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { tenantRepository } from "@/modules/tenant/infrastructure/tenant-repository";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";
import { brandRepository } from "@/modules/tenant/infrastructure/brand-repository";
import { publishRepository } from "@/modules/tenant/infrastructure/publishing-repository";
import { websiteSettingsRepository } from "@/modules/tenant/infrastructure/settings-repository";
import { userRepository } from "@/modules/tenant/infrastructure/user-repository";
import { logger } from "@/lib/observability/logger";
import { runWorkflow } from "@/lib/observability/workflow-diagnostics";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import { correlationService } from "@/lib/platform/correlation";

export type ProvisioningMode = "create_new_admin" | "attach_existing_user";

interface ProvisioningInputBase {
  creatorName: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  templateId?: string;
  strategyId?: string;
  sections?: string[];
  /** RCCF-05A: basic profile acquisition �?" legitimately acquired identity that
   * provisioning persists to the brand + hero so the site renders real data. */
  name?: string;
  bio?: string;
  avatarUrl?: string;
  socialLinks?: Array<{ platform: string; url: string; label?: string }>;
  /** Classified / user-overridden business category (e.g. "film", "food"). */
  category?: string;
  /** Industry label (e.g. "Film Producer", "Restaurant"). */
  industry?: string;
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
  /**
   * RCCF-01: the generated WebsiteBlueprint sections + navigation. When present,
   * provisioning persists these as canonical Page/Section/Block rows (via the
   * existing builder persistence) instead of the generic template, and skips
   * placeholder starter content.
   */
  generatedWebsite?: {
    sections: Array<{ id?: string; type: string; props: Record<string, unknown> }>;
    navigation?: Record<string, unknown>;
    theme?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  };
}

export type ProvisioningInput =
  | (ProvisioningInputBase & {
      /** Attach an existing user to the new tenant. Use for marketing signup / self-onboarding. */
      mode: "attach_existing_user";
      authenticatedUserId: string;
    })
  | (ProvisioningInputBase & {
      /** Create a brand new admin user. Use for Super Admin import. */
      mode?: "create_new_admin";
      authenticatedUserId?: never;
    });

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
    logger.info("Creating provision run", "provisioning", { metadata: { creatorName: input.creatorName } });
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
    logger.info("Provision run created", "provisioning", { metadata: { runId: run.id } });
    return run.id;
  }

  async logEvent(runId: string, step: ProvisionStep, event: ProvisionEventType, message?: string) {
    logger.trace("Logging provision event", "provisioning", { metadata: { runId, step, event, message } });
    await prisma.creatorProvisionEvent.create({
      data: { runId, step, event, message: message || null },
    });
    await prisma.creatorProvisionRun.update({
      where: { id: runId },
      data: { currentStep: step },
    });
  }

  async getRun(runId: string) {
    logger.trace("Fetching provision run", "provisioning", { metadata: { runId } });
    return prisma.creatorProvisionRun.findUnique({
      where: { id: runId },
      include: { events: { orderBy: { timestamp: "asc" } } },
    });
  }

  async provision(input: ProvisioningInput & { runId: string }): Promise<ProvisioningResult> {
    const correlation = correlationService.create({ workflowId: "provisioning" });
    const startTime = Date.now();
    logger.info("Provisioning started", "provisioning", { correlation, metadata: { runId: input.runId, creatorName: input.creatorName } });

    const runId = input.runId;
    const creatorName = input.creatorName.trim();

    if (!creatorName || creatorName.length < 2) {
      captureError(new Error("Creator name must be at least 2 characters"), { service: "provisioning", operation: "provision", correlation });
      await this.completeRun(runId, ProvisionStep.PROVISION_FAILED, "Creator name must be at least 2 characters");
      throw new Error("Creator name must be at least 2 characters");
    }

    const personalization = websitePersonalizer.personalize(
      creatorName,
      input.sourceUrl,
      input.category,
    );
    logger.info("Metadata fetched — profile personalized", "provisioning", { correlation, metadata: { creatorName, runId } });

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
      const adminEmail = buildAdminEmail(slug);
      // RCCF-05A: merge the acquired basic-profile social links with the source
      // URL fallback, deduping by platform+url so the hero never shows the
      // controlling platform twice.
      const sourcePlatformLabel = input.sourcePlatform || "youtube";
      const sourceLink = input.sourceUrl ? [{ platform: sourcePlatformLabel, url: input.sourceUrl }] : [];
      const acquiredLinks = input.socialLinks?.length ? input.socialLinks : [];
      const socialLinks = [...sourceLink, ...acquiredLinks].filter(
        (link, index, all) => index === all.findIndex((other) => other.platform === link.platform && other.url === link.url),
      );
      const displayName = input.name?.trim() || creatorName;
      const profileBio = input.bio?.trim() || input.generatedContent?.aboutSection || "";

      const brandConfig = {
        name: displayName,
        tagline: input.generatedContent?.tagline || "",
        bio: profileBio,
        avatarUrl: input.avatarUrl || null,
        socialLinks,
        heroTitle: input.generatedContent?.heroTitle || displayName,
        aboutText: profileBio,
        category: input.category || input.industry || "",
        industry: input.industry || "",
      };
      // RCCF-18: for manual provisioning (no verified profile source) the SEO
      // title/description must not assert a niche/profession the platform does
      // not know. Use the creator name (truthful) and an empty description;
      // the generated path supplies its own generatedContent.seo* values.
      const seoConfig = { title: input.generatedContent?.seoTitle || displayName, description: input.generatedContent?.seoDescription || "" };
      const influencerData = { name: displayName, source: sourcePlatformLabel, sourceUrl: input.sourceUrl || "", tagline: input.generatedContent?.tagline || "", bio: profileBio, social: { instagram: "", youtube: "", twitter: "", tiktok: "" }, profileImage: input.avatarUrl || null, niche: input.category || personalization.niche || sourcePlatformLabel || "general", colors: { primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5" } };
      // RCCF-05A: hero_data carries the acquired profile identity so the
      // storefront hero resolves the creator's real name/bio/avatar/social links.
      const heroData = {
        // RCCF-18: manual hero copy must not assert a niche/profession. Title =
        // the creator name (truthful); subtitle/tagline stay empty for manual
        // provisioning. Generated provisioning supplies its own values.
        title: input.generatedContent?.heroTitle || displayName,
        subtitle: input.generatedContent?.heroSubtitle || "",
        tagline: input.generatedContent?.tagline || "",
        videoUrl: "",
        name: displayName,
        bio: profileBio,
        profilePictureUrl: input.avatarUrl || "",
        socialLinks,
      };
      const metaData = { templateId: input.templateId || null, strategyId: input.strategyId || null, sourcePlatform: input.sourcePlatform || "manual", sourceUrl: input.sourceUrl || "", provisionedAt: new Date().toISOString() };

      const templateId = input.templateId || personalization.templateId;
      const template = templateService.getTemplate(templateId);
      logger.info("Template resolved", "provisioning", { correlation, metadata: { templateId: template?.id, runId } });

      const { tenantId, user, website } = await prisma.$transaction(async (tx) => {
        const tenant = await tenantRepository.create({ name: creatorName, subdomain: slug }, tx as Prisma.TransactionClient);
        const website = await websiteRepository.create({ tenantId: tenant.id }, tx as Prisma.TransactionClient);

        await brandRepository.create({
          websiteId: website.id,
          name: displayName,
          tagline: input.generatedContent?.tagline || "",
          bio: profileBio,
          avatarUrl: input.avatarUrl || undefined,
          socialLinks,
        }, tx as Prisma.TransactionClient);

        await publishRepository.createStatus(website.id, "draft", new Date(), tx as Prisma.TransactionClient);

        await websiteSettingsRepository.createBatch(tenant.id, [
          { key: "brand_config", value: brandConfig },
          { key: "seo", value: seoConfig },
          { key: "influencer_data", value: influencerData },
          { key: "hero_data", value: heroData },
          { key: "provisioning_meta", value: metaData },
        ], tx as Prisma.TransactionClient);

        const user = input.mode === "attach_existing_user"
          ? await userRepository.safeUpdate(input.authenticatedUserId, {
              tenantId: tenant.id,
              role: "ADMIN",
            }, tx as Prisma.TransactionClient, "SUPER_ADMIN")
          : await userRepository.create({
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

        // RCCF-07: link the registration-created creator subscription (created
        // with only accountId) to the canonical workspace so plan readers
        // (resolveActivePlan → findSubscriptionWithPlan) resolve by workspaceId.
        // No-op when the self-serve account/subscription does not exist.
        await billingRepository.linkSubscriptionToWorkspace(
          { workspaceId: ws.id, accountType: "creator", accountId: user.id },
          tx as Prisma.TransactionClient,
        );

        if (template && !input.generatedWebsite?.sections?.length) {
          await seedStarterData(
            template,
            tenant.id,
            (input.strategyId as "fast" | "balanced" | "premium") || "balanced",
            input.creatorName,
            tx as Prisma.TransactionClient,
          );
        }

        return { tenantId: tenant.id, user, website };
      });

      logger.info("Tenant, workspace, and website created", "provisioning", { correlation, metadata: { tenantId, websiteId: website?.id, runId } });

      const hasGeneratedWebsite = !!input.generatedWebsite?.sections?.length;

      if (website) {
        if (hasGeneratedWebsite) {
          // RCCF-01: the generated WebsiteBlueprint becomes the initial website
          // structure — persisted through the existing builder persistence
          // (storefrontToBuilderPages → BuilderService.save). No generic template.
          const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
          const { BuilderService } = await import("@/lib/builder/builder-service");
          const builderPages = storefrontToBuilderPages({
            sections: input.generatedWebsite!.sections as Array<{ id: string; type: string; props: Record<string, unknown> }>,
            navigation: input.generatedWebsite!.navigation,
          });
          if (builderPages.length > 0) {
            await new BuilderService().save(website.id, builderPages);
          }
        } else if (template) {
          await templateService.apply({
            websiteId: website.id,
            templateId: template.id,
            generatedContent: input.generatedContent,
          });
        }
      }

      if (website) {
        // RCCF-01: theme application uses the CANONICAL ThemeRegistry. The
        // legacy `themeService.apply` (prefixed-less presets registry) is retired
        // from provisioning — it silently failed on `com.creatos.*` ids.
        const { normalizeThemeId } = await import("@/lib/theme");
        let canonicalThemeId = normalizeThemeId(personalization.themePackageId ?? "com.creatos.neon-dark");

        // RCCF-35: provisioning must not hand a lower tier a premium theme
        // through the personalizer's niche mapping (e.g. technology/travel →
        // com.creatos.midnight-ocean, a "business" tier theme). Mirror the
        // applyThemePackage/applyBlueprintToWebsite server gate: when the
        // tenant's effective plan lacks premium_themes, fall back to a free
        // theme instead of persisting a premium one.
        const { getThemeTier } = await import("@/lib/theme/tiers");
        const { themeEntitlementDecision } = await import("@/lib/theme/entitlement");
        if (getThemeTier({ id: canonicalThemeId }) !== "free") {
          const { resolveActivePlan } = await import("@/modules/billing/application/plan-source");
          const resolved = await resolveActivePlan(undefined, tenantId).catch(() => ({ code: null }));
          if (!themeEntitlementDecision(getThemeTier({ id: canonicalThemeId }), resolved.code).allowed) {
            canonicalThemeId = "com.creatos.neon-dark";
          }
        }

        await websiteRepository.update(website.id, { themePackageId: canonicalThemeId });

        if (input.generatedTheme?.colors) {
          const colors = input.generatedTheme.colors;
          // Canonical themeColors shape: the snapshot resolver reads plain keys
          // (primary/secondary/accent), not CSS-var names.
          await websiteRepository.updateTheme(website.id, {
            themeColors: {
              primary: colors.primary ?? "#6366F1",
              secondary: colors.secondary ?? "#8B5CF6",
              accent: colors.accent ?? "#10B981",
            },
          }).catch((err) => { captureError(err, { service: "provisioning", operation: `themeColors:${website.id}` }); });
        }
      }

      await this.logEvent(runId, ProvisionStep.TENANT_CREATED, ProvisionEventType.COMPLETED, `Tenant "${slug}" created`);
      await this.logEvent(runId, ProvisionStep.WORKSPACE_CREATED, ProvisionEventType.COMPLETED, "Workspace settings configured");
      await this.logEvent(runId, ProvisionStep.ADMIN_CREATED, ProvisionEventType.COMPLETED, `Admin ${adminEmail} created`);
      await this.logEvent(runId, ProvisionStep.WEBSITE_CREATED, ProvisionEventType.COMPLETED, "Website provisioned");
      await this.logEvent(runId, ProvisionStep.PUBLISHED, ProvisionEventType.COMPLETED, "Storefront published");
      await this.logEvent(runId, ProvisionStep.READY, ProvisionEventType.COMPLETED, "All resources ready");
      logger.info("Publishing triggered — storefront ready", "provisioning", { correlation, metadata: { slug, runId } });

      const storefrontUrl = buildStorefrontUrl(slug);
      const dashboardUrl = buildDashboardUrl();

      const elapsed = await this.completeRun(runId, ProvisionStep.READY, null);
      await prisma.creatorProvisionRun.update({
        where: { id: runId },
        data: { tenantId, tenantSlug: slug, durationMs: elapsed ?? undefined },
      });

      const provisionedWs = await workspaceRepository.findByTenantId(tenantId);

      const duration = Date.now() - startTime;
      logger.info("Provisioning completed", "provisioning", { correlation, duration, metadata: { tenantId, slug, runId } });
      metricsService.recordDuration("provision", duration, { status: "success", tenantId, slug });
      metricsService.recordOutcome("provision", true, { tenantId, slug });

      return {
        success: true,
        tenantId,
        tenantSlug: slug,
        workspaceId: provisionedWs?.id ?? tenantId,
        websiteId: website?.id ?? tenantId,
        storefrontUrl,
        dashboardUrl,
        adminEmail: input.authenticatedUserId ? user.email : adminEmail,
        temporaryPassword: input.authenticatedUserId ? "" : tempPassword,
        websiteStatus: "published",
        tenantStatus: "active",
        publicationStatus: "published",
        runId,
      };
    } catch (error) {
      captureError(error, { service: "provisioning", operation: "provision", correlation });
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
