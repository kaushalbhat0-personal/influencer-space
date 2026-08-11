"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/modules/provisioning/application/provisioning-service";
import { publishingService } from "@/lib/publishing/service";
import {
  runProvisionPipeline, buildProvisioningInput, detectPlatform, buildContentSource,
} from "@/lib/generation/integration/provision-pipeline";
import { markOnboardingComplete } from "@/actions/onboarding.actions";
import { track } from "@/lib/analytics";
import { logAction } from "@/lib/audit";
import { captureError } from "@/lib/observability/error-tracker";
import type { ProvisioningInput } from "@/modules/provisioning/application/provisioning-service";

export type ProvisionActionResult = {
  success: boolean;
  data?: {
    runId: string;
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
  };
  error?: string;
};

export async function createProvisionRun(input: { creatorName: string; sourceUrl?: string; sourcePlatform?: string }): Promise<{ success: boolean; runId?: string; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized" };
    }
    const runId = await provisioningService.createRun(input);
    return { success: true, runId };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

export async function getProvisionRun(runId: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false as const, error: "Unauthorized" };
    }
    const run = await provisioningService.getRun(runId);
    return { success: true as const, data: run };
  } catch (error) {
    return { success: false as const, error: String(error) };
  }
}

export async function provisionCreator(
  input: ProvisioningInput & { runId: string },
): Promise<ProvisionActionResult> {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "SUPER_ADMIN") {
      return { success: false, error: "Unauthorized — Super Admin access required." };
    }

    track("provisioning:started", {
      creatorName: input.creatorName,
      source: input.sourcePlatform || "manual",
    });

    // RCCF-01: run the REAL generation pipeline so the deploy uses the actual
    // generated blueprint (not placeholder content). When no source URL is
    // provided the caller-supplied generatedContent/theme flow through unchanged.
    let provisioningInput: ProvisioningInput & { runId: string } = input;
    if (input.sourceUrl) {
      const sourcePlatform = input.sourcePlatform || detectPlatform(input.sourceUrl);
      const source = buildContentSource(input.sourceUrl, sourcePlatform, input.creatorName);
      const pipelineResult = await runProvisionPipeline(
        { sourceUrl: input.sourceUrl, creatorId: session.user.id, creatorName: input.creatorName, idempotencyPrefix: "provision", strategy: input.strategyId ?? "balanced" },
        source,
      );
      if (pipelineResult.blueprint) {
        provisioningInput = buildProvisioningInput({
          runId: input.runId,
          creatorName: input.creatorName,
          sourceUrl: input.sourceUrl,
          sourcePlatform,
          planCode: "creator_launch",
          pipelineResult,
          category: input.category,
          industry: input.industry,
        }) as ProvisioningInput & { runId: string };
      }
    }

    const result = await provisioningService.provision(provisioningInput);

    if (result) {
      try {
        const publishResult = await publishingService.publish(result.tenantId);
        if (!publishResult.success) {
          captureError(new Error(publishResult.error ?? "Publishing failed"), { service: "provision-actions", operation: "provisionCreator-publish", tenantId: result.tenantId });
          return { success: false, error: publishResult.error ?? "Publishing failed" };
        }
        await markOnboardingComplete(result.tenantId).catch((err) => {
          captureError(err, { service: "provision-actions", operation: "provisionCreator-markComplete" });
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Publishing failed";
        captureError(err, { service: "provision-actions", operation: "provisionCreator-publish", tenantId: result.tenantId });
        return { success: false, error: msg };
      }
    }

    await logAction(result.tenantId, "provisioning:completed", {
      creatorName: input.creatorName,
      tenantSlug: result.tenantSlug,
      sourcePlatform: input.sourcePlatform || "manual",
    }).catch((err) => { captureError(err, { service: "provision-actions", operation: "provisionCreator-audit" }); });

    track("provisioning:completed", {
      tenantId: result.tenantId,
      creatorName: input.creatorName,
      tenantSlug: result.tenantSlug,
    });

    return {
      success: true,
      data: {
        runId: result.runId,
        tenantId: result.tenantId,
        tenantSlug: result.tenantSlug,
        workspaceId: result.workspaceId,
        websiteId: result.websiteId,
        storefrontUrl: result.storefrontUrl,
        dashboardUrl: result.dashboardUrl,
        adminEmail: result.adminEmail,
        temporaryPassword: result.temporaryPassword,
        websiteStatus: result.websiteStatus,
        tenantStatus: result.tenantStatus,
        publicationStatus: result.publicationStatus,
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Provisioning failed";
    track("provisioning:failed", { error: message });
    return { success: false, error: message };
  }
}

