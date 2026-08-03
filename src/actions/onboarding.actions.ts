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
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import {
  buildProvisioningInput, buildBuilderArtifactData,
} from "@/lib/generation/integration/provision-pipeline";
import { nicheDetector } from "@/lib/generation/intelligence/niche-detector";
import type { ImportProfileResult } from "@/lib/onboarding/service";

export async function importCreatorProfile(sourceUrl: string): Promise<{
  success: boolean;
  platform?: string;
  creatorName?: string;
  avatarUrl?: string;
  followers?: number;
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
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

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
    }

    const stages: Array<{ stage: string; status: string; error?: string }> = [];
    const markStage = (stage: string, status: string, error?: string) => {
      stages.push({ stage, status, error });
    };

    markStage("profile_import", "running");
    const profileResult = existingProfileResult ?? await onboardingService.importProfile(sourceUrl, userId, creatorName);
    markStage("profile_import", "completed");

    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "import_profile", "completed");
      await sessionService.updateStage(generationSessionId, "knowledge_intelligence", "completed");
      await sessionService.updateStage(generationSessionId, "persona_detection", "completed");
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

    const generateResult = await onboardingService.generate(
      profileResult.knowledgeGraph,
      profileResult.experienceProfile,
    );
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
      planCode: "creator_free",
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
    const builderData = buildBuilderArtifactData(pipelineResult);
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
        }
        return { success: false, stages, error: msg, retryable: true, tenantId: provisioned.tenantId };
      }
    }
    markStage("publishing", "completed");
    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "publishing", "completed");
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

export async function markOnboardingComplete(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: "onboarding_completed" } },
      update: { value: { completedAt: new Date().toISOString() } },
      create: { tenantId, key: "onboarding_completed", value: { completedAt: new Date().toISOString() } },
    });
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
