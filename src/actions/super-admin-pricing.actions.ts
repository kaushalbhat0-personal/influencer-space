"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DbNull } from "@/generated/prisma/internal/prismaNamespace";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { seedBillingCatalog } from "@/modules/billing/infrastructure/catalog-seed";
import { COMMERCE_CAPABILITY_TO_FEATURE } from "@/config/commerce/plans";
import type { PlanRuntimeConfig } from "@/modules/pricing/application/runtime";

export interface PlanEditorInput {
  code: string;
  name: string;
  family: "creator" | "partner";
  description: string;
  targetAudience: string | null;
  monthlyPrice: number | null;
  annualPrice: number | null;
  trialDays: number | null;
  gracePeriodDays: number;
  badge: string | null;
  ctaLabel: string;
  ctaType: "signup" | "checkout" | "contact";
  comparisonOrder: number;
  hidden: boolean;
  enterprise: boolean;
  popular: boolean;
  bestValue: boolean;
  recommended: boolean;
  colorAccent: string | null;
  highlights: string[];
  capabilities: string[];
  featureOverrides: Record<string, number | boolean | string>;
  scheduled: Array<{ price: number | null; annualPrice: number | null; effectiveAt: string }>;
  changeNote?: string;
}

async function requireSuperAdmin(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return null;
  return session.user.email ?? session.user.name ?? "superadmin";
}

/**
 * RCCF-IMPLEMENTATION-71 Phase 2–5, 8, 9 — save a plan's full runtime config.
 * Writes scalars (name/price/grace/effectiveAt) + runtimeConfig JSON
 * (capabilities, limits, marketing, pricing schedule), creates a version row
 * for rollback/audit, and revalidates the marketing surfaces.
 */
export async function savePlanConfig(input: PlanEditorInput): Promise<{ success: boolean; error?: string; planId?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };

  try {
    // Phase 3: capability toggles map to boolean feature grants so the
    // comparison/entitlement view reflects the assignment automatically.
    const mappedFeatures: Record<string, boolean> = {};
    for (const cap of input.capabilities) {
      const m = COMMERCE_CAPABILITY_TO_FEATURE[cap as keyof typeof COMMERCE_CAPABILITY_TO_FEATURE];
      if (m && typeof m.value === "boolean") mappedFeatures[m.feature] = m.value;
    }

    const runtimeConfig: PlanRuntimeConfig = {
      family: input.family,
      capabilities: input.capabilities,
      featureOverrides: { ...input.featureOverrides, ...mappedFeatures },
      marketing: {
        description: input.description,
        targetAudience: input.targetAudience ?? undefined,
        highlights: input.highlights,
        badge: input.badge ?? undefined,
        ctaLabel: input.ctaLabel,
        ctaType: input.ctaType,
        comparisonOrder: input.comparisonOrder,
        trialDays: input.trialDays ?? undefined,
        hidden: input.hidden,
        enterprise: input.enterprise,
        popular: input.popular,
        bestValue: input.bestValue,
        recommended: input.recommended,
        colorAccent: input.colorAccent ?? undefined,
      },
      pricing: {
        price: input.monthlyPrice,
        annualPrice: input.annualPrice,
        schedule: input.scheduled.length > 0 ? input.scheduled : undefined,
      },
      updatedBy: actor,
      updatedAt: new Date().toISOString(),
      changeNote: input.changeNote,
    };

    const plan = await prisma.billingPlan.upsert({
      where: { code: input.code },
      update: {
        name: input.name,
        family: input.family,
        price: input.monthlyPrice ?? 0,
        gracePeriodDays: input.gracePeriodDays,
        runtimeConfig: runtimeConfig as object,
        version: { increment: 1 },
      },
      create: {
        code: input.code,
        family: input.family,
        name: input.name,
        price: input.monthlyPrice ?? 0,
        currency: "INR",
        cycle: "monthly",
        gracePeriodDays: input.gracePeriodDays,
        runtimeConfig: runtimeConfig as object,
      },
    });

    await prisma.planPricingVersion.create({
      data: {
        planCode: input.code,
        planId: plan.id,
        payload: runtimeConfig as object,
        author: actor,
        changeNote: input.changeNote,
      },
    });

    await logAction("system", "pricing:plan-updated", { code: input.code, note: input.changeNote, by: actor });

    revalidatePath("/super-admin/pricing");
    revalidatePath("/pricing");
    revalidatePath("/");

    return { success: true, planId: plan.id };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Save failed" };
  }
}

/** Phase 8 — roll a plan back to a previous version. */
export async function rollbackPlanVersion(planCode: string, versionId: string): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };

  try {
    const version = await prisma.planPricingVersion.findUnique({ where: { id: versionId } });
    if (!version || version.planCode !== planCode) return { success: false, error: "Version not found" };
    const rc = version.payload as PlanRuntimeConfig;

    await prisma.billingPlan.updateMany({
      where: { code: planCode },
      data: { runtimeConfig: rc as object, version: { increment: 1 } },
    });

    await prisma.planPricingVersion.create({
      data: {
        planCode,
        payload: rc as object,
        author: actor,
        changeNote: `Rollback to version ${versionId.slice(0, 8)}`,
      },
    });

    await logAction("system", "pricing:plan-rolled-back", { code: planCode, version: versionId, by: actor });

    revalidatePath("/super-admin/pricing");
    revalidatePath("/pricing");
    revalidatePath("/");

    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Rollback failed" };
  }
}

/** Phase 8 — plan version history. */
export async function listPlanVersions(planCode: string): Promise<{ success: boolean; versions?: unknown[]; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };

  const versions = await prisma.planPricingVersion.findMany({
    where: { planCode },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, planCode: true, author: true, changeNote: true, createdAt: true },
  });
  return { success: true, versions };
}

/** Phase 10 — coupon foundation (stored canonically; checkout wiring is future). */
export async function upsertCoupon(input: {
  id?: string;
  code: string;
  label: string;
  description?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  scope: string;
  active: boolean;
  maxUses?: number | null;
  planCodes: string[];
}): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };

  const data = {
    code: input.code,
    label: input.label,
    description: input.description ?? null,
    discountPercent: input.discountPercent ?? null,
    discountAmount: input.discountAmount ?? null,
    scope: input.scope,
    active: input.active,
    maxUses: input.maxUses ?? null,
    planCodes: input.planCodes,
  };

  try {
    if (input.id) {
      await prisma.coupon.update({ where: { id: input.id }, data });
    } else {
      await prisma.coupon.create({ data });
    }
    await logAction("system", "pricing:coupon-upsert", { code: input.code, by: actor });
    revalidatePath("/super-admin/pricing");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Coupon save failed" };
  }
}

/** Phase 11 — launch program (stored canonically). */
export async function upsertLaunchProgram(input: {
  id?: string;
  code: string;
  name: string;
  description?: string;
  discountPercent?: number | null;
  discountAmount?: number | null;
  scope: string;
  inviteOnly: boolean;
  active: boolean;
  maxEnrollees?: number | null;
  planCodes: string[];
}): Promise<{ success: boolean; error?: string }> {
  const actor = await requireSuperAdmin();
  if (!actor) return { success: false, error: "Unauthorized" };

  const data = {
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    discountPercent: input.discountPercent ?? null,
    discountAmount: input.discountAmount ?? null,
    scope: input.scope,
    inviteOnly: input.inviteOnly,
    active: input.active,
    maxEnrollees: input.maxEnrollees ?? null,
    planCodes: input.planCodes,
  };

  try {
    if (input.id) {
      await prisma.launchProgram.update({ where: { id: input.id }, data });
    } else {
      await prisma.launchProgram.create({ data });
    }
    await logAction("system", "pricing:launch-program-upsert", { code: input.code, by: actor });
    revalidatePath("/super-admin/pricing");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Launch program save failed" };
  }
}

/** Reset every plan to registry defaults (clears runtime overrides). */
export async function resyncBillingCatalog(): Promise<{ success: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    await seedBillingCatalog();
    // Reset to defaults: clear runtime overrides so the registry is authoritative.
    await prisma.billingPlan.updateMany({ data: { runtimeConfig: DbNull } });
    await logAction("system", "pricing:resync-catalog", {});
    revalidatePath("/super-admin/pricing");
    revalidatePath("/pricing");
    revalidatePath("/");
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Sync failed" };
  }
}

/** Phase 14 — pricing analytics: distribution, MRR/ARR, trial funnel, churn. */
export async function getPricingAnalytics(): Promise<{
  distribution: Array<{ code: string; name: string; count: number }>;
  mrr: number;
  arr: number;
  trialActive: number;
  trialConverted: number;
  churnCount: number;
}> {
  const actor = await requireSuperAdmin();
  if (!actor) return { distribution: [], mrr: 0, arr: 0, trialActive: 0, trialConverted: 0, churnCount: 0 };

  const subs = await prisma.billingSubscription.findMany({
    select: { status: true, planId: true, trialEndsAt: true },
  });
  const plans = await prisma.billingPlan.findMany({ select: { id: true, code: true, name: true, price: true } });
  const planById = new Map(plans.map((p) => [p.id, p]));

  const byCode = new Map<string, { name: string; count: number }>();
  let mrr = 0;
  let trialActive = 0;
  let trialConverted = 0;
  let churnCount = 0;
  const now = new Date();

  for (const s of subs) {
    const plan = planById.get(s.planId);
    const code = plan?.code ?? "unknown";
    const entry = byCode.get(code) ?? { name: plan?.name ?? code, count: 0 };
    entry.count++;
    byCode.set(code, entry);

    if (s.status === "ACTIVE" || s.status === "TRIALING") mrr += plan?.price ?? 0;
    if (s.status === "CANCELLED") churnCount++;
    if (s.status === "TRIALING") trialActive++;
    if (s.trialEndsAt && s.trialEndsAt < now && (s.status === "ACTIVE")) trialConverted++;
  }

  const distribution = Array.from(byCode.entries()).map(([code, v]) => ({ code, name: v.name, count: v.count }));
  return { distribution, mrr, arr: mrr * 12, trialActive, trialConverted, churnCount };
}

/** Everything the Pricing Center page needs. */
export async function getPricingCenterData(): Promise<{
  plans: Array<{
    code: string;
    name: string;
    family: string;
    price: number | null;
    runtimeConfig: PlanRuntimeConfig | null;
    gracePeriodDays: number;
    hasRow: boolean;
  }>;
  versions: Array<{ id: string; planCode: string; author: string | null; changeNote: string | null; createdAt: string }>;
  coupons: Array<{ id: string; code: string; label: string; scope: string; discountPercent: number | null; discountAmount: number | null; active: boolean; planCodes: string[]; maxUses: number | null; usedCount: number }>;
  programs: Array<{ id: string; code: string; name: string; scope: string; discountPercent: number | null; discountAmount: number | null; inviteOnly: boolean; active: boolean; planCodes: string[]; maxEnrollees: number | null; enrolledCount: number }>;
}> {
  const actor = await requireSuperAdmin();
  if (!actor) return { plans: [], versions: [], coupons: [], programs: [] };

  const rows = await prisma.billingPlan.findMany({
    select: { code: true, name: true, family: true, price: true, status: true, gracePeriodDays: true, runtimeConfig: true },
  });
  const rowByCode = new Map(rows.map((r) => [r.code, r]));

  const { COMMERCE_PLANS, LEGACY_TO_CANONICAL } = await import("@/config/commerce/plans");
  const plans = COMMERCE_PLANS.map((cfg) => {
    const row = rowByCode.get(cfg.code);
    return {
      code: cfg.code,
      name: row?.name ?? cfg.name,
      family: cfg.family,
      price: row?.price ?? cfg.price,
      runtimeConfig: (row?.runtimeConfig as PlanRuntimeConfig | null) ?? null,
      gracePeriodDays: row?.gracePeriodDays ?? 0,
      hasRow: !!row,
    };
  });
  // Only unregistered rows that a Super Admin deliberately configured through
  // the editor (runtimeConfig set, ACTIVE) appear here — legacy seed rows never
  // surface in the Pricing Center dropdown.
  for (const row of rows) {
    if (plans.some((p) => p.code === row.code)) continue;
    if (row.status !== "ACTIVE") continue;
    if (Object.prototype.hasOwnProperty.call(LEGACY_TO_CANONICAL, row.code)) continue;
    if (!row.runtimeConfig) continue;
    plans.push({
      code: row.code,
      name: row.name,
      family: row.family === "agency" ? "partner" : "creator",
      price: row.price,
      runtimeConfig: (row.runtimeConfig as PlanRuntimeConfig | null) ?? null,
      gracePeriodDays: row.gracePeriodDays ?? 0,
      hasRow: true,
    });
  }

  const [versions, coupons, programs] = await Promise.all([
    prisma.planPricingVersion.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, planCode: true, author: true, changeNote: true, createdAt: true } }),
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, label: true, scope: true, discountPercent: true, discountAmount: true, active: true, planCodes: true, maxUses: true, usedCount: true } }),
    prisma.launchProgram.findMany({ orderBy: { createdAt: "desc" }, select: { id: true, code: true, name: true, scope: true, discountPercent: true, discountAmount: true, inviteOnly: true, active: true, planCodes: true, maxEnrollees: true, enrolledCount: true } }),
  ]);

  return {
    plans,
    versions: versions.map((v) => ({ ...v, createdAt: v.createdAt.toISOString() })),
    coupons,
    programs,
  };
}
