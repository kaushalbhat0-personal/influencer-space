"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { assertAgencyOwnsTenant, canMutate } from "@/modules/partner/application/authorization";
import { BuilderService } from "@/lib/builder/builder-service";
import { publishingService } from "@/lib/publishing/service";
import { workspacePolicy } from "@/lib/workspace/policy";
import { workspaceContext } from "@/modules/workspace/application/workspace-context";
import type { BuilderPage } from "@/lib/builder/types";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

const builderService = new BuilderService();

async function resolveClientWebsiteId(tenantId: string): Promise<string> {
  const website = await prisma.website.findUnique({ where: { tenantId }, select: { id: true } });
  if (!website) throw new Error("No website");
  return website.id;
}

/**
 * Agency-scoped builder load — verified via AgencyTenant ownership.
 * Preserves single BuilderService pipeline; no second resolver.
 */
export async function agencyLoadClientBuilder(tenantId: string): Promise<{ success: boolean; pages?: BuilderPage[]; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.agencyId) return { success: false, error: "Unauthorized" };
    if (!canMutate(session.user.role)) return { success: false, error: "Only agency admins can load client builder" };
    const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
    if (!owned.ok) return { success: false, error: owned.error ?? "Forbidden" };

    const websiteId = await resolveClientWebsiteId(tenantId);
    const pages = await builderService.load(websiteId);
    return { success: true, pages };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function agencySaveClientBuilder(tenantId: string, pages: BuilderPage[]): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.agencyId) return { success: false, error: "Unauthorized" };
    if (!canMutate(session.user.role)) return { success: false, error: "Only agency admins can edit client websites" };
    const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
    if (!owned.ok) return { success: false, error: owned.error ?? "Forbidden" };

    const ctx = await workspaceContext.getActive();
    if (ctx?.workspaceId) {
      try {
        await workspacePolicy.assertCanEdit(ctx.workspaceId);
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Cannot edit" };
      }
    }

    const websiteId = await resolveClientWebsiteId(tenantId);
    // Reuse same empty-state protection as builder.actions.ts
    const existingPages = await builderService.load(websiteId).catch(() => [] as BuilderPage[]);
    const existingCount = existingPages.reduce((acc, p) => acc + (p.sections?.length ?? 0), 0);
    const incomingCount = pages.reduce((acc, p) => acc + p.sections.length, 0);
    if (existingCount > 0 && incomingCount === 0) {
      const existingIds = new Set(existingPages.map((p) => p.id));
      const incomingIds = new Set(pages.map((p) => p.id));
      const hasOverlap = Array.from(incomingIds).some((id) => existingIds.has(id));
      const isSameSinglePage = pages.length === 1 && existingPages.length === 1 && pages[0].id === existingPages[0].id;
      if (!isSameSinglePage && !hasOverlap) {
        return { success: false, error: "Draft has no sections — not overwriting valid draft" };
      }
    }

    await builderService.save(websiteId, pages);
    try {
      await publishingService.markChangesPending(tenantId);
    } catch {
      // best-effort
    }
    await logAction(tenantId, "agency:builder-save", { agencyId: session.user.agencyId }).catch(() => {});
    revalidatePath("/agency");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

export async function agencyPublishClient(tenantId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session.user.agencyId) return { success: false, error: "Unauthorized" };
    if (!canMutate(session.user.role)) return { success: false, error: "Only agency admins can publish" };
    const owned = await assertAgencyOwnsTenant(session.user.id, session.user.agencyId, tenantId);
    if (!owned.ok) return { success: false, error: owned.error ?? "Forbidden" };

    const workspace = await prisma.workspace.findUnique({ where: { agencyId: session.user.agencyId }, select: { id: true } });
    if (workspace) {
      try {
        await workspacePolicy.assertCanPublish(workspace.id);
      } catch (e) {
        return { success: false, error: e instanceof Error ? e.message : "Cannot publish" };
      }
    }

    const result = await publishingService.publish(tenantId);
    if (!result.success) return { success: false, error: result.error ?? "Publish failed" };
    await logAction(tenantId, "agency:publish", { agencyId: session.user.agencyId, version: result.version }).catch(() => {});
    revalidatePath("/agency");
    return { success: true };
  } catch (e) {
    return { success: false, error: String(e) };
  }
}

/**
 * Creator-initiated agency revoke — the workspace OWNER (ADMIN) can sever
 * the AgencyTenant link. Previously only agency could offboard.
 */
export async function creatorRevokeAgency(tenantId: string): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.tenantId) return { success: false, error: "Unauthorized" };
  if (session.user.tenantId !== tenantId) return { success: false, error: "Tenant mismatch" };
  // Verify caller is OWNER of the tenant workspace
  const ws = await prisma.workspace.findUnique({ where: { tenantId }, select: { id: true } });
  if (!ws) return { success: false, error: "Workspace not found" };
  const member = await prisma.workspaceMember.findFirst({
    where: { workspaceId: ws.id, userId: session.user.id, status: "ACTIVE" },
    select: { role: true },
  });
  if (!member || member.role !== "OWNER") return { success: false, error: "Only the workspace owner can revoke agency access" };

  const link = await prisma.agencyTenant.findFirst({ where: { tenantId, status: "ACTIVE" }, select: { id: true, agencyId: true } });
  if (!link) return { success: false, error: "No active agency link" };

  await prisma.agencyTenant.update({
    where: { id: link.id },
    data: { status: "REVOKED", offboardedAt: new Date() },
  });
  await logAction(tenantId, "creator:agency-revoked", { agencyId: link.agencyId, by: session.user.id }).catch(() => {});
  revalidatePath("/admin/settings");
  return { success: true };
}
