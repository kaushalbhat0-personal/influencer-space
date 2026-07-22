import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { tenantSlugService } from "@/lib/slug/tenant-slug.service";
import { buildStorefrontUrl, buildDashboardUrl, buildAdminEmail } from "@/lib/config/platform";
import { ProvisionStep, ProvisionEventType, provisionStateMachine } from "./provisioning-state";

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
      // ── TRANSACTION: single raw SQL query (1 round trip) ────────────────
      const adminEmail = buildAdminEmail(slug);
      const brandConfigJson = JSON.stringify({
        name: creatorName,
        tagline: input.generatedContent?.tagline || "",
        bio: input.generatedContent?.aboutSection || "",
        heroTitle: input.generatedContent?.heroTitle || creatorName,
        aboutText: input.generatedContent?.aboutSection || "",
        palette: {
          primary: input.generatedTheme?.colors?.primary || "#6366f1",
          secondary: input.generatedTheme?.colors?.secondary || "#a78bfa",
        },
      });
      const seoJson = JSON.stringify({ title: input.generatedContent?.seoTitle || creatorName, description: input.generatedContent?.seoDescription || "" });
      const influencerJson = JSON.stringify({ name: creatorName, source: input.sourcePlatform || "manual", sourceUrl: input.sourceUrl || "", tagline: input.generatedContent?.tagline || "", bio: input.generatedContent?.aboutSection || "" });
      const heroJson = JSON.stringify({ title: input.generatedContent?.heroTitle || creatorName, subtitle: input.generatedContent?.heroSubtitle || "", tagline: input.generatedContent?.tagline || "", videoUrl: "" });
      const metaJson = JSON.stringify({ templateId: input.templateId || null, strategyId: input.strategyId || null, sourcePlatform: input.sourcePlatform || "manual", sourceUrl: input.sourceUrl || "", provisionedAt: new Date().toISOString() });
      const demoMetaJson = JSON.stringify({ published: true, publishedAt: new Date().toISOString(), provisionedBy: "creator-import" });

      const [rawResult] = await prisma.$queryRawUnsafe<{ tenant_id: string }[]>(
        `WITH t AS (
          INSERT INTO "Tenant" ("name", "subdomain", "createdAt", "updatedAt")
          VALUES ($1, $2, NOW(), NOW())
          RETURNING id
        ), s AS (
          INSERT INTO "Setting" ("id", "tenantId", "key", "value", "updatedAt")
          SELECT gen_random_uuid(), t.id, v.key, v.value::jsonb, NOW()
          FROM t, (VALUES
            ('brand_config', $3::jsonb),
            ('seo', $4::jsonb),
            ('influencer_data', $5::jsonb),
            ('hero_data', $6::jsonb),
            ('provisioning_meta', $7::jsonb),
            ('demo_metadata', $8::jsonb)
          ) AS v(key, value)
        )
        INSERT INTO "User" ("id", "tenantId", "name", "email", "password", "role", "createdAt", "updatedAt")
        SELECT gen_random_uuid(), t.id, $9, $10, $11, CAST($12 AS "public"."Role"), NOW(), NOW()
        FROM t
        RETURNING (SELECT id FROM t) as tenant_id;`,
        creatorName,
        slug,
        brandConfigJson,
        seoJson,
        influencerJson,
        heroJson,
        metaJson,
        demoMetaJson,
        creatorName,
        adminEmail,
        hashedPassword,
        "ADMIN"
      );

      const tenantId = rawResult?.tenant_id;
      if (!tenantId) throw new Error("Failed to create tenant");

      // ── AFTER TRANSACTION: events, URLs, cleanup ────────────────────────
      await this.logEvent(runId, ProvisionStep.TENANT_CREATED, ProvisionEventType.COMPLETED, `Tenant "${slug}" created`);
      await this.logEvent(runId, ProvisionStep.WORKSPACE_CREATED, ProvisionEventType.COMPLETED, "Workspace settings configured");
      await this.logEvent(runId, ProvisionStep.ADMIN_CREATED, ProvisionEventType.COMPLETED, `Admin ${adminEmail} created`);
      await this.logEvent(runId, ProvisionStep.WEBSITE_CREATED, ProvisionEventType.COMPLETED, "Website provisioned");
      await this.logEvent(runId, ProvisionStep.PUBLISHED, ProvisionEventType.COMPLETED, "Storefront published");
      await this.logEvent(runId, ProvisionStep.READY, ProvisionEventType.COMPLETED, "All resources ready");

      const storefrontUrl = buildStorefrontUrl(slug);
      const dashboardUrl = buildDashboardUrl(slug);

      const elapsed = await this.completeRun(runId, ProvisionStep.READY, null);
      await prisma.creatorProvisionRun.update({
        where: { id: runId },
        data: { tenantId, tenantSlug: slug, durationMs: elapsed ?? undefined },
      });

      return {
        success: true,
        tenantId,
        tenantSlug: slug,
        workspaceId: tenantId,
        websiteId: tenantId,
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
