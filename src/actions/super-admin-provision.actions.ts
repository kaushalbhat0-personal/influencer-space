/* eslint-disable @typescript-eslint/no-explicit-any */
"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/lib/provisioning/provisioning-service";
import { workspaceRepository } from "@/modules/workspace/infrastructure/repository";
import { capabilityService } from "@/lib/capabilities";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { platformEventBus } from "@/lib/events";
import { publishSnapshotService } from "@/lib/publishing/snapshot";
import {
  runProvisionPipeline, buildProvisioningInput, buildBuilderArtifactData,
  buildPublishSnapshotRecord, detectPlatform, buildContentSource,
} from "@/lib/generation/integration/provision-pipeline";

export interface AnalyzeResult {
  creatorName: string;
  sourcePlatform: string;
  generatedContent: Record<string, unknown> | null;
  generatedTheme: Record<string, unknown> | null;
  suggestedSections: string[];
  stageResults: Array<{ stage: string; status: string; error?: string }>;
  totalDurationMs: number;
  errors: string[];
}

export interface ProvisionResult {
  tenantId: string;
  tenantSlug: string;
  workspaceId: string;
  storefrontUrl: string;
  dashboardUrl: string;
  adminEmail: string;
  temporaryPassword: string;
  loginUrl: string;
}

export interface DuplicateInfo {
  hasExistingTenant: boolean;
  existingTenantName?: string;
  existingTenantSlug?: string;
  hasExistingSocialUrl: boolean;
  existingPlatform?: string;
  existingPlan?: string;
}

export async function analyzeUrl(sourceUrl: string): Promise<{
  success: boolean;
  duplicate?: DuplicateInfo;
  analysis?: AnalyzeResult;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "AGENCY_ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const sourcePlatform = detectPlatform(sourceUrl);
    const slug = sourceUrl.split("/").filter(Boolean).pop()?.toLowerCase().replace(/[^a-z0-9-]/g, "-") || "creator";
    const creatorName = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    const source = buildContentSource(sourceUrl, sourcePlatform, creatorName);
    const pipelineResult = await runProvisionPipeline(
      { sourceUrl, creatorId: session.user.id, creatorName, idempotencyPrefix: "analyze", strategy: "free" },
      source,
    );

    const existingTenant = await prisma.tenant.findFirst({
      where: { subdomain: slug },
      select: { name: true, subdomain: true },
    });

    const existingPlatform = await prisma.setting.findFirst({
      where: { key: "onboarding_source", value: { path: ["sourceUrl"], equals: sourceUrl } },
      select: { tenant: { select: { name: true } }, value: true },
    });

    const duplicate: DuplicateInfo = {
      hasExistingTenant: !!existingTenant,
      existingTenantName: existingTenant?.name,
      existingTenantSlug: existingTenant?.subdomain,
      hasExistingSocialUrl: !!existingPlatform,
      existingPlatform: sourcePlatform,
    };

    const bp = pipelineResult.blueprint;
    return {
      success: true,
      duplicate,
      analysis: {
        creatorName,
        sourcePlatform,
        generatedContent: bp ? { heroTitle: bp.website.title, aboutSection: bp.about?.props?.bio as string ?? "" } : null,
        generatedTheme: bp ? { preset: "custom", primaryColor: bp.theme.primary, secondaryColor: bp.theme.secondary } : null,
        suggestedSections: bp ? bp.sections.map((s) => s.type) : ["hero"],
        stageResults: [{ stage: "generation", status: pipelineResult.blueprint ? "completed" : "failed", error: undefined }],
        totalDurationMs: 0,
        errors: [],
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Analysis failed" };
  }
}

export async function confirmProvision(params: {
  sourceUrl: string;
  creatorName: string;
  planCode: string;
  sourcePlatform?: string;
  strategyId?: string;
  sections?: string[];
}): Promise<{
  success: boolean;
  result?: ProvisionResult;
  error?: string;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user.role !== "SUPER_ADMIN" && session.user.role !== "AGENCY_ADMIN")) {
      return { success: false, error: "Unauthorized" };
    }

    const sourcePlatform = params.sourcePlatform || detectPlatform(params.sourceUrl);

    const runId = await provisioningService.createRun({
      creatorName: params.creatorName,
      sourceUrl: params.sourceUrl,
      sourcePlatform,
    });

    const source = buildContentSource(params.sourceUrl, sourcePlatform, params.creatorName);
    const pipelineResult = await runProvisionPipeline(
      { sourceUrl: params.sourceUrl, creatorId: session.user.id, creatorName: params.creatorName, idempotencyPrefix: "provision", strategy: params.strategyId === "fast" ? "free" : "pro" },
      source,
    );

    if (!pipelineResult.blueprint || pipelineResult.artifacts.length === 0) {
      return { success: false, error: "Website generation failed" };
    }

    const provisioningInput = buildProvisioningInput({
      runId, creatorName: params.creatorName, sourceUrl: params.sourceUrl,
      sourcePlatform, planCode: params.planCode, pipelineResult,
    });

    let provisioned;
    try {
      provisioned = await provisioningService.provision(provisioningInput as any);
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Provisioning failed" };
    }

    const ws = await workspaceRepository.findByTenantId(provisioned.tenantId);
    const workspaceId = ws?.id ?? provisioned.workspaceId;

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: provisioned.tenantId, key: "onboarding_source" } },
      update: { value: JSON.parse(JSON.stringify({ sourceUrl: params.sourceUrl, sourcePlatform, planCode: params.planCode, completedAt: new Date().toISOString() })) },
      create: { tenantId: provisioned.tenantId, key: "onboarding_source", value: JSON.parse(JSON.stringify({ sourceUrl: params.sourceUrl, sourcePlatform, planCode: params.planCode, completedAt: new Date().toISOString() })) },
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
      const website = await prisma.website.findUnique({ where: { tenantId: provisioned.tenantId }, select: { id: true } });
      if (!website) {
        console.error(`[provision] Website not found for tenantId=${provisioned.tenantId}`);
        return { success: false, error: "Website not found during publishing" };
      }
      try {
        await publishSnapshotService.publishFromArtifact(website.id, snapshotData as never);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Publishing failed";
        console.error(`[provision] Publishing failed for websiteId=${website.id} tenantId=${provisioned.tenantId}`, err);
        return { success: false, error: msg };
      }
    }

    const capabilities = capabilityService.planSummary(params.planCode);
    if (!capabilities) {
      return { success: false, error: `Invalid plan: ${params.planCode}` };
    }

    if (ws) {
      const existingOwner = await prisma.workspaceMember.findFirst({
        where: { workspaceId: ws.id, role: "OWNER" },
        select: { userId: true },
      });
      if (!existingOwner && session.user.id) {
        await workspaceRepository.addMember({ workspaceId: ws.id, userId: session.user.id, role: "OWNER" });
      }
    }

    platformEventBus.publish("CreatorProvisioned", {
      tenantId: provisioned.tenantId,
      creatorName: params.creatorName,
      sourceUrl: params.sourceUrl,
      sourcePlatform,
      workspaceId,
      planCode: params.planCode,
      correlationId: undefined,
    });

    await logAction(provisioned.tenantId, "provisioning:completed", {
      sourceUrl: params.sourceUrl,
      sourcePlatform,
      planCode: params.planCode,
      workspaceId,
      creatorName: params.creatorName,
    });

    const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/admin/login`;

    return {
      success: true,
      result: {
        tenantId: provisioned.tenantId,
        tenantSlug: provisioned.tenantSlug,
        workspaceId,
        storefrontUrl: provisioned.storefrontUrl,
        dashboardUrl: provisioned.dashboardUrl,
        adminEmail: provisioned.adminEmail,
        temporaryPassword: provisioned.temporaryPassword,
        loginUrl,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Provisioning failed",
    };
  }
}



