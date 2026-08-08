"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { onboardingService } from "@/lib/onboarding/service";
import { goldenDataset, GoldenValidator } from "@/lib/generation/golden";
import { publishingService } from "@/lib/publishing/service";
import { sessionService, sessionRegistry } from "@/lib/generation/session";
import { correlationService } from "@/lib/platform/correlation";
import { platformEventBus } from "@/lib/events";
import { emitEvent } from "@/modules/event-runtime";
import { applyGoalSectionPriority } from "@/modules/goals-runtime";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";
import {
  buildProvisioningInput, buildBuilderArtifactData, detectPlatform,
} from "@/lib/generation/integration/provision-pipeline";
import { nicheDetector } from "@/lib/generation/intelligence/niche-detector";
import type { ImportProfileResult } from "@/lib/onboarding/service";

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

    // VALIDATION-01 V-005: surface unsupported social platforms with a clear
    // error instead of silently producing an empty "manual" profile.
    const detected = detectPlatform(sourceUrl);
    if (["instagram", "tiktok", "linkedin", "twitter"].includes(detected)) {
      return {
        success: false,
        error: `${detected.charAt(0).toUpperCase() + detected.slice(1)} import isn't supported yet. Paste a YouTube channel, a website URL, or a Google Business listing instead.`,
      };
    }

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
          platform: "youtube",
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
        sourcePlatform: "youtube",
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

    const provisioningInput = buildProvisioningInput({
      runId,
      authenticatedUserId: userId,
      creatorName,
      sourceUrl,
      sourcePlatform,
      planCode: "creator_launch",
      pipelineResult,
      category: categoryOverride || profileResult.knowledgeGraph.creator.niche,
      industry: categoryOverride || profileResult.knowledgeGraph.creator.niche,
    });

    let provisioned;
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
      await markOnboardingComplete(provisioned.tenantId);
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
      platform: "youtube",
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

export async function markOnboardingComplete(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
      update: { value: { completedAt: new Date().toISOString() } },
      create: { tenantId, key: "onboarding_completed", value: { completedAt: new Date().toISOString() } },
    });
    await emitEvent("onboarding.completed", tenantId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to mark onboarding" };
  }
}

export async function isOnboardingComplete(tenantId: string): Promise<boolean> {
  try {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
    });
    return !!setting;
  } catch {
    return false;
  }
}

export async function retryPublish(
  tenantId: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const sess = await getServerSession(authOptions);
    if (!sess?.user?.id) return { success: false, error: "Unauthorized" };

    const result = await publishingService.publish(tenantId);
    if (!result.success) return { success: false, error: result.error ?? "Publish failed" };

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Retry publish failed" };
  }
}
