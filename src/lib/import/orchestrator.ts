import { prisma } from "@/lib/prisma";
import { providerRegistry } from "@/lib/providers/registry";
import { aiEngine } from "@/lib/ai/engine";
import { ImportLogger } from "@/lib/providers/youtube/logger";
import { provisioningService } from "@/lib/provisioning/provisioning-service";
import { websitePersonalizer } from "@/lib/personalization/personalizer";

export interface ImportResult {
  importId: string;
  tenantId: string;
  websiteId: string;
  creatorName: string;
  storefrontUrl: string;
  dashboardUrl: string;
  adminEmail: string;
  temporaryPassword: string;
  cacheHit: boolean;
  durationMs: number;
}

export class ImportOrchestrator {
  async importCreator(creatorName: string, sourceUrl?: string, sourcePlatform?: string, createdBy?: string): Promise<ImportResult> {
    const logger = new ImportLogger();
    const t0 = performance.now();
    const provider = sourceUrl ? providerRegistry.resolve(sourceUrl) : null;

    // Create import record
    const importRecord = await prisma.creatorImport.create({
      data: {
        creatorName,
        sourceUrl: sourceUrl || null,
        sourcePlatform: sourcePlatform || null,
        provider: provider?.name || null,
        status: "STARTED",
        correlationId: logger.getCorrelationId(),
        createdBy: createdBy || null,
      },
    });

    try {
      await prisma.creatorImport.update({ where: { id: importRecord.id }, data: { status: "FETCHING" } });
      logger.info("Import started", creatorName, provider?.name || "manual", 0, { importId: importRecord.id });

      let personalization = await websitePersonalizer.personalize(creatorName, sourceUrl);

      // Fetch real provider data if available
      let cacheHit = false;
      let providerAccountId: string | null = null;
      let profileName = creatorName;

      if (provider) {
        logger.info("Provider selected", creatorName, provider.name, 0, { provider: provider.name });
        const fetchResult = await provider.fetch(sourceUrl!);
        cacheHit = fetchResult.cached;
        providerAccountId = fetchResult.accountId || null;

        logger.info(cacheHit ? "Cache hit" : "Fetch completed", creatorName, provider.name, fetchResult.latencyMs, {
          cached: cacheHit,
          quotaUnits: fetchResult.quotaUnits,
          latencyMs: fetchResult.latencyMs,
        });

        profileName = fetchResult.profile.name || creatorName;
        personalization = await websitePersonalizer.personalize(profileName, sourceUrl);
      }

      // AI Analysis
      await prisma.creatorImport.update({ where: { id: importRecord.id }, data: { status: "ANALYZING" } });
      const intelligence = await aiEngine.getEngine().analyze({
        name: profileName,
        description: personalization.tagline + " " + personalization.bio,
        avatarUrl: null,
        bannerUrl: null,
        followers: 0,
        videoCount: 0,
        viewCount: 0,
        country: null,
        platform: sourcePlatform || "manual",
        handle: null,
        externalId: null,
        socialLinks: [],
        latestContent: [],
        categories: [],
        keywords: [],
        language: null,
        rawResponse: null,
      }, logger.getCorrelationId());

      logger.info("AI analysis complete", creatorName, provider?.name || "manual", 0, {
        niche: intelligence.niche,
        theme: intelligence.recommendedTheme,
        template: intelligence.recommendedTemplate,
        confidence: intelligence.confidence,
      });

      // Generate website
      await prisma.creatorImport.update({ where: { id: importRecord.id }, data: { status: "GENERATING" } });
      const runId = await provisioningService.createRun({
        creatorName,
        sourceUrl: sourceUrl || undefined,
        sourcePlatform: sourcePlatform || undefined,
      });

      const provisionResult = await provisioningService.provision({
        runId,
        creatorName: profileName,
        sourceUrl: sourceUrl || undefined,
        sourcePlatform: sourcePlatform || undefined,
        templateId: intelligence.recommendedTemplate,
        generatedContent: {
          heroTitle: personalization.heroTitle,
          heroSubtitle: personalization.heroSubtitle,
          tagline: personalization.tagline,
          aboutSection: personalization.bio,
          seoTitle: personalization.seoTitle,
          seoDescription: personalization.seoDescription,
        },
        generatedTheme: {
          colors: { primary: "", secondary: "", accent: "" },
        },
      });

      logger.info("Website generated", creatorName, provider?.name || "manual", Math.round(performance.now() - t0), {
        tenantId: provisionResult.tenantId,
        slug: provisionResult.tenantSlug,
        storefront: provisionResult.storefrontUrl,
      });

      // Mark import complete
      const durationMs = Math.round(performance.now() - t0);
      await prisma.creatorImport.update({
        where: { id: importRecord.id },
        data: {
          status: "COMPLETED",
          providerAccountId,
          tenantId: provisionResult.tenantId,
          websiteId: provisionResult.tenantId,
          cacheHit,
          durationMs,
          completedAt: new Date(),
        },
      });

      logger.info("Import complete", creatorName, provider?.name || "manual", durationMs, {
        importId: importRecord.id,
        status: "COMPLETED",
      });

      return {
        importId: importRecord.id,
        tenantId: provisionResult.tenantId,
        websiteId: provisionResult.tenantId,
        creatorName,
        storefrontUrl: provisionResult.storefrontUrl,
        dashboardUrl: provisionResult.dashboardUrl,
        adminEmail: provisionResult.adminEmail,
        temporaryPassword: provisionResult.temporaryPassword,
        cacheHit,
        durationMs,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const durationMs = Math.round(performance.now() - t0);
      await prisma.creatorImport.update({
        where: { id: importRecord.id },
        data: {
          status: "FAILED",
          errors: JSON.parse(JSON.stringify([message])),
          durationMs,
          completedAt: new Date(),
        },
      });
      logger.error("Import failed", creatorName, provider?.name || "manual", durationMs, { error: message });
      throw error;
    }
  }
}

export const importOrchestrator = new ImportOrchestrator();
