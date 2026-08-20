"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { assertAgencyOwnsTenant } from "@/modules/partner/application/authorization";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { onboardingService } from "@/lib/onboarding/service";
import { writeOnboardingComplete } from "@/lib/onboarding/complete";
import { goldenDataset, GoldenValidator } from "@/lib/generation/golden";
import { publishingService } from "@/lib/publishing/service";
import { sessionService, sessionRegistry } from "@/lib/generation/session";
import { correlationService } from "@/lib/platform/correlation";
import { platformEventBus } from "@/lib/events";
import { applyGoalSectionPriority } from "@/modules/goals-runtime";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import {
  buildProvisioningInput, buildBuilderArtifactData, detectPlatform,
} from "@/lib/generation/integration/provision-pipeline";
import { nicheDetector } from "@/lib/generation/intelligence/niche-detector";
import type { ImportProfileResult } from "@/lib/onboarding/service";
import { applyBlueprintToWebsite } from "@/actions/create.actions";

/**
 * RCCF-19 P1-M: "Build Manually" — provision a truthful blank manual website
 * for the current creator (reusing the canonical ProvisioningService, neutral
 * RCCF-18 defaults, no fabricated content), apply the default creator blueprint
 * with real sections, and publish. Non-destructive: an existing layout is never
 * overwritten. The client refreshes the session afterwards so /admin becomes
 * reachable.
 */
export async function createManualWebsite(): Promise<{
  success: boolean;
  tenantId?: string;
  websiteId?: string;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    const userId = session?.user?.id;
    if (!userId) return { success: false, error: "Unauthorized" };

    let tenantId: string | null = session?.user?.tenantId ?? null;
    let websiteId: string | null = null;

    if (!tenantId) {
      const creatorName = session?.user?.name || session?.user?.email?.split("@")[0] || "Creator";
      const runId = await provisioningService.createRun({ creatorName });
      const result = await provisioningService.provision({
        runId,
        mode: "attach_existing_user",
        authenticatedUserId: userId,
        creatorName,
        name: creatorName,
      });
      tenantId = result.tenantId;
      websiteId = result.websiteId;
    } else {
      const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
      websiteId = website?.id ?? null;
    }

    if (!tenantId || !websiteId) return { success: false, error: "Website not found" };

    // RCCF-21: applyBlueprintToWebsite derives ownership from the authenticated
    // session + DB user tenant, not a client-supplied tenantId. The fresh
    // provision above already attached the caller to the new tenant.
    const applied = await applyBlueprintToWebsite(websiteId, "com.creatos.creator", "com.creatos.neon-dark");
    if (!applied.success) return applied;

    // RCCF-70.6.6: every creator provisioning path must mark onboarding complete
    // so the DB-backed requireTenant (lib/lifecycle/service.ts) enters READY for
    // the new tenant. Without this, a Build-Manually creator signs up + provisions
    // successfully but a fresh login bounces /admin/dashboard → /onboarding
    // (middleware READY via token-only) → /admin/dashboard (requireTenant
    // ONBOARDING via DB) indefinitely.
    try {
      await writeOnboardingComplete(tenantId);
    } catch (error) {
      captureError(error, {
        service: "onboarding-actions",
        operation: "createManualWebsite-markOnboardingComplete",
        tenantId,
      });
    }

    return { success: true, tenantId, websiteId };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create website" };
  }
}

export async function importCreatorProfile(sourceUrl: string): Promise<{
  success: boolean;
  platform?: string;
  creatorName?: string;
  avatarUrl?: string;
  followers?: number;
  bio?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  category?: string;
  persona?: { id: string; name: string };
  confidence?: number;
  categoryConfidence?: number;
  categoryRequiresReview?: boolean;
  categoryAlternatives?: Array<{ niche: string; score: number }>;
  acquisition?: {
    platform: string;
    adapter: string;
    capabilities: string[];
    populatedFields: string[];
    missingFields: string[];
    warnings: string[];
  };
  identity?: {
    entityType: string | null;
    primaryNiche: string | null;
    persona: string | null;
    confidence: number;
    aiUsed: boolean;
    provider: string | null;
    model: string | null;
    cacheHit: boolean;
    cost: number;
    promptVersion: string;
    notes: string[];
  };
  intelligence?: {
    entities: Array<{ entity: string; confidence: number }>;
    niches: Array<{ niche: string; confidence: number }>;
    businessModels: Array<{ model: string; confidence: number }>;
    audience: Array<{ segment: string; confidence: number }>;
    recommendations: { theme: string | null; sections: string[]; cta: string | null };
    confidence: number;
    evidenceCount: number;
  };
  blueprint?: {
    entity: string | null;
    layout: string;
    themeFamily: string;
    primaryCta: string;
    visibleSections: string[];
    integrations: string[];
    monetization: string[];
    seoType: string;
    relationships: string[];
    brands: string[];
  };
  composition?: {
    version: number;
    entity: string | null;
    themeId: string;
    layout: string;
    sectionCount: number;
    visibleSections: string[];
    builderPages: number;
    heroMedia: string;
    deterministicSignature: string;
  };
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    // RCCF-04: all supported platforms (YouTube, Instagram, TikTok, LinkedIn,
    // X/Twitter, website/manual) flow through the dedicated platform adapter.
    // Unsupported-looking inputs degrade to a manual source + diagnostics
    // instead of being hard-blocked.

    const creatorName = session.user.name || "Creator";
    const result = await onboardingService.importProfile(sourceUrl, session.user.id, creatorName);
    const kg = result.knowledgeGraph;

    const classification = nicheDetector.detect({
      platform: result.platform,
      username: "",
      displayName: kg.creator.name,
      bio: kg.creator.bio,
      avatarUrl: "",
      followers: kg.creator.followers,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: kg.creator.niche ? [kg.creator.niche] : [],
      links: [],
    });

    return {
      success: true,
      platform: result.platform,
      creatorName: result.knowledgeGraph.creator.name,
      avatarUrl: result.channelMeta?.thumbnailUrl || "",
      followers: result.knowledgeGraph.creator.followers,
      bio: result.knowledgeGraph.creator.bio,
      socialLinks: (result.knowledgeGraph.socialLinks ?? []).map((s) => ({ platform: s.platform, url: s.url })),
      category: result.knowledgeGraph.creator.niche,
      persona: { id: result.personaMatch.persona.id, name: result.personaMatch.persona.name },
      confidence: result.experienceProfile.confidence,
      categoryConfidence: classification.confidence,
      categoryRequiresReview: classification.requiresReview,
      categoryAlternatives: classification.altNiches,
      acquisition: result.acquisition
        ? {
            platform: result.acquisition.platform,
            adapter: result.acquisition.adapter,
            capabilities: result.acquisition.capabilities,
            populatedFields: result.acquisition.populatedFields,
            missingFields: result.acquisition.missingFields,
            warnings: result.acquisition.warnings,
          }
        : undefined,
      identity: result.identityProfile
        ? {
            entityType: result.identityProfile.entityType,
            primaryNiche: result.identityProfile.primaryNiche,
            persona: result.identityProfile.persona?.name ?? null,
            confidence: result.identityProfile.confidence,
            aiUsed: result.identityProfile.ai.used,
            provider: result.identityProfile.ai.provider,
            model: result.identityProfile.ai.model,
            cacheHit: result.identityProfile.ai.cacheHit,
            cost: result.identityProfile.ai.cost,
            promptVersion: result.identityProfile.ai.promptVersion,
            notes: result.identityProfile.diagnostics.notes,
          }
        : undefined,
      intelligence: result.identityProfile?.intelligence
        ? {
            entities: result.identityProfile.intelligence.entities.map((e) => ({ entity: e.entity, confidence: Number(e.confidence.toFixed(2)) })),
            niches: result.identityProfile.intelligence.niches.map((n) => ({ niche: n.niche, confidence: Number(n.confidence.toFixed(2)) })),
            businessModels: result.identityProfile.intelligence.businessModels.map((b) => ({ model: b.model, confidence: Number(b.confidence.toFixed(2)) })),
            audience: result.identityProfile.intelligence.audience.segments.map((a) => ({ segment: a.segment, confidence: Number(a.confidence.toFixed(2)) })),
            recommendations: {
              theme: result.identityProfile.intelligence.recommendations.theme,
              sections: result.identityProfile.intelligence.recommendations.sections,
              cta: result.identityProfile.intelligence.recommendations.cta,
            },
            confidence: Number(result.identityProfile.intelligence.confidence.overall.toFixed(2)),
            evidenceCount: result.identityProfile.intelligence.diagnostics.evidenceCount,
          }
        : undefined,
      blueprint: result.blueprint
        ? {
            entity: result.blueprint.entity,
            layout: result.blueprint.layout,
            themeFamily: result.blueprint.theme.family,
            primaryCta: result.blueprint.cta.primary,
            visibleSections: result.blueprint.visibleSections,
            integrations: result.blueprint.integrations,
            monetization: result.blueprint.monetization,
            seoType: result.blueprint.seo.structuredDataType,
            relationships: result.blueprint.evidence.relationshipChains,
            brands: result.blueprint.evidence.brands,
          }
        : undefined,
      composition: result.composition
        ? {
            version: result.composition.version,
            entity: result.composition.entity,
            themeId: result.composition.theme.themeId,
            layout: result.composition.layout,
            sectionCount: result.composition.diagnostics.sectionCount,
            visibleSections: result.composition.visibleSections,
            builderPages: result.composition.builder.pages.length,
            heroMedia: result.composition.media.hero.resolvedMedia,
            deterministicSignature: result.composition.diagnostics.deterministicSignature,
          }
        : undefined,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Profile import failed" };
  }
}

export async function runCreatorGeneration(
  sourceUrl: string,
  workspaceName: string,
  timezone: string,
  currency: string,
  language: string,
  existingProfileResult?: ImportProfileResult,
  precreatedSessionId?: string,
  categoryOverride?: string,
  goals?: Array<{ goalId: string; weight: number }>,
): Promise<{
  success: boolean;
    stages?: Array<{ stage: string; status: string; error?: string }>;
    result?: { tenantId: string; workspaceId?: string; storefrontUrl: string; dashboardUrl: string };
    goldenValidation?: { passed: boolean; overallScore: number; regressions: string[] } | null;
    error?: string;
    retryable?: boolean;
    tenantId?: string;
}> {
  let generationSessionId: string | null = precreatedSessionId ?? null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const creatorName = session.user.name || "Creator";
    const userId = session.user.id;

    const ctx = correlationService.create({
      creatorId: userId,
    });

    if (!precreatedSessionId) {
      try {
        const gs = await sessionService.create({
          creatorId: userId,
          creatorName,
          sourceUrl,
          // RCCF-05A (LOW-6): use the detected platform, not a hardcoded label.
          platform: detectPlatform(sourceUrl),
          correlationId: ctx.correlationId,
        });
        generationSessionId = gs.id;
        await sessionService.start(gs.id);
        await sessionService.beginExecution(gs.id);
        await sessionService.updateStage(gs.id, "import_profile", "running");
      } catch (err) {
        captureError(err, { service: "onboarding-actions", operation: "createGenerationSession", correlation: ctx.correlationId });
      }
    }

    if (generationSessionId) {
      platformEventBus.publish("WebsiteBeingGenerated", {
        tenantId: "",
        workspaceId: generationSessionId,
        creatorName,
        sourceUrl,
        sourcePlatform: detectPlatform(sourceUrl),
        correlationId: ctx.correlationId,
      }, "platform", ctx.correlationId);
      // RCCF-LAUNCH-TRACK-03: canonical generation progress event.
      const { emitGenerationEvent } = await import("@/modules/generation-progress");
      await emitGenerationEvent(generationSessionId!, "generation.started", { creatorName, sourceUrl }).catch(() => {});
    }

    const stages: Array<{ stage: string; status: string; error?: string }> = [];
    const markStage = (stage: string, status: string, error?: string) => {
      stages.push({ stage, status, error });
    };

    markStage("profile_import", "running");

    // RCCF-LAUNCH-TRACK-03: real sub-phase progress. The import reports its
    // genuine milestones (fetch â†’ knowledge â†’ persona â†’ planning) through a
    // callback; the session advances in real time. NO fake timer or simulated
    // percentages â€” the UI reflects actual backend milestones.
    let progressStage: string | null = null;
    const sid = generationSessionId;
    const onImportProgress = sid
      ? async (stage: string) => {
          if (progressStage && progressStage !== stage) {
            await sessionService.updateStage(sid, progressStage as never, "completed").catch(() => {});
          }
          progressStage = stage;
          await sessionService.updateStage(sid, stage as never, "running").catch(() => {});
        }
      : undefined;

    const profileResult = existingProfileResult ?? await onboardingService.importProfile(sourceUrl, userId, creatorName, onImportProgress);
    markStage("profile_import", "completed");

    if (generationSessionId) {
      if (progressStage) {
        await sessionService.updateStage(generationSessionId, progressStage, "completed").catch(() => {});
      } else {
        await sessionService.updateStage(generationSessionId, "import_profile", "completed");
      }
      await sessionService.updateStage(generationSessionId, "knowledge_intelligence", "completed");
      await sessionService.updateStage(generationSessionId, "persona_detection", "completed");
      const { emitGenerationEvent } = await import("@/modules/generation-progress");
      await emitGenerationEvent(generationSessionId!, "generation.profile.imported", { creatorName }).catch(() => {});

      // RCCF-LAUNCH-TRACK-03: live micro-activity — real milestones the user
      // sees tick in below the stages (no invented progress).
      const acq = profileResult.acquisition as { capabilities?: string[]; populatedFields?: string[] } | undefined;
      if (acq?.populatedFields?.length) {
        await sessionService.recordActivity(generationSessionId, `Extracted your profile (${acq.populatedFields.length} fields)`);
      }
      if (profileResult.personaMatch?.persona?.name) {
        await sessionService.recordActivity(generationSessionId, `Detected "${profileResult.personaMatch.persona.name}" persona`);
      }
      if (profileResult.experienceProfile?.confidence != null) {
        await sessionService.recordActivity(generationSessionId, "Analyzed your content and audience");
      }
    }

    let goldenValidationResult = null;
    if (goldenDataset.isKnownUrl(sourceUrl)) {
      goldenValidationResult = new GoldenValidator().validateByUrl(
        sourceUrl,
        profileResult.experienceProfile,
      );
    }

    markStage("generation", "running");
    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "planning_context", "running");
    }

    const genStart = Date.now();
    const generateResult = await onboardingService.generate(
      profileResult.knowledgeGraph,
      profileResult.experienceProfile,
    );
    metricsService.recordDuration("generation", Date.now() - genStart, { sourcePlatform: profileResult.platform ?? "unknown" });
    markStage("generation", "completed");

    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "planning_context", "completed");
      await sessionService.updateStage(generationSessionId, "experience_planning", "completed");
      await sessionService.updateStage(generationSessionId, "composition", "completed");
      await sessionService.updateStage(generationSessionId, "artifact_generation", "completed");
    }

    const sourcePlatform = profileResult.platform;
    const runId = await provisioningService.createRun({
      creatorName,
      sourceUrl,
      sourcePlatform,
    });

    const pipelineResult = {
      generationResult: undefined as never,
      knowledgeGraph: profileResult.knowledgeGraph,
      blueprint: generateResult.websiteBlueprint,
      artifacts: generateResult.artifacts,
      provisioned: true,
      snapshotId: null,
      storefrontUrl: null,
      version: 1,
    };

    markStage("provisioning", "running");
    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "provisioning", "running");
    }

    // RCCF-68.2 — idempotent retry. A previous attempt may have provisioned the
    // tenant/website/workspace and then failed during builder-save or publish
    // (post-provision failure). Detect an existing tenant+website owned by the
    // authenticated Creator and REUSE it — never create Tenant #2 / Website #2 /
    // Workspace #2. Non-destructive: an existing published site is preserved.
    const existingTenantId = session?.user?.tenantId ?? null;
    const existingWebsite = existingTenantId
      ? await prisma.website.findUnique({ where: { tenantId: existingTenantId }, select: { id: true, tenant: { select: { subdomain: true, customDomain: true } } } })
      : null;

    let provisioned;
    if (existingTenantId && existingWebsite) {
      const ws = await workspaceRepository.findByTenantId(existingTenantId);
      const storefrontUrl = existingWebsite.tenant?.customDomain
        ? `https://${existingWebsite.tenant.customDomain}`
        : existingWebsite.tenant?.subdomain
          ? `/${existingWebsite.tenant.subdomain}`
          : `/`;
      provisioned = {
        success: true,
        tenantId: existingTenantId,
        websiteId: existingWebsite.id,
        workspaceId: ws?.id ?? existingTenantId,
        storefrontUrl,
        dashboardUrl: "/admin/dashboard",
        runId,
      };
      markStage("provisioning", "completed");
      if (generationSessionId) {
        await sessionService.recordActivity(generationSessionId, "Reusing your existing workspace");
      }

      // Non-destructive builder continuation: a previous attempt may have
      // provisioned the tenant/website but died before saving generated pages
      // (mid-provision failure). Seed pages ONLY when the website has none —
      // an existing published site is never overwritten.
      const { BuilderService } = await import("@/lib/builder/builder-service");
      const existingPages = await new BuilderService().load(existingWebsite.id);
      if (!existingPages || existingPages.length === 0) {
        const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
        const reuseBuilderData = buildBuilderArtifactData(pipelineResult);
        const generatedSections = (reuseBuilderData?.sections as Array<{ id: string; type: string; props: Record<string, unknown> }> | undefined) ?? [];
        if (generatedSections.length > 0) {
          const builderPages = storefrontToBuilderPages({
            sections: generatedSections,
            navigation: reuseBuilderData?.navigation as Record<string, unknown> | undefined,
          });
          if (builderPages.length > 0) {
            await new BuilderService().save(existingWebsite.id, builderPages);
          }
        }
      }
    } else {
      const provisioningInput = buildProvisioningInput({
        runId,
        authenticatedUserId: userId,
        creatorName,
        sourceUrl,
        sourcePlatform,
        avatarUrl: profileResult.channelMeta?.thumbnailUrl,
        planCode: "creator_launch",
        pipelineResult,
        category: categoryOverride || profileResult.knowledgeGraph.creator.niche,
        industry: categoryOverride || profileResult.knowledgeGraph.creator.niche,
      });

      try {
        provisioned = await provisioningService.provision(provisioningInput);
      } catch (err) {
        markStage("provisioning", "failed", err instanceof Error ? err.message : "Provisioning failed");
        if (generationSessionId) {
          await sessionService.fail(generationSessionId, err instanceof Error ? err.message : "Provisioning failed");
          const { emitGenerationEvent } = await import("@/modules/generation-progress");
          await emitGenerationEvent(generationSessionId!, "generation.failed", { stage: "provisioning", error: err instanceof Error ? err.message : "Provisioning failed" }).catch(() => {});
        }
        return { success: false, stages, error: err instanceof Error ? err.message : "Provisioning failed", retryable: false };
      }
      markStage("provisioning", "completed");
    }

    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "provisioning", "completed");
      await sessionService.updateProgress(generationSessionId, {
        status: "publishing",
        currentStage: "publishing",
        storefrontUrl: provisioned.storefrontUrl,
      });
      await sessionService.recordActivity(generationSessionId, "Created your workspace");
    }

    const ws = await workspaceRepository.findByTenantId(provisioned.tenantId);
    const resolvedWorkspaceId = ws?.id;

    if (resolvedWorkspaceId && generationSessionId) {
      await sessionService.updateProgress(generationSessionId, {
        currentStage: "publishing",
      });
      await sessionRegistry.update(generationSessionId, { workspaceId: resolvedWorkspaceId });
    }

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: provisioned.tenantId, key: "onboarding_source" } },
      update: {
        value: JSON.parse(JSON.stringify({
          sourceUrl, sourcePlatform, workspaceName, timezone, currency, language,
          completedAt: new Date().toISOString(),
        })),
      },
      create: {
        tenantId: provisioned.tenantId, key: "onboarding_source",
        value: JSON.parse(JSON.stringify({
          sourceUrl, sourcePlatform, workspaceName, timezone, currency, language,
          completedAt: new Date().toISOString(),
        })),
      },
    });

    markStage("builder_init", "running");
    let builderData = buildBuilderArtifactData(pipelineResult);

    // RCCF-LAUNCH-TRACK-04 (Section Presets): seed industry-appropriate section
    // presentation by the creator's category/niche (e.g. photographer →
    // Gallery→"Portfolio", Timeline→"My Journey"). Canonical ids unchanged;
    // presentation is metadata the creator can edit later.
    try {
      const { applySectionPresets } = await import("@/modules/section-presentation");
      const category = categoryOverride || profileResult.knowledgeGraph.creator.niche || "default";
      const sections = (builderData?.sections as Array<{ type: string; props: Record<string, unknown> }> | undefined) ?? [];
      for (const section of sections) {
        if (!section.props) section.props = {};
      }
      applySectionPresets(category, sections.map((s) => ({ baseId: s.type, config: s.props })));
    } catch {
      // presets are best-effort — never block generation
    }

    // RCCF-INTEGRATION-01 Phase 3: generation consumes the accepted goal
    // profile â€” goal-preferred sections are ordered earlier in the generated
    // builder artifact (hero first, footer last). Additive; no-op without goals.
    if (builderData && goals && goals.length > 0) {
      const sections = (builderData.sections as Array<{ type: string }> | undefined) ?? [];
      builderData = {
        ...builderData,
        sections: applyGoalSectionPriority(sections, {
          weights: goals.map((g) => ({ goalId: g.goalId, weight: g.weight })) as never,
          updatedAt: new Date().toISOString(),
          source: "recommended",
          entityType: "",
        }),
      };
    }

    if (builderData) {
      await prisma.setting.upsert({
        where: { tenantId_key: { tenantId: provisioned.tenantId, key: "builder_artifact" } },
        update: { value: JSON.parse(JSON.stringify(builderData)) },
        create: { tenantId: provisioned.tenantId, key: "builder_artifact", value: JSON.parse(JSON.stringify(builderData)) },
      });
    }
    markStage("builder_init", "completed");

    markStage("publishing", "running");
    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "publishing", "running");
      const { emitGenerationEvent } = await import("@/modules/generation-progress");
      await emitGenerationEvent(generationSessionId!, "generation.publish.started", { tenantId: provisioned.tenantId }).catch(() => {});
    }
    if (provisioned) {
      try {
        const publishResult = await publishingService.publish(provisioned.tenantId);
        if (!publishResult.success) {
          throw new Error(publishResult.error ?? "Publishing failed");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Publishing failed";
        captureError(err, { service: "onboarding-actions", operation: "publish", tenantId: provisioned.tenantId });
        markStage("publishing", "failed", msg);
        if (generationSessionId) {
          await sessionService.updateStage(generationSessionId, "publishing", "failed", msg);
          await sessionService.fail(generationSessionId, msg).catch(() => {});
          const { emitGenerationEvent } = await import("@/modules/generation-progress");
          await emitGenerationEvent(generationSessionId!, "generation.failed", { stage: "publishing", error: msg }).catch(() => {});
        }
        return { success: false, stages, error: msg, retryable: true, tenantId: provisioned.tenantId };
      }
    }
    markStage("publishing", "completed");
    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "publishing", "completed");
      await sessionService.recordActivity(generationSessionId, "Published your website");
    }

    try {
      await writeOnboardingComplete(provisioned.tenantId);
    } catch {
      // onboarding_completed upsert is best-effort; dashboard uses it for recovery UX
    }

    await logAction(provisioned.tenantId, "onboarding:completed", {
      sourceUrl, sourcePlatform, workspaceName, workspaceId: resolvedWorkspaceId, creatorName,
    });

    const website = await prisma.website.findUnique({
      where: { tenantId: provisioned.tenantId },
      select: { id: true },
    });

    const goldenValidationOutput = goldenValidationResult
      ? {
          passed: goldenValidationResult.passed,
          overallScore: goldenValidationResult.overallScore,
          regressions: goldenValidationResult.regressions,
        }
      : null;

    if (generationSessionId) {
      try {
        await sessionService.updateStage(generationSessionId, "golden_validation", "completed");
        await sessionService.complete(generationSessionId, {
          evaluationScore: profileResult.experienceProfile.confidence,
          goldenValidationScore: goldenValidationResult?.overallScore ?? undefined,
          storefrontUrl: provisioned.storefrontUrl,
          builderUrl: website ? "/builder" : undefined,
          dashboardUrl: website ? "/builder" : "/admin/dashboard",
        });
        const { emitGenerationEvent } = await import("@/modules/generation-progress");
        await emitGenerationEvent(generationSessionId!, "generation.publish.completed", { tenantId: provisioned.tenantId }).catch(() => {});
        await emitGenerationEvent(generationSessionId!, "generation.dashboard.ready", { tenantId: provisioned.tenantId }).catch(() => {});
        await emitGenerationEvent(generationSessionId!, "generation.completed", { tenantId: provisioned.tenantId }).catch(() => {});
      } catch (err) {
        captureError(err, { service: "onboarding-actions", operation: "completeGenerationSession" });
      }
    }

    return {
      success: true,
      stages,
      result: {
        tenantId: provisioned.tenantId,
        workspaceId: resolvedWorkspaceId,
        storefrontUrl: provisioned.storefrontUrl,
        dashboardUrl: website ? "/builder" : "/admin/dashboard",
      },
      goldenValidation: goldenValidationOutput,
    };
  } catch (error) {
    if (generationSessionId) {
      try {
        await sessionService.fail(generationSessionId, error instanceof Error ? error.message : "Generation failed");
      } catch {
      }
    }
    return { success: false, error: error instanceof Error ? error.message : "Generation failed" };
  }
}

export async function getProvisionRunId(): Promise<{ runId?: string; status?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: "Unauthorized" };
    const latestRun = await prisma.creatorProvisionRun.findFirst({
      where: { creatorName: session.user.name || undefined },
      orderBy: { startedAt: "desc" },
      select: { id: true, status: true },
    });
    if (!latestRun) return { error: "No provisioning run found" };
    return { runId: latestRun.id, status: latestRun.status };
  } catch {
    return { error: "Failed to check provisioning status" };
  }
}

export async function createGenerationSession(
  sourceUrl: string,
): Promise<{ sessionId: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { sessionId: "", error: "Unauthorized" };

    const ctx = correlationService.create({ creatorId: session.user.id });
    const gs = await sessionService.create({
      creatorId: session.user.id,
      creatorName: session.user.name || "Creator",
      sourceUrl,
      platform: detectPlatform(sourceUrl),
      correlationId: ctx.correlationId,
    });

    await sessionService.start(gs.id);
    await sessionService.beginExecution(gs.id);
    await sessionService.updateStage(gs.id, "import_profile", "running");

    return { sessionId: gs.id };
  } catch (error) {
    return { sessionId: "", error: error instanceof Error ? error.message : "Failed to create session" };
  }
}

type SessionProgressSuccess = {
  status: string;
  currentStage: string | null;
  progressPercent: number;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  error: string | null;
  stages: Array<{ type: string; status: string; label: string; error: string | null; duration: number | null }>;
  activity: string[];
  storefrontUrl: string | null;
  evaluationScore: number | null;
  goldenValidationScore: number | null;
  completedAt: string | null;
};

type SessionProgressResult = { success: true; data: SessionProgressSuccess } | { success: false; error: string };

export async function getGenerationSessionProgress(sessionId: string): Promise<SessionProgressResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const gs = await sessionService.getById(sessionId);
    if (!gs) return { success: false, error: "Session not found" };
    // A generation session is only readable by its owning creator (or an
    // established cross-tenant administrator). Non-owners are masked as
    // "Session not found" to avoid revealing whether the session exists.
    if (session.user.role !== "SUPER_ADMIN" && gs.creatorId !== session.user.id) {
      return { success: false, error: "Session not found" };
    }

    const stages = gs.stages.map((s) => ({
      type: s.type,
      status: s.status,
      label: s.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      error: s.error,
      duration: s.duration,
    }));

    // RCCF-LAUNCH-TRACK-03: live micro-activity (real pipeline milestones).
    const activity = (gs.history ?? [])
      .filter((h) => h.type === "activity" && h.data?.message)
      .map((h) => String(h.data!.message))
      .slice(-20);

    const elapsedMs = Date.now() - gs.startedAt.getTime();
    const progress = gs.progressPercent;
    const estimatedRemainingMs = progress > 0 && progress < 100
      ? Math.round((elapsedMs / progress) * (100 - progress))
      : null;

    return {
      success: true,
      data: {
        status: gs.status,
        currentStage: gs.currentStage,
        progressPercent: gs.progressPercent,
        elapsedMs,
        estimatedRemainingMs,
        error: gs.error,
        stages,
        activity,
        storefrontUrl: gs.storefrontUrl,
        evaluationScore: gs.evaluationScore,
        goldenValidationScore: gs.goldenValidationScore,
        completedAt: gs.completedAt?.toISOString() ?? null,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to get session status" };
  }
}

/** RCCF-LAUNCH-TRACK-03 Phase 8: refresh recovery â€” resume the latest in-flight
 *  generation session (never restart progress, never return to stage 1). */
export async function getActiveGenerationSession(): Promise<{ success: boolean; sessionId?: string; data?: Extract<SessionProgressResult, { success: true }>["data"]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const active = await sessionService.findLatestActive(session.user.id);
    if (!active) return { success: false, error: "No active session" };
    const progress = await getGenerationSessionProgress(active.id);
    if (!progress.success || !progress.data) return { success: false, error: "No active session" };
    return { success: true, sessionId: active.id, data: progress.data };
  } catch {
    return { success: false, error: "No active session" };
  }
}

/**
 * RCCF-72.16A — tenant-scoped authorization helper. A client-supplied tenantId
 * is never treated as a credential: the caller must own the tenant, be an
 * established cross-tenant administrator (SUPER_ADMIN), or — for onboarding
 * state — an AGENCY_ADMIN whose agency manages the tenant (established
 * assertAgencyOwnsTenant IDOR guard). No new roles or privileges are invented.
 */
type TenantAccessDecision = "ok" | "unauthorized" | "forbidden";

async function assertTenantAccess(tenantId: string, opts?: { allowAgency?: boolean }): Promise<TenantAccessDecision> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return "unauthorized";
  const role = session.user.role ?? null;
  if (role === "SUPER_ADMIN") return "ok";
  // DB-backed ownership: the token's tenantId can be stale for a freshly
  // provisioned tenant (a new creator's session is not re-minted on the same
  // request), so the authoritative owner signal is the user record.
  const dbUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { tenantId: true },
  });
  if (dbUser?.tenantId === tenantId) return "ok";
  if (opts?.allowAgency !== false && role === "AGENCY_ADMIN" && session.user.agencyId) {
    const agency = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
    if (agency.ok) return "ok";
  }
  return "forbidden";
}

export async function markOnboardingComplete(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await assertTenantAccess(tenantId);
    if (access !== "ok") {
      return { success: false, error: access === "unauthorized" ? "Unauthorized" : "Forbidden" };
    }
    return await writeOnboardingComplete(tenantId);
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark onboarding" };
  }
}

export async function isOnboardingComplete(
  tenantId: string,
): Promise<{ success: boolean; complete?: boolean; error?: string }> {
  try {
    const access = await assertTenantAccess(tenantId);
    if (access !== "ok") {
      return { success: false, error: access === "unauthorized" ? "Unauthorized" : "Forbidden" };
    }
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
    });
    return { success: true, complete: !!setting };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to check onboarding" };
  }
}

export async function retryPublish(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const access = await assertTenantAccess(tenantId, { allowAgency: false });
    if (access !== "ok") {
      return { success: false, error: access === "unauthorized" ? "Unauthorized" : "Forbidden" };
    }

    const result = await publishingService.publish(tenantId);
    if (!result.success) return { success: false, error: result.error ?? "Publish failed" };

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Retry publish failed" };
  }
}
