"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/lib/provisioning/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { logAction } from "@/lib/audit";
import { onboardingService } from "@/lib/onboarding/service";
import { goldenDataset, GoldenValidator } from "@/lib/generation/golden";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import { sessionService } from "@/lib/generation/session";
import { correlationService } from "@/lib/platform/correlation";
import { platformEventBus } from "@/lib/events";
import {
  buildProvisioningInput, buildBuilderArtifactData,
  buildPublishSnapshotRecord,
} from "@/lib/generation/integration/provision-pipeline";
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
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const creatorName = session.user.name || "Creator";
    const result = await onboardingService.importProfile(sourceUrl, session.user.id, creatorName);

    return {
      success: true,
      platform: result.platform,
      creatorName: result.knowledgeGraph.creator.name,
      avatarUrl: result.knowledgeGraph.creator.bio,
      followers: result.knowledgeGraph.creator.followers,
      category: result.knowledgeGraph.creator.niche,
      persona: { id: result.personaMatch.persona.id, name: result.personaMatch.persona.name },
      confidence: result.experienceProfile.confidence,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Profile import failed" };
  }
}

async function ensureWorkspace(userId: string): Promise<string> {
  const memberships = await workspaceRepository.findMembershipsByUserId(userId);
  const active = memberships.find((m) => m.status === "ACTIVE");
  if (active) return active.workspaceId;

  const slug = `ws_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const ws = await workspaceRepository.create({
    type: "TENANT",
    name: "My Workspace",
    slug,
  });
  await workspaceRepository.addMember({ workspaceId: ws.id, userId, role: "OWNER" });
  return ws.id;
}

export async function runCreatorGeneration(
  sourceUrl: string,
  workspaceName: string,
  timezone: string,
  currency: string,
  language: string,
  existingProfileResult?: ImportProfileResult,
): Promise<{
  success: boolean;
  stages?: Array<{ stage: string; status: string; error?: string }>;
  result?: { tenantId: string; workspaceId: string; storefrontUrl: string; dashboardUrl: string };
  goldenValidation?: { passed: boolean; overallScore: number; regressions: string[] } | null;
  error?: string;
}> {
  let generationSessionId: string | null = null;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const creatorName = session.user.name || "Creator";
    const userId = session.user.id;

    const workspaceId = await ensureWorkspace(userId);

    const ctx = correlationService.create({
      workspaceId,
      creatorId: userId,
    });

    try {
      const gs = await sessionService.create({
        workspaceId,
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
      console.error(`[onboarding][${ctx.correlationId}] Failed to create generation session`, err);
    }

    if (generationSessionId) {
      platformEventBus.publish("WebsiteBeingGenerated", {
        tenantId: "",
        workspaceId,
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
      creatorName,
      sourceUrl,
      sourcePlatform,
      planCode: "creator_free",
      pipelineResult,
    });

    let provisioned;
    try {
      provisioned = await provisioningService.provision(provisioningInput);
    } catch (err) {
      markStage("provisioning", "failed", err instanceof Error ? err.message : "Provisioning failed");
      if (generationSessionId) {
        await sessionService.fail(generationSessionId, err instanceof Error ? err.message : "Provisioning failed");
      }
      return { success: false, stages, error: err instanceof Error ? err.message : "Provisioning failed" };
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
    const resolvedWorkspaceId = ws?.id ?? workspaceId;

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
    const snapshotData = buildPublishSnapshotRecord(pipelineResult);
    if (snapshotData && provisioned) {
      const website = await prisma.website.findUnique({
        where: { tenantId: provisioned.tenantId },
        select: { id: true },
      });
      if (!website) {
        const errMsg = "Website not found for publishing";
        markStage("publishing", "failed", errMsg);
        console.error(`[onboarding] Website not found for tenantId=${provisioned.tenantId}`);
        if (generationSessionId) {
          await sessionService.fail(generationSessionId, errMsg);
        }
        return { success: false, stages, error: errMsg };
      }
      try {
        await publishSnapshotService.publishFromArtifact(website.id, snapshotData as never);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Publishing failed";
        console.error(`[onboarding] Publishing failed for websiteId=${website.id} tenantId=${provisioned.tenantId}`, err);
        markStage("publishing", "failed", msg);
        if (generationSessionId) {
          await sessionService.fail(generationSessionId, msg);
        }
        return { success: false, stages, error: msg };
      }
    }
    markStage("publishing", "completed");
    if (generationSessionId) {
      await sessionService.updateStage(generationSessionId, "publishing", "completed");
    }

    try {
      revalidatePath("/", "layout");
    } catch {
      // cache invalidation is best-effort
    }

    const ownerMember = ws
      ? await prisma.workspaceMember.findFirst({
          where: { workspaceId: ws.id, userId, role: "OWNER" },
          select: { id: true },
        })
      : null;
    if (ws && !ownerMember) {
      await workspaceRepository.addMember({ workspaceId: ws.id, userId, role: "OWNER" });
    }

    await logAction(provisioned.tenantId, "onboarding:completed", {
      sourceUrl, sourcePlatform, workspaceName, workspaceId, creatorName,
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
        console.error("[onboarding] Failed to complete generation session", err);
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
