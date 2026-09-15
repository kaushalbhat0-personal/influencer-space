"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { SMOKE_TEST_CONFIG_ID, SMOKE_TEST_WARNING } from "@/modules/billing/domain/live-smoke-test";

/**
 * RCCF-LIVE-SMOKE-01 — SUPER_ADMIN-only toggle for LIVE ₹1 smoke test pricing.
 * Default OFF. When ON, eligible plan checkouts for SUPER_ADMIN sessions are ₹1.
 * Canonical pricing never mutated; override affects checkout amount only (via domain helper).
 * No query-param or client-controlled value may set the amount.
 */

async function requireSuperAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return { ok: false as const, error: "Unauthorized — SUPER_ADMIN only" };
  }
  return { ok: true as const, session };
}

export async function getLiveSmokeTestStatus(): Promise<{
  enabled: boolean;
  enabledBy: string | null;
  enabledAt: Date | null;
  warning: string;
}> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { enabled: false, enabledBy: null, enabledAt: null, warning: SMOKE_TEST_WARNING };
  try {
    const row = await prisma.liveSmokeTestConfig.findUnique({ where: { id: SMOKE_TEST_CONFIG_ID } });
    return {
      enabled: row?.enabled ?? false,
      enabledBy: (row as unknown as { enabledBy?: string | null })?.enabledBy ?? null,
      enabledAt: (row as unknown as { enabledAt?: Date | null })?.enabledAt ?? null,
      warning: SMOKE_TEST_WARNING,
    };
  } catch {
    return { enabled: false, enabledBy: null, enabledAt: null, warning: SMOKE_TEST_WARNING };
  }
}

export async function setLiveSmokeTestEnabled(enabled: boolean): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };

  try {
    const updated = await prisma.liveSmokeTestConfig.upsert({
      where: { id: SMOKE_TEST_CONFIG_ID },
      update: {
        enabled,
        enabledBy: auth.session.user.id,
        enabledAt: enabled ? new Date() : null,
      },
      create: {
        id: SMOKE_TEST_CONFIG_ID,
        enabled,
        enabledBy: auth.session.user.id,
        enabledAt: enabled ? new Date() : null,
      },
    });

    await logAction("system", enabled ? "live-smoke-test:enabled" : "live-smoke-test:disabled", {
      enabled: (updated as unknown as { enabled: boolean }).enabled,
      by: auth.session.user.email,
      warning: SMOKE_TEST_WARNING,
    }).catch(() => {});

    revalidatePath("/super-admin");
    revalidatePath("/super-admin/pricing");
    return { success: true, enabled: (updated as unknown as { enabled: boolean }).enabled };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update smoke test config" };
  }
}

/**
 * RCCF-LIVE-SMOKE-01 — SUPER_ADMIN-only smoke test checkout for any eligible plan.
 * Bypasses normal workspace/tenant membership checks (which would block SUPER_ADMIN
 * from testing agency plans via agency flows). Calls the canonical BillingService
 * which itself applies the ₹1 override only when enabled + SUPER_ADMIN session.
 * Normal customers never route through this action.
 */
export async function createSmokeTestCheckout(input: {
  workspaceId: string;
  planCode: string;
  cycle?: "monthly" | "yearly";
}): Promise<{ success: boolean; checkout?: { orderId?: string; subscriptionId?: string; amountPaise?: number }; error?: string }> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const { SMOKE_TEST_ELIGIBLE_PLANS } = await import("@/modules/billing/domain/live-smoke-test");
  if (!SMOKE_TEST_ELIGIBLE_PLANS.has(input.planCode)) {
    return { success: false, error: `Plan ${input.planCode} not eligible for smoke test` };
  }
  const enabled = await prisma.liveSmokeTestConfig
    .findUnique({ where: { id: SMOKE_TEST_CONFIG_ID }, select: { enabled: true } })
    .then((r) => r?.enabled ?? false)
    .catch(() => false);
  if (!enabled) return { success: false, error: "Smoke test not enabled — enable ₹1 mode first" };

  const { billingService } = await import("@/modules/billing/application/service");
  const result = await billingService.changePlan(input.workspaceId, input.planCode, undefined, input.cycle ?? "monthly");
  if (!result.success) return { success: false, error: result.error };
  // Amount is server-derived (₹1) — never from input
  const amountPaise = 100;
  return { success: true, checkout: { orderId: result.orderId, subscriptionId: result.subscriptionId, amountPaise } };
}

/**
 * RCCF-LIVE-SMOKE-01 — SUPER_ADMIN-only additional capacity smoke test order.
 * Creates a capacity addon order at ₹1 per unit (server-derived, never client input).
 */
export async function createSmokeTestCapacityCheckout(input: {
  agencyId: string;
  quantity: number;
}): Promise<{ success: boolean; orderId?: string; amountPaise?: number; error?: string }> {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false, error: auth.error };
  const qty = Number(input.quantity);
  if (!Number.isInteger(qty) || qty <= 0 || qty > 100) return { success: false, error: "Quantity must be 1-100" };
  const enabled = await prisma.liveSmokeTestConfig
    .findUnique({ where: { id: SMOKE_TEST_CONFIG_ID }, select: { enabled: true } })
    .then((r) => r?.enabled ?? false)
    .catch(() => false);
  if (!enabled) return { success: false, error: "Smoke test not enabled" };
  const { razorpayProvider } = await import("@/modules/billing/infrastructure/providers/razorpay");
  const { SMOKE_TEST_PRICE_INR } = await import("@/modules/billing/domain/live-smoke-test");
  const order = await razorpayProvider.createCapacityAddonOrder({
    agencyId: input.agencyId,
    quantity: qty,
    unitPriceInr: SMOKE_TEST_PRICE_INR,
    smokeTest: true,
  });
  if (!order.success || !order.orderId) return { success: false, error: order.error ?? "Failed to create smoke test capacity order" };
  return { success: true, orderId: order.orderId, amountPaise: order.amountPaise };
}
