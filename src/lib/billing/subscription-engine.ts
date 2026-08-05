import type { BillingSubscription } from "./types";
import type { SubscriptionStatus } from "./constants";
import { getPlan, getAllPlans } from "@/lib/capabilities";

function getPlanFamily(code: string): "creator" | "agency" | "unknown" {
  const plan = getPlan(code);
  if (plan) return plan.family;
  if (code.startsWith("creator")) return "creator";
  if (code.startsWith("agency") || code.startsWith("partner")) return "agency";
  return "unknown";
}

export function canUpgrade(currentCode: string, targetCode: string): boolean {
  if (currentCode === targetCode) return false;
  const currentFamily = getPlanFamily(currentCode);
  const targetFamily = getPlanFamily(targetCode);
  if (currentFamily !== targetFamily) return false;
  const currentPlan = getPlan(currentCode);
  const targetPlan = getPlan(targetCode);
  if (!currentPlan || !targetPlan) return false;
  return currentPlan.price < targetPlan.price;
}

export function canDowngrade(currentCode: string, targetCode: string): boolean {
  if (currentCode === targetCode) return false;
  const currentFamily = getPlanFamily(currentCode);
  const targetFamily = getPlanFamily(targetCode);
  if (currentFamily !== targetFamily) return false;
  const currentPlan = getPlan(currentCode);
  const targetPlan = getPlan(targetCode);
  if (!currentPlan || !targetPlan) return false;
  return currentPlan.price > targetPlan.price;
}

export function getUpgradePath(currentCode: string): string[] {
  const currentPlan = getPlan(currentCode);
  if (!currentPlan) return [];
  const family = currentPlan.family;
  return getAllPlans()
    .filter((p) => p.family === family && p.price > currentPlan.price)
    .sort((a, b) => a.price - b.price)
    .map((p) => p.code);
}

export function getDowngradePath(currentCode: string): string[] {
  const currentPlan = getPlan(currentCode);
  if (!currentPlan) return [];
  const family = currentPlan.family;
  return getAllPlans()
    .filter((p) => p.family === family && p.price < currentPlan.price)
    .sort((a, b) => b.price - a.price)
    .map((p) => p.code);
}

export function canSwitchFamily(currentCode: string, targetCode: string): boolean {
  const currentFamily = getPlanFamily(currentCode);
  const targetFamily = getPlanFamily(targetCode);
  return currentFamily !== targetFamily && currentFamily !== "unknown" && targetFamily !== "unknown";
}

export function validateTransition(currentCode: string, targetCode: string): { valid: boolean; reason?: string } {
  if (currentCode === targetCode) {
    return { valid: false, reason: "Cannot transition to the same plan" };
  }
  if (canUpgrade(currentCode, targetCode) || canDowngrade(currentCode, targetCode)) {
    return { valid: true };
  }
  if (canSwitchFamily(currentCode, targetCode)) {
    return { valid: false, reason: "Cannot switch between creator and agency plans directly" };
  }
  return { valid: false, reason: "Invalid plan transition" };
}

export function getTrialEndDate(startDate: Date, trialDays = 14): Date {
  const end = new Date(startDate);
  end.setDate(end.getDate() + trialDays);
  return end;
}

export function getGracePeriodEndDate(renewalDate: Date, graceDays = 7): Date {
  const end = new Date(renewalDate);
  end.setDate(end.getDate() + graceDays);
  return end;
}

export function isInTrial(subscription: BillingSubscription): boolean {
  if (subscription.status !== "TRIALING") return false;
  if (!subscription.trialEndsAt) return true;
  return new Date(subscription.trialEndsAt) > new Date();
}

export function isInGracePeriod(subscription: BillingSubscription, graceDays = 7): boolean {
  if (subscription.status !== "PAST_DUE") return false;
  if (!subscription.renewsAt) return true;
  const graceEnd = getGracePeriodEndDate(new Date(subscription.renewsAt), graceDays);
  return new Date() <= graceEnd;
}

export function getNextRenewalDate(subscription: BillingSubscription, cycle: "monthly" | "annual"): Date {
  const base = subscription.renewsAt ? new Date(subscription.renewsAt) : new Date();
  if (cycle === "monthly") {
    base.setMonth(base.getMonth() + 1);
  } else {
    base.setFullYear(base.getFullYear() + 1);
  }
  return base;
}

export function getSubscriptionStatusAfterCancellation(
  currentStatus: SubscriptionStatus,
): SubscriptionStatus {
  if (["TRIALING", "ACTIVE", "PAST_DUE"].includes(currentStatus)) return "CANCELLED";
  return currentStatus;
}

export function getSubscriptionStatusAfterExpiry(
  currentStatus: SubscriptionStatus,
): SubscriptionStatus {
  if (currentStatus === "CANCELLED") return "EXPIRED";
  return currentStatus;
}

export function daysUntilRenewal(renewsAt: string | null): number {
  if (!renewsAt) return 0;
  const diff = new Date(renewsAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

export function formatSubscriptionStatus(status: SubscriptionStatus): {
  label: string;
  variant: "success" | "warning" | "danger" | "info" | "default";
} {
  const map: Record<SubscriptionStatus, { label: string; variant: "success" | "warning" | "danger" | "info" | "default" }> = {
    DRAFT: { label: "Draft", variant: "default" },
    TRIALING: { label: "Trialing", variant: "info" },
    ACTIVE: { label: "Active", variant: "success" },
    PAST_DUE: { label: "Past Due", variant: "danger" },
    CANCELLED: { label: "Cancelled", variant: "warning" },
    EXPIRED: { label: "Expired", variant: "default" },
  };
  return map[status] ?? { label: status, variant: "default" };
}
