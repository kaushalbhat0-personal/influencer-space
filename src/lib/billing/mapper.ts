import { getPlan as getCanonicalPlan, getAllPlans as getCanonicalAllPlans, DEFAULT_CURRENCY } from "@/lib/capabilities";
import type { BillingPlan, BillingSubscription, UsageQuota } from "./types";
import { computeUsage as engineCompute } from "./usage-engine";

export function getPlan(code: string): BillingPlan {
  const plan = getCanonicalPlan(code);
  if (!plan) return fallbackPlan(code);
  return {
    code: plan.code,
    family: plan.family,
    name: plan.name,
    description: plan.description ?? "",
    price: plan.price,
    currency: plan.currency,
    cycle: (plan.cycle ?? "monthly") as "monthly" | "annual",
    features: plan.features,
    recommended: plan.recommended ?? false,
    badge: plan.badge ?? "",
  };
}

export function getAllPlans(family?: string): BillingPlan[] {
  return getCanonicalAllPlans()
    .filter((p) => !family || p.family === family)
    .map((p) => ({
      code: p.code,
      family: p.family,
      name: p.name,
      description: p.description ?? "",
      price: p.price,
      currency: p.currency,
      cycle: (p.cycle ?? "monthly") as "monthly" | "annual",
      features: p.features,
      recommended: p.recommended ?? false,
      badge: p.badge ?? "",
    }));
}

export function getCreatorPlans(): BillingPlan[] {
  return getAllPlans("creator");
}

export function getAgencyPlans(): BillingPlan[] {
  return getAllPlans("agency");
}

function fallbackPlan(code: string): BillingPlan {
  return {
    code,
    family: "creator",
    name: code.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    description: "",
    price: 0,
    currency: DEFAULT_CURRENCY,
    cycle: "monthly",
    features: {},
    recommended: false,
    badge: "",
  };
}

interface PrismaSubscription {
  id: string;
  accountId: string;
  workspaceId?: string | null;
  planId: string;
  status: string;
  trialEndsAt: Date | null;
  renewsAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  plan?: { code: string };
}

export function mapSubscription(sub: PrismaSubscription | Record<string, unknown>): BillingSubscription {
  const s = sub as Record<string, unknown>;
  const plan = s.plan as Record<string, unknown> | undefined;
  return {
    id: s.id as string,
    accountId: s.accountId as string,
    workspaceId: (s.workspaceId as string) ?? "",
    planCode: (plan?.code as string) ?? "creator_free",
    status: s.status as BillingSubscription["status"],
    trialEndsAt: fmtDate(s.trialEndsAt),
    renewsAt: fmtDate(s.renewsAt),
    cancelledAt: fmtDate(s.cancelledAt),
    createdAt: (s.createdAt as string) ?? "",
  };
}

function fmtDate(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v;
  if (typeof (v as Record<string, unknown>).toISOString === "function") {
    return (v as Date).toISOString();
  }
  return String(v);
}

export { mapInvoice, formatCurrency, formatDate } from "./invoice-engine";

import { formatSubscriptionStatus } from "./subscription-engine";
export { formatSubscriptionStatus as formatStatus };

export function computeUsage(
  counts: { products: number; gallery: number; storageUsed?: number; orders: number },
  planCode: string,
): UsageQuota[] {
  const plan = getPlan(planCode);
  return engineCompute(counts, plan.features as Record<string, unknown>);
}

export { getUpgradePath as getPlanUpgradePath, getDowngradePath as getPlanDowngradePath } from "./subscription-engine";
