"use server";

/**
 * Partner Platform actions (IMPLEMENTATION-41). Creator import (reuses the
 * provisioning runtime + Creator Intelligence), passwordless creator
 * invitation, invitation claim, and agency branding. Every mutation is
 * agency-membership guarded + audited.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireAgencyMember, assertAgencyOwnsTenant, canMutate } from "@/modules/partner/application/authorization";
import { agencyTenantRelationship } from "@/modules/partner/application/partner-relationship";
import { creatorInvitationService } from "@/modules/partner/application/invitation";
import { agencyBranding } from "@/lib/client/branding";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function importCreatorViaAgency(input: {
  creatorName: string;
  email: string;
  sourceUrl?: string;
  sourcePlatform?: string;
  planCode: string;
}): Promise<{ success: boolean; tenantId?: string; workspaceId?: string | null; inviteToken?: string; error?: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  const actorId = ctx.session?.user.id;

  try {
    // 1. Provision via the canonical provisioning runtime (same pipeline as
    //    confirmProvision) — Creator Intelligence + generation + workspace.
    //    The "fast" (free) strategy uses the deterministic blueprint+composition
    //    pipeline (no AI-provider dependency); acquisition degrades gracefully.
    const { confirmProvision } = await import("./super-admin-provision.actions");
    const result = await confirmProvision({
      sourceUrl: input.sourceUrl ?? `https://example.com/${input.creatorName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      creatorName: input.creatorName,
      planCode: input.planCode,
      sourcePlatform: input.sourcePlatform ?? "youtube",
      strategyId: "fast",
    });

    if (!result.success || !result.result) {
      return { success: false, error: result.error ?? "Provisioning failed" };
    }
    const tenantId = result.result.tenantId;
    const workspaceId = result.result.workspaceId ?? null;

    // 2. The relationship was linked inside confirmProvision (AGENCY_ADMIN
    //    branch). Ensure the workspaceId is recorded on the AgencyTenant row.
    const link = await prisma.agencyTenant.findUnique({ where: { tenantId } });
    if (link && !link.workspaceId && workspaceId) {
      await prisma.agencyTenant.update({ where: { id: link.id }, data: { workspaceId } });
    }

    // 3. Passwordless invitation — the creator sets their own password.
    const invite = await creatorInvitationService.createInvitation({
      agencyId: ctx.agencyId,
      tenantId,
      workspaceId,
      email: input.email,
      creatorName: input.creatorName,
      createdBy: actorId ?? "agency",
    });
    if (!invite.success || !invite.invite) {
      return { success: false, error: invite.error ?? "Invitation failed" };
    }

    await logAction(tenantId, "partner:creator-imported", { agencyId: ctx.agencyId, email: input.email, planCode: input.planCode }).catch(() => {});
    revalidatePath("/agency");
    return { success: true, tenantId, workspaceId, inviteToken: invite.invite.token };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Creator import failed" };
  }
}

export async function createCreatorInvitation(input: {
  tenantId: string;
  email: string;
  creatorName: string;
}): Promise<{ success: boolean; inviteToken?: string; error?: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };

  const owned = await assertAgencyOwnsTenant(ctx.session!.user.id, ctx.agencyId, input.tenantId);
  if (!owned.ok) return { success: false, error: owned.error };

  const link = await prisma.agencyTenant.findUnique({ where: { tenantId: input.tenantId }, select: { workspaceId: true } });
  const invite = await creatorInvitationService.createInvitation({
    agencyId: ctx.agencyId,
    tenantId: input.tenantId,
    workspaceId: link?.workspaceId ?? null,
    email: input.email,
    creatorName: input.creatorName,
    createdBy: ctx.session!.user.id,
  });
  if (!invite.success) return { success: false, error: invite.error };
  await logAction(input.tenantId, "partner:invitation-created", { agencyId: ctx.agencyId, email: input.email }).catch(() => {});
  return { success: true, inviteToken: invite.invite?.token };
}

export async function claimCreatorInvitation(input: {
  token: string;
  email: string;
  password: string;
}): Promise<{ success: boolean; tenantId?: string; error?: string }> {
  if (input.password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters" };
  }
  const result = await creatorInvitationService.claimInvitation(input);
  if (!result.success) return { success: false, error: result.error };
  return { success: true, tenantId: result.tenantId };
}

export async function updateAgencyBranding(input: {
  agencyId: string;
  primaryColor: string;
  accentColor: string;
  logoUrl?: string;
  supportEmail?: string;
  supportPhone?: string;
  footerText?: string;
}): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (ctx.agencyId !== input.agencyId) return { success: false, error: "Agency mismatch" };
  if (!canMutate(ctx.session?.user.role)) return { success: false, error: "Read-only role cannot update branding" };

  try {
    await agencyBranding.updateBrand(input.agencyId, {
      primaryColor: input.primaryColor,
      accentColor: input.accentColor,
      logoUrl: input.logoUrl ?? null,
      supportEmail: input.supportEmail ?? null,
      supportPhone: input.supportPhone ?? null,
      footerText: input.footerText ?? null,
    });
    await logAction("system", "partner:branding-updated", { agencyId: input.agencyId }).catch(() => {});
    revalidatePath("/agency/branding");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update branding" };
  }
}
