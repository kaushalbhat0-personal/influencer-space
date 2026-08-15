"use server";

/**
 * Partner Platform actions (IMPLEMENTATION-41). Creator import (reuses the
 * provisioning runtime + Creator Intelligence), passwordless creator
 * invitation, invitation claim, and agency branding. Every mutation is
 * agency-membership guarded + audited.
 */
import { prisma } from "@/lib/prisma";
import { requireAgencyMember, requireAgencyActive, assertAgencyOwnsTenant, canMutate } from "@/modules/partner/application/authorization";
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
  const ctx = await requireAgencyActive();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  // RCCF-51: client provisioning is an ADMIN mutation (confirmProvision already
  // rejects AGENCY_STAFF downstream via requireProvisioningActor). Reject staff
  // at THIS boundary with a clear error and zero side effects instead of a
  // generic "Unauthorized" after a full provisioning run.
  if (!canMutate(ctx.session?.user.role)) {
    return { success: false, error: "Only agency admins can import clients" };
  }
  const actorId = ctx.session?.user.id;

  // IMPLEMENTATION-42 Phase 5: agency-provisioned creators require Creator Grow
  // minimum — Creator Launch is not available for partner-onboarded creators.
  const { isAgencyRestrictedPlan } = await import("@/config/commerce/plans");
  if (isAgencyRestrictedPlan(input.planCode)) {
    return { success: false, error: "Agency-managed creators require at least Creator Grow — Creator Launch is not available." };
  }

  // RCCF-40: fail-fast capacity pre-check (server-side read; the authoritative
  // atomic gate is linkCreator inside confirmProvision). Prevents provisioning
  // + publishing a tenant that would immediately fail the capacity check.
  const { getAgencyClientCapacity } = await import("@/modules/partner/application/partner-relationship");
  const capacity = await getAgencyClientCapacity(ctx.agencyId);
  if (capacity.limit !== -1 && capacity.used >= capacity.limit) {
    return {
      success: false,
      error: `Client capacity reached (${capacity.used}/${capacity.limit}). Upgrade your partner plan to add more clients.`,
    };
  }

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
  const ctx = await requireAgencyActive();
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
  const ctx = await requireAgencyActive();
  if (!ctx.ok) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (ctx.agencyId !== input.agencyId) return { success: false, error: "Agency mismatch" };
  if (!canMutate(ctx.session?.user.role)) return { success: false, error: "Read-only role cannot update branding" };

  // RCCF-51: white-label branding is a declared Scale/Enterprise capability
  // (white_label is granted only on partner_scale/partner_enterprise). Enforce
  // the effective plan's entitlement server-side — free/Solo agencies cannot
  // brand client-facing surfaces.
  try {
    const workspace = await prisma.workspace.findUnique({ where: { agencyId: ctx.agencyId }, select: { id: true } });
    const { resolveActivePlan } = await import("@/modules/billing/application/plan-source");
    const { capabilityService } = await import("@/lib/capabilities");
    const resolved = await resolveActivePlan(workspace?.id, undefined);
    const planCode = resolved.code ?? "partner_free";
    if (!capabilityService.can(planCode, "white_label").allowed) {
      return { success: false, error: "White-label branding requires Partner Scale or Enterprise." };
    }
  } catch {
    return { success: false, error: "Could not verify plan entitlement" };
  }

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

/**
 * RCCF-42 — offboard a Partner-managed client. Server-derived authorization:
 * the agency comes from the authenticated session; the relationship must belong
 * to that agency. The relationship transitions to REVOKED (reclaiming capacity);
 * the Creator tenant, website, snapshots, billing and commissions are untouched.
 */
export async function offboardAgencyClient(relationshipId: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAgencyActive();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session?.user.role)) return { success: false, error: "Only agency admins can offboard clients" };

  const result = await agencyTenantRelationship.offboard(relationshipId, ctx.agencyId);
  if (!result.success) return result;
  revalidatePath("/agency");
  revalidatePath("/agency/clients");
  return { success: true };
}

/**
 * RCCF-42 — Partner self-service plan change. The Partner's workspace is derived
 * server-side from the authenticated session; the target plan is resolved against
 * the canonical BillingPlan (never client-supplied price/limits). Reuses the
 * canonical createCheckout → Razorpay → webhook → BillingSubscription path.
 */
export async function changeAgencyPlanAction(planCode: string): Promise<{ success: boolean; checkout?: { orderId?: string; subscriptionId?: string; keyId?: string }; error?: string }> {
  const ctx = await requireAgencyMember();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session?.user.role)) return { success: false, error: "Only agency admins can change the plan" };

  const { getCommercePlan } = await import("@/config/commerce/plans");
  const target = getCommercePlan(planCode);
  if (!target || target.family !== "partner") return { success: false, error: "Invalid partner plan" };

  const workspace = await prisma.workspace.findUnique({ where: { agencyId: ctx.agencyId }, select: { id: true } });
  if (!workspace) return { success: false, error: "Partner workspace not found" };

  const { billingService } = await import("@/modules/billing/application/service");
  const checkout = await billingService.changePlan(workspace.id, planCode);
  if (!checkout.success) return { success: false, error: checkout.error ?? "Checkout failed" };

  return {
    success: true,
    checkout: {
      orderId: checkout.orderId,
      subscriptionId: checkout.subscriptionId,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
    },
  };
}

/**
 * RCCF-61 — purchase additional managed client/website capacity.
 * Server-derived agency; quantity × canonical unit price (₹1,499). Idempotent
 * via (agencyId, idempotencyKey): a retried request returns the existing add-on
 * instead of creating a duplicate paid entitlement. Admin-only.
 */
export async function addAgencyCapacityAction(input: {
  quantity: number;
  idempotencyKey: string;
}): Promise<{ success: boolean; addonId?: string; quantity?: number; unitPriceInr?: number; error?: string }> {
  const ctx = await requireAgencyActive();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session?.user.role)) return { success: false, error: "Only agency admins can add capacity" };

  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty <= 0 || qty > 1000) return { success: false, error: "Quantity must be a positive integer" };
  if (!input.idempotencyKey || input.idempotencyKey.length > 128) return { success: false, error: "A valid idempotency key is required" };

  const { PARTNER_ADDON_UNIT_PRICE_INR } = await import("@/config/commerce/agency-addons");
  try {
    // Idempotent: the unique (agencyId, idempotencyKey) constraint makes a
    // retried request return the already-created entitlement.
    const addon = await prisma.agencyCapacityAddon.upsert({
      where: { agencyId_idempotencyKey: { agencyId: ctx.agencyId, idempotencyKey: input.idempotencyKey } },
      update: {},
      create: {
        agencyId: ctx.agencyId,
        quantity: qty,
        unitPriceInr: PARTNER_ADDON_UNIT_PRICE_INR,
        status: "ACTIVE",
        idempotencyKey: input.idempotencyKey,
      },
      select: { id: true, quantity: true, unitPriceInr: true },
    });
    await logAction("system", "partner:capacity-addon-created", { agencyId: ctx.agencyId, quantity: qty, unitPriceInr: PARTNER_ADDON_UNIT_PRICE_INR }).catch(() => {});
    revalidatePath("/agency/billing");
    return { success: true, addonId: addon.id, quantity: addon.quantity, unitPriceInr: addon.unitPriceInr };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to add capacity" };
  }
}

/** RCCF-61 — cancel an agency capacity add-on (non-destructive; capacity is released immediately). */
export async function cancelAgencyCapacityAction(addonId: string): Promise<{ success: boolean; error?: string }> {
  const ctx = await requireAgencyActive();
  if (!ctx.ok || !ctx.agencyId) return { success: false, error: ctx.error ?? "Unauthorized" };
  if (!canMutate(ctx.session?.user.role)) return { success: false, error: "Only agency admins can cancel capacity" };

  try {
    // Agency-scoped: only the owning agency can cancel its own add-on.
    const owned = await prisma.agencyCapacityAddon.findFirst({
      where: { id: addonId, agencyId: ctx.agencyId, status: "ACTIVE" },
      select: { id: true, quantity: true },
    });
    if (!owned) return { success: false, error: "Add-on not found" };
    await prisma.agencyCapacityAddon.update({
      where: { id: owned.id },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    await logAction("system", "partner:capacity-addon-cancelled", { agencyId: ctx.agencyId, addonId, quantity: owned.quantity }).catch(() => {});
    revalidatePath("/agency/billing");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to cancel capacity" };
  }
}
