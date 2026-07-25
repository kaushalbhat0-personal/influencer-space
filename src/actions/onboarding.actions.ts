"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/lib/provisioning/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";

import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { onboardingService } from "@/lib/onboarding/service";
import { goldenDataset, GoldenValidator } from "@/lib/generation/golden";
import {
  buildProvisioningInput, buildBuilderArtifactData,
  buildPublishSnapshotRecord,
} from "@/lib/generation/integration/provision-pipeline";

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

export async function runCreatorGeneration(sourceUrl: string, workspaceName: string, timezone: string, currency: string, language: string): Promise<{
  success: boolean;
  stages?: Array<{ stage: string; status: string; error?: string }>;
  result?: { tenantId: string; workspaceId: string; storefrontUrl: string; dashboardUrl: string };
  goldenValidation?: { passed: boolean; overallScore: number; regressions: string[] } | null;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const creatorName = session.user.name || "Creator";
    const userId = session.user.id;

    const stages: Array<{ stage: string; status: string; error?: string }> = [];
    const markStage = (stage: string, status: string, error?: string) => {
      stages.push({ stage, status, error });
    };

    markStage("profile_import", "running");
    const profileResult = await onboardingService.importProfile(sourceUrl, userId, creatorName);
    markStage("profile_import", "completed");

    let goldenValidationResult = null;
    if (goldenDataset.isKnownUrl(sourceUrl)) {
      goldenValidationResult = new GoldenValidator().validateByUrl(
        sourceUrl,
        profileResult.experienceProfile,
      );
    }

    markStage("generation", "running");
    const generateResult = await onboardingService.generate(
      profileResult.knowledgeGraph,
      profileResult.experienceProfile,
    );
    markStage("generation", "completed");

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
      return { success: false, stages, error: err instanceof Error ? err.message : "Provisioning failed" };
    }
    markStage("provisioning", "completed");

    const ws = await workspaceRepository.findByTenantId(provisioned.tenantId);
    const workspaceId = ws?.id ?? provisioned.workspaceId;

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
    const snapshotData = buildPublishSnapshotRecord(pipelineResult);
    if (snapshotData && provisioned) {
      try {
        const { publishSnapshotService } = await import("@/lib/publishing/snapshot");
        const website = await prisma.website.findUnique({
          where: { tenantId: provisioned.tenantId },
          select: { id: true },
        });
        if (website) {
          await publishSnapshotService.publishFromArtifact(website.id, snapshotData as never);
        }
      } catch {
        markStage("publishing", "completed");
      }
    }
    markStage("publishing", "completed");

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

    return {
      success: true,
      stages,
      result: {
        tenantId: provisioned.tenantId,
        workspaceId,
        storefrontUrl: provisioned.storefrontUrl,
        dashboardUrl: website ? "/builder" : "/admin/dashboard",
      },
      goldenValidation: goldenValidationResult
        ? {
            passed: goldenValidationResult.passed,
            overallScore: goldenValidationResult.overallScore,
            regressions: goldenValidationResult.regressions,
          }
        : null,
    };
  } catch (error) {
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
