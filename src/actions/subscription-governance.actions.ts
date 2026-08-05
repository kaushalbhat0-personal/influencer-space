"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/modules/billing/application/service";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";

/** Assign a lifetime complimentary plan (no billing, no expiry). */
export async function assignComplimentaryPlan(tenantId: string, planCode: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const ws = await prisma.workspace.findUnique({ where: { tenantId } });
  if (!ws) throw new Error("No workspace found for tenant");

  // Upsert subscription with ACTIVE status, no payment, no trial
  const plan = await prisma.billingPlan.findUnique({ where: { code: planCode } });
  if (!plan) throw new Error("Unknown plan");

  const existing = await prisma.billingSubscription.findUnique({ where: { workspaceId: ws.id } });

  if (existing) {
    await prisma.billingSubscription.update({
      where: { workspaceId: ws.id },
      data: { planId: plan.id, status: "ACTIVE", trialEndsAt: null, renewsAt: null },
    });
  } else {
    const account = await prisma.billingAccount.upsert({
      where: { accountType_accountId: { accountType: "creator", accountId: ws.id } },
      update: {},
      create: { accountType: "creator", accountId: ws.id },
    });
    await prisma.billingSubscription.create({
      data: { workspaceId: ws.id, planId: plan.id, accountId: account.id, status: "ACTIVE" },
    });
  }

  await logAction(tenantId, "subscription:complimentary-assigned", { planCode, reason, operatorId: session.user.id });
  revalidatePath("/super-admin/subscriptions");
  revalidatePath("/super-admin/tenants");
  return { success: true, planCode };
}

/** Extend trial for a tenant by N days. */
export async function extendTrial(tenantId: string, days: number, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const ws = await prisma.workspace.findUnique({ where: { tenantId } });
  if (!ws) throw new Error("No workspace found");

  const sub = await prisma.billingSubscription.findUnique({ where: { workspaceId: ws.id } });
  if (!sub) throw new Error("No subscription found");

  const currentEnd = sub.trialEndsAt ?? new Date();
  const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.billingSubscription.update({
    where: { workspaceId: ws.id },
    data: { trialEndsAt: newEnd, status: "TRIALING" },
  });

  await logAction(tenantId, "subscription:trial-extended", { days, newEnd: newEnd.toISOString(), reason, operatorId: session.user.id });
  revalidatePath("/super-admin/subscriptions");
  return { success: true, trialEndsAt: newEnd.toISOString() };
}

/** Pause a subscription. */
export async function pauseSubscription(tenantId: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const ws = await prisma.workspace.findUnique({ where: { tenantId } });
  if (!ws) throw new Error("No workspace found");

  const sub = await prisma.billingSubscription.findUnique({ where: { workspaceId: ws.id } });
  if (!sub) throw new Error("No subscription found");
  if (!["ACTIVE", "TRIALING"].includes(sub.status)) throw new Error("Subscription must be ACTIVE or TRIALING to pause");

  await prisma.billingSubscription.update({
    where: { workspaceId: ws.id },
    data: { status: "PAST_DUE" },
  });

  await logAction(tenantId, "subscription:paused", { reason, operatorId: session.user.id });
  revalidatePath("/super-admin/subscriptions");
  return { success: true };
}

/** Resume a paused subscription. */
export async function resumeSubscription(tenantId: string, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const ws = await prisma.workspace.findUnique({ where: { tenantId } });
  if (!ws) throw new Error("No workspace found");

  const sub = await prisma.billingSubscription.findUnique({ where: { workspaceId: ws.id } });
  if (!sub) throw new Error("No subscription found");
  if (sub.status !== "PAST_DUE") throw new Error("Subscription must be PAST_DUE to resume");

  await prisma.billingSubscription.update({
    where: { workspaceId: ws.id },
    data: { status: "ACTIVE" },
  });

  await logAction(tenantId, "subscription:resumed", { reason, operatorId: session.user.id });
  revalidatePath("/super-admin/subscriptions");
  return { success: true };
}

/** Extend grace period by N days. */
export async function extendGracePeriod(tenantId: string, days: number, reason?: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") throw new Error("Unauthorized");

  const ws = await prisma.workspace.findUnique({ where: { tenantId } });
  if (!ws) throw new Error("No workspace found");

  const sub = await prisma.billingSubscription.findUnique({ where: { workspaceId: ws.id } });
  if (!sub) throw new Error("No subscription found");

  const newRenewsAt = new Date((sub.renewsAt ? new Date(sub.renewsAt) : new Date()).getTime() + days * 24 * 60 * 60 * 1000);

  await prisma.billingSubscription.update({
    where: { workspaceId: ws.id },
    data: { renewsAt: newRenewsAt },
  });

  await logAction(tenantId, "subscription:grace-extended", { days, newRenewsAt: newRenewsAt.toISOString(), reason, operatorId: session.user.id });
  revalidatePath("/super-admin/subscriptions");
  return { success: true, renewsAt: newRenewsAt.toISOString() };
}
