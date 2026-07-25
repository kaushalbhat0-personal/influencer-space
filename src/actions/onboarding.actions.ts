/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/lib/provisioning/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { capabilityService } from "@/lib/capabilities";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import {
  runProvisionPipeline, buildProvisioningInput, buildBuilderArtifactData,
  buildPublishSnapshotRecord, detectPlatform, buildContentSource,
} from "@/lib/generation/integration/provision-pipeline";

export async function startOnboardingGeneration(sourceUrl: string, planCode?: string): Promise<{
  success: boolean;
  stages?: Array<{ stage: string; status: string; error?: string }>;
  result?: { tenantId: string; workspaceId: string; storefrontUrl: string; dashboardUrl: string };
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };

    const creatorName = session.user.name || "Creator";
    const userId = session.user.id;
    const resolvedPlan = planCode || "creator_free";
    const sourcePlatform = detectPlatform(sourceUrl);

    const runId = await provisioningService.createRun({ creatorName, sourceUrl, sourcePlatform });

    const source = buildContentSource(sourceUrl, sourcePlatform, creatorName);
    const pipelineResult = await runProvisionPipeline(
      { sourceUrl, creatorId: userId, creatorName, idempotencyPrefix: "onboarding", strategy: "free" },
      source,
    );

    const stages = [
      { stage: "generation", status: pipelineResult.blueprint ? "completed" : "failed", error: pipelineResult.blueprint ? undefined : "Generation failed" },
      { stage: "provisioning", status: pipelineResult.provisioned ? "completed" : "pending", error: undefined },
    ];

    if (!pipelineResult.blueprint || pipelineResult.artifacts.length === 0) {
      return { success: false, stages, error: "Website generation failed" };
    }

    const provisioningInput = buildProvisioningInput({
      runId, creatorName, sourceUrl, sourcePlatform, planCode: resolvedPlan, pipelineResult,
    });

    let provisioned;
    try {
      provisioned = await provisioningService.provision(provisioningInput);
    } catch (err) {
      return { success: false, stages, error: err instanceof Error ? err.message : "Provisioning failed" };
    }

    const ws = await workspaceRepository.findByTenantId(provisioned.tenantId);
    const workspaceId = ws?.id ?? provisioned.workspaceId;

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: provisioned.tenantId, key: "onboarding_source" } },
      update: { value: JSON.parse(JSON.stringify({ sourceUrl, sourcePlatform, planCode: resolvedPlan, completedAt: new Date().toISOString() })) },
      create: { tenantId: provisioned.tenantId, key: "onboarding_source", value: JSON.parse(JSON.stringify({ sourceUrl, sourcePlatform, planCode: resolvedPlan, completedAt: new Date().toISOString() })) },
    });

    const builderData = buildBuilderArtifactData(pipelineResult);
    if (builderData) {
      await prisma.setting.upsert({
        where: { tenantId_key: { tenantId: provisioned.tenantId, key: "builder_artifact" } },
        update: { value: JSON.parse(JSON.stringify(builderData)) },
        create: { tenantId: provisioned.tenantId, key: "builder_artifact", value: JSON.parse(JSON.stringify(builderData)) },
      });
    }

    const snapshotData = buildPublishSnapshotRecord(pipelineResult);
    if (snapshotData && provisioned) {
      try {
        const { publishSnapshotService } = await import("@/lib/publishing/snapshot");
        const website = await prisma.website.findUnique({ where: { tenantId: provisioned.tenantId }, select: { id: true } });
        if (website) await publishSnapshotService.publishFromArtifact(website.id, snapshotData as any);
      } catch {}
    }

    const capabilities = capabilityService.planSummary(resolvedPlan);
    if (!capabilities) {
      return { success: false, stages, error: `Invalid plan: ${resolvedPlan} — capabilities not found` };
    }

    const ownerMember = ws ? await prisma.workspaceMember.findFirst({ where: { workspaceId: ws.id, userId, role: "OWNER" }, select: { id: true } }) : null;
    if (ws && !ownerMember) {
      await workspaceRepository.addMember({ workspaceId: ws.id, userId, role: "OWNER" });
    }

    await logAction(provisioned.tenantId, "onboarding:completed", { sourceUrl, sourcePlatform, planCode: resolvedPlan, workspaceId, creatorName });

    const website = await prisma.website.findUnique({ where: { tenantId: provisioned.tenantId }, select: { id: true } });

    return {
      success: true,
      stages,
      result: {
        tenantId: provisioned.tenantId,
        workspaceId,
        storefrontUrl: provisioned.storefrontUrl,
        dashboardUrl: website ? `/builder` : `/admin/dashboard`,
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Onboarding generation failed" };
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
