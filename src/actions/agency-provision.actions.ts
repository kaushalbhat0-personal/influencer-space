"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { confirmProvision } from "@/actions/super-admin-provision.actions";
import { partnerService } from "@/lib/partners";
import { commissionService } from "@/lib/commission";
import { logAction } from "@/lib/audit";
import { platformEventBus } from "@/lib/events";
import { prisma } from "@/lib/prisma";

export async function provisionClient(params: {
  sourceUrl: string;
  creatorName: string;
  planCode?: string;
}) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { success: false, error: "Unauthorized" };
    const agencyId = (session.user as { agencyId?: string })?.agencyId;
    if (!agencyId) return { success: false, error: "No agency configured" };

    const resolvedPlan = params.planCode || "creator_free";

    const provisionResult = await confirmProvision({
      sourceUrl: params.sourceUrl,
      creatorName: params.creatorName,
      planCode: resolvedPlan,
    });

    if (!provisionResult.success || !provisionResult.result) {
      return { success: false, error: provisionResult.error || "Provisioning failed" };
    }

    const { tenantId, workspaceId, storefrontUrl, adminEmail, temporaryPassword, loginUrl } = provisionResult.result;

    // ── Partner Assignment ──────────────────────────────────────────────
    let partnerRecord = partnerService.get(agencyId);
    if (!partnerRecord) {
      partnerRecord = partnerService.create({
        id: agencyId,
        type: "agency",
        businessName: session.user.name || `Agency_${agencyId.slice(0, 8)}`,
      });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { slug: true, name: true },
    });

    const partnerAssign = await partnerService.assignWorkspace(
      agencyId,
      workspaceId,
      workspace?.slug ?? tenantId,
      workspace?.name ?? params.creatorName,
      session.user.id,
      "created",
    );

    if (!partnerAssign.success) {
      return { success: false, error: partnerAssign.error || "Partner assignment failed" };
    }

    // ── Commission Setup ────────────────────────────────────────────────
    const existingRules = commissionService.listRules({ partnerId: agencyId });
    if (existingRules.length === 0) {
      commissionService.createRule({
        platformSharePercent: 30,
        partnerSharePercent: 70,
        type: "partner_override",
        partnerId: agencyId,
        label: `Agency ${agencyId.slice(0, 8)} — Default Split`,
        priority: 50,
      });
    }

    // ── Partner Event ─────────────────────────────────────────────────────
    platformEventBus.publish("PartnerAssigned", {
      partnerId: agencyId,
      workspaceId,
      workspaceName: params.creatorName,
      assignedBy: session.user.id,
    });

    // ── Audit ───────────────────────────────────────────────────────────
    await logAction(tenantId, "client:provisioned", {
      agencyId,
      workspaceId,
      creatorName: params.creatorName,
      sourceUrl: params.sourceUrl,
      planCode: resolvedPlan,
    });

    return {
      success: true,
      result: {
        tenantId,
        workspaceId,
        storefrontUrl,
        adminEmail,
        temporaryPassword,
        loginUrl,
        creatorName: params.creatorName,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Client provisioning failed",
    };
  }
}
