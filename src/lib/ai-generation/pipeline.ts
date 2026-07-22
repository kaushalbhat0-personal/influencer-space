/**
 * Website Generation Pipeline v1.0.0
 *
 * Orchestrates the 8-stage generation pipeline.
 * Each stage is idempotent and independently retryable.
 * Stages are sequential by default but can be parallelized where independent.
 */

import { BaseAppService } from "@/lib/application/base";
import type {
  GenerationInput,
  PipelineContext,
  StageResult,
  WebsiteGenerationResult,
  PipelineStage,
  PipelineStatus,
} from "./types";
import { sourceResolver } from "./source-resolver";
import { profileProviderRegistry, contentProviderRegistry } from "./providers";
import { contentGenerationService } from "./content-generator";
import { themeSelectionStrategy } from "./theme-strategy";
import { websiteComposer } from "./website-composer";
import { tenantProvisioner } from "./tenant-provisioner";
import { buildStorefrontUrl, buildDashboardUrl } from "@/lib/config/platform";

export class WebsiteGenerationPipeline extends BaseAppService {
  constructor() {
    super("WebsiteGenerationPipeline");
  }

  async execute(input: GenerationInput): Promise<WebsiteGenerationResult> {
    const ctx: PipelineContext = {
      input,
      resolvedSource: null,
      creatorProfile: null,
      creatorContent: null,
      generatedContent: null,
      generatedTheme: null,
      websiteComposition: null,
      tenantProvisioning: null,
      stageResults: [],
      startTime: Date.now(),
      errors: [],
      warnings: [],
    };

    try {
      await this.stage1_resolveSource(ctx);
      if (this.hasFatalError(ctx)) return this.buildResult(ctx);

      await this.stage2_extractProfile(ctx);
      if (this.hasFatalError(ctx)) return this.buildResult(ctx);

      await this.stage3_extractContent(ctx);

      if (input.options?.skipAI) {
        ctx.stageResults.push(this.skipStage(ctx, "ai_content_generation"));
      } else {
        this.stage4_generateContent(ctx);
        if (this.hasFatalError(ctx)) return this.buildResult(ctx);
      }

      this.stage5_selectTheme(ctx);

      if (input.options?.skipAI) {
        ctx.stageResults.push(this.skipStage(ctx, "website_composition"));
      } else {
        this.stage6_composeWebsite(ctx);
      }

      await this.stage7_provisionTenant(ctx);

      this.stage8_finalize(ctx);

      return this.buildResult(ctx);
    } catch (error) {
      ctx.errors.push(error instanceof Error ? error.message : String(error));
      return this.buildResult(ctx);
    }
  }

  // ── STAGE 1: Source Resolution ──────────────────────────────────────

  private async stage1_resolveSource(ctx: PipelineContext): Promise<void> {
    const result = this.recordStage(ctx, "source_resolution", () => {
      const resolveResult = sourceResolver.resolve(ctx.input.source);
      if (!resolveResult.success || !resolveResult.data) {
        throw new Error(resolveResult.error?.message ?? "Could not resolve source");
      }
      ctx.resolvedSource = resolveResult.data;
      ctx.warnings.push(
        `Detected ${resolveResult.data.platform} platform (confidence: ${resolveResult.data.confidence})`
      );
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 2: Profile Extraction ─────────────────────────────────────

  private async stage2_extractProfile(ctx: PipelineContext): Promise<void> {
    const result = await this.recordStageAsync(ctx, "profile_extraction", async () => {
      if (!ctx.resolvedSource) throw new Error("No resolved source");

      const provider = profileProviderRegistry.getProvider(ctx.resolvedSource.platform);
      if (!provider) throw new Error(`No profile provider for platform: ${ctx.resolvedSource.platform}`);

      const profileResult = await provider.extractProfile(ctx.resolvedSource);
      if (!profileResult.success || !profileResult.data) {
        throw new Error(profileResult.error?.message ?? "Profile extraction failed");
      }
      ctx.creatorProfile = profileResult.data;
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 3: Content Extraction ─────────────────────────────────────

  private async stage3_extractContent(ctx: PipelineContext): Promise<void> {
    const result = await this.recordStageAsync(ctx, "content_extraction", async () => {
      if (!ctx.resolvedSource || !ctx.creatorProfile)
        throw new Error("Missing source or profile");

      const provider = contentProviderRegistry.getProvider(ctx.resolvedSource.platform);
      if (!provider)
        throw new Error(`No content provider for platform: ${ctx.resolvedSource.platform}`);

      const contentResult = await provider.extractContent(
        ctx.resolvedSource,
        ctx.creatorProfile
      );
      if (!contentResult.success || !contentResult.data) {
        throw new Error(contentResult.error?.message ?? "Content extraction failed");
      }
      ctx.creatorContent = contentResult.data;
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 4: AI Content Generation ──────────────────────────────────

  private stage4_generateContent(ctx: PipelineContext): void {
    const result = this.recordStage(ctx, "ai_content_generation", () => {
      if (!ctx.creatorProfile || !ctx.creatorContent)
        throw new Error("Missing profile or content for generation");

      const genResult = contentGenerationService.generate(
        ctx.creatorProfile,
        ctx.creatorContent
      );
      if (!genResult.success || !genResult.data) {
        throw new Error(genResult.error?.message ?? "Content generation failed");
      }
      ctx.generatedContent = genResult.data;
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 5: Theme Selection ────────────────────────────────────────

  private stage5_selectTheme(ctx: PipelineContext): void {
    const result = this.recordStage(ctx, "theme_selection", () => {
      if (!ctx.creatorProfile) throw new Error("Missing profile for theme selection");

      const themeResult = themeSelectionStrategy.selectTheme(
        ctx.creatorProfile,
        ctx.input.options?.forceTheme
      );
      if (!themeResult.success || !themeResult.data) {
        ctx.warnings.push("Theme selection failed; using defaults");
        ctx.generatedTheme = {
          preset: "default",
          primaryColor: "#6366F1",
          secondaryColor: "#8B5CF6",
          accentColor: "#10B981",
          fontFamily: "Inter",
          borderRadius: 12,
          layoutDensity: "comfortable",
          darkMode: true,
        };
      } else {
        ctx.generatedTheme = themeResult.data;
      }
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 6: Website Composition ────────────────────────────────────

  private stage6_composeWebsite(ctx: PipelineContext): void {
    const result = this.recordStage(ctx, "website_composition", () => {
      if (!ctx.creatorProfile || !ctx.creatorContent || !ctx.generatedContent || !ctx.generatedTheme)
        throw new Error("Missing data for website composition");

      const compResult = websiteComposer.compose(
        ctx.creatorProfile,
        ctx.creatorContent,
        ctx.generatedContent,
        ctx.generatedTheme
      );
      if (!compResult.success || !compResult.data) {
        throw new Error(compResult.error?.message ?? "Website composition failed");
      }
      ctx.websiteComposition = compResult.data;
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 7: Tenant Provisioning ────────────────────────────────────

  private async stage7_provisionTenant(ctx: PipelineContext): Promise<void> {
    const result = await this.recordStageAsync(ctx, "tenant_provisioning", async () => {
      if (!ctx.creatorProfile) throw new Error("Missing profile for provisioning");

      const provResult = await tenantProvisioner.provision(ctx.creatorProfile, {
        adminEmail: ctx.input.options?.adminEmail,
        subdomain: ctx.input.options?.subdomain,
        planId: ctx.input.options?.planId,
      });
      if (!provResult.success || !provResult.data) {
        throw new Error(provResult.error?.message ?? "Tenant provisioning failed");
      }
      ctx.tenantProvisioning = provResult.data;
    });
    ctx.stageResults.push(result);
  }

  // ── STAGE 8: Finalization ───────────────────────────────────────────

  private stage8_finalize(ctx: PipelineContext): void {
    const result = this.recordStage(ctx, "finalization", () => {
      if (!ctx.tenantProvisioning) {
        ctx.warnings.push("Finalization skipped — no tenant provisioned");
        return;
      }
    });
    ctx.stageResults.push(result);
  }

  // ── HELPERS ──────────────────────────────────────────────────────────

  private skipStage(ctx: PipelineContext, stage: PipelineStage): StageResult {
    return {
      stage,
      status: "skipped",
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 0,
      error: null,
      retryable: false,
      retryCount: 0,
      warnings: [],
      diagnostics: { platform: ctx.resolvedSource?.platform ?? "unknown" },
    };
  }

  private recordStage(
    ctx: PipelineContext,
    stage: PipelineStage,
    fn: () => void
  ): StageResult {
    const startedAt = new Date().toISOString();
    const start = performance.now();
    let status: PipelineStatus = "running";
    let error: string | null = null;
    let retryable = false;
    const warnings: string[] = [];

    try {
      fn();
      status = "completed";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      retryable = !error.includes("not found") && !error.includes("invalid");
      ctx.errors.push(error);
    }

    return {
      stage,
      status,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: performance.now() - start,
      error,
      retryable,
      retryCount: 0,
      warnings,
      diagnostics: { platform: ctx.resolvedSource?.platform ?? "unknown" },
    };
  }

  private async recordStageAsync(
    ctx: PipelineContext,
    stage: PipelineStage,
    fn: () => Promise<void>
  ): Promise<StageResult> {
    const startedAt = new Date().toISOString();
    const start = performance.now();
    let status: PipelineStatus = "running";
    let error: string | null = null;
    let retryable = false;
    const warnings: string[] = [];

    try {
      await fn();
      status = "completed";
    } catch (e) {
      status = "failed";
      error = e instanceof Error ? e.message : String(e);
      retryable = !error.includes("not found") && !error.includes("invalid");
      ctx.errors.push(error);
    }

    return {
      stage,
      status,
      startedAt,
      completedAt: new Date().toISOString(),
      durationMs: performance.now() - start,
      error,
      retryable,
      retryCount: 0,
      warnings,
      diagnostics: { platform: ctx.resolvedSource?.platform ?? "unknown" },
    };
  }

  private hasFatalError(ctx: PipelineContext): boolean {
    return ctx.errors.length > 0 && ctx.creatorProfile === null;
  }

  private buildResult(ctx: PipelineContext): WebsiteGenerationResult {
    const completed = ctx.stageResults.filter((s) => s.status === "completed");
    const failed = ctx.stageResults.filter((s) => s.status === "failed");

    return {
      success: failed.length === 0,
      tenantId: ctx.tenantProvisioning?.tenantId ?? null,
      creatorName: ctx.creatorProfile?.name ?? ctx.resolvedSource?.identifier ?? "Unknown",
      sourcePlatform: ctx.resolvedSource?.platform ?? "manual",
      generatedContent: ctx.generatedContent,
      generatedTheme: ctx.generatedTheme,
      generatedSections:
        ctx.websiteComposition?.featuredSections ??
        ctx.generatedContent?.suggestedSections.map((s) => s.type) ??
        [],
      dashboardUrl: ctx.tenantProvisioning
        ? buildDashboardUrl()
        : null,
      storefrontUrl: ctx.tenantProvisioning
        ? buildStorefrontUrl(ctx.tenantProvisioning.subdomain)
        : null,
      stages: ctx.stageResults,
      totalDurationMs: Date.now() - ctx.startTime,
      warnings: ctx.warnings,
      errors: ctx.errors,
      diagnostics: {
        totalStages: 8,
        completedStages: completed.length,
        failedStages: failed.length,
      },
    };
  }
}

export const websiteGenerationPipeline = new WebsiteGenerationPipeline();
