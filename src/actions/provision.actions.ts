"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { provisioningService } from "@/lib/provisioning/provisioning-service";
import { track } from "@/lib/analytics";
import { logAction } from "@/lib/audit";
import type { ProvisioningInput } from "@/lib/provisioning/provisioning-service";

export type ProvisionActionResult = {
  success: boolean;
  data?: {
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

export async function provisionCreator(
  input: ProvisioningInput,
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

    const result = await provisioningService.provision(input);

    await logAction(result.tenantId, "provisioning:completed", {
      creatorName: input.creatorName,
      tenantSlug: result.tenantSlug,
      sourcePlatform: input.sourcePlatform || "manual",
    }).catch(() => {});

    track("provisioning:completed", {
      tenantId: result.tenantId,
      creatorName: input.creatorName,
      tenantSlug: result.tenantSlug,
    });

    return {
      success: true,
      data: {
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
