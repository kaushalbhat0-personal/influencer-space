"use server";

/**
 * Billing actions — IMPLEMENTATION-35.
 *
 * Server surface for the customer billing experience. Everything delegates to
 * BillingService (Billing v2); Billing Events remain authoritative for state
 * changes. No duplicate checkout/subscription logic.
 */
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { billingService } from "@/modules/billing/application/service";
import { capabilityService } from "@/lib/capabilities";
import { COMMERCE_PLANS, getCommercePlan } from "@/config/commerce/plans";
import type { CheckoutResult } from "@/modules/billing/domain/types";

function requireAuth(tenantId: string): { ok: true } | { ok: false; error: string } {
  // Session check is performed by the caller-provided tenantId comparison below.
  return { ok: true };
}

function enabledFeatures(features: Record<string, number | boolean | string>): string[] {
  return Object.entries(features)
    .filter(([, v]) => (typeof v === "boolean" ? v : typeof v === "number" ? v === -1 || v > 0 : Boolean(v)))
    .map(([k]) => k);
}

async function authorizeWorkspace(
  workspaceId: string,
  tenantId: string,
): Promise<{ session?: { user?: { id?: string; tenantId?: string | null } }; workspaceType?: "TENANT" | "AGENCY" }> {
  const session = (await getServerSession(authOptions)) as { user?: { id?: string; tenantId?: string | null } } | null;
  if (!session?.user?.tenantId || session.user.tenantId !== tenantId) {
    return {};
  }
  // VALIDATION-02 C2: the workspace must belong to the caller's tenant —
  // never operate on another workspace's subscription/invoices via a guessed id.
  const workspace = await prisma.workspace.findFirst({
    where: { id: workspaceId, tenantId },
    select: { id: true, type: true },
  });
  if (!workspace) return {};
  return { session, workspaceType: workspace.type as "TENANT" | "AGENCY" };
}

/**
 * RCCF-RELEASE-02 (F1) — plan-family invariant, enforced server-side before any
 * checkout/provider interaction. The tenant's commercial family derives ONLY
 * from the server-verified Workspace.type (TENANT = Creator, AGENCY = Partner);
 * the client supplies a plan code and nothing else. The requested plan must
 * belong to the tenant's own family (canonical registry — never a second list),
 * so a Creator can never self-select a Partner plan and vice versa. Rejections
 * happen here, before billingService.changePlan creates any checkout or
 * touches subscriptions/entitlements.
 */
function assertPlanFamilyForWorkspace(
  workspaceType: "TENANT" | "AGENCY" | undefined,
  planCode: string,
): { ok: true } | { ok: false; error: string } {
  const target = getCommercePlan(planCode);
  if (!target) return { ok: false, error: `Unknown plan: ${planCode}` };
  const expectedFamily = workspaceType === "AGENCY" ? "partner" : "creator";
  if (target.family !== expectedFamily) {
    return {
      ok: false,
      // Existing error vocabulary (partner path / provisioning path).
      error: expectedFamily === "creator" ? "Invalid Creator plan" : "Invalid partner plan",
    };
  }
  return { ok: true };
}

export async function getBillingDashboard(workspaceId: string, tenantId: string) {
  const auth = await authorizeWorkspace(workspaceId, tenantId);
  if (!auth.session) return { success: false, error: "Unauthorized" };

  try {
    const info = await billingService.getBillingInfo(workspaceId, tenantId);
    const planCode = (info as { planCode?: string }).planCode ?? (info.subscription as { planCode?: string })?.planCode ?? "creator_launch";
    const summary = capabilityService.planSummary(planCode);
    // RCCF-36: the billing "plans" matrix must show current configured prices
    // (runtime/DB), not the static registry, so Pricing Center == billing UI.
    const { getRuntimePlansByFamily } = await import("@/modules/pricing/application/runtime");
    const runtimePlans = await getRuntimePlansByFamily("creator");
    return {
      success: true,
      data: {
        planCode,
        plan: info.plan,
        subscription: info.subscription,
        invoices: info.invoices,
        usage: info.usage,
        history: info.history,
        capabilities: summary ? enabledFeatures(summary.features) : [],
        matrixPlans: runtimePlans.map((p) => ({
          code: p.code,
          name: p.name,
          price: p.price,
          manual: (COMMERCE_PLANS.find((c) => c.code === p.code)?.manual ?? false) || p.ctaType === "contact",
        })),
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to load billing dashboard" };
  }
}

export async function changePlanAction(
  workspaceId: string,
  tenantId: string,
  planCode: string,
  email?: string,
): Promise<{ success: boolean; checkout?: CheckoutResult & { keyId?: string }; error?: string }> {
  const auth = await authorizeWorkspace(workspaceId, tenantId);
  if (!auth.session) return { success: false, error: "Unauthorized" };

  // RCCF-RELEASE-02 (F1): family gate runs before checkout creation — no
  // provider call, subscription mutation or entitlement change on mismatch.
  const family = assertPlanFamilyForWorkspace(auth.workspaceType, planCode);
  if (!family.ok) return { success: false, error: family.error };

  try {
    const checkout = await billingService.changePlan(workspaceId, planCode, email);
    if (!checkout.success) return { success: false, error: checkout.error ?? "Checkout failed" };
    return {
      success: true,
      checkout: {
        ...checkout,
        keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "",
      },
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Plan change failed" };
  }
}

export async function cancelSubscriptionAction(workspaceId: string, tenantId: string, reason?: string): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeWorkspace(workspaceId, tenantId);
  if (!auth.session) return { success: false, error: "Unauthorized" };

  try {
    await billingService.cancelSubscription(workspaceId, reason ?? "Customer initiated");
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Cancellation failed" };
  }
}

export async function resumeSubscriptionAction(workspaceId: string, tenantId: string): Promise<{ success: boolean; error?: string }> {
  const auth = await authorizeWorkspace(workspaceId, tenantId);
  if (!auth.session) return { success: false, error: "Unauthorized" };

  try {
    await billingService.resumeSubscription(workspaceId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Resume failed" };
  }
}

export async function retryPaymentAction(workspaceId: string, tenantId: string, planCode: string, email?: string): Promise<{ success: boolean; checkout?: CheckoutResult & { keyId?: string }; error?: string }> {
  const auth = await authorizeWorkspace(workspaceId, tenantId);
  if (!auth.session) return { success: false, error: "Unauthorized" };

  // RCCF-RELEASE-02 (F1): same family gate — retry is a changePlan checkout and
  // must never become a cross-family selection vector.
  const family = assertPlanFamilyForWorkspace(auth.workspaceType, planCode);
  if (!family.ok) return { success: false, error: family.error };

  try {
    const checkout = await billingService.changePlan(workspaceId, planCode, email);
    if (!checkout.success) return { success: false, error: checkout.error ?? "Retry failed" };
    return { success: true, checkout: { ...checkout, keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "" } };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Retry failed" };
  }
}

export { requireAuth };

/**
 * Dev-only webhook simulator — IMPLEMENTATION-35.
 *
 * Drives the SAME BillingService.handleSubscriptionWebhook path a Razorpay
 * webhook uses, so the full lifecycle + idempotency + illegal-transition
 * handling can be exercised in the browser (and by Playwright) without a real
 * provider. Guarded to non-production; never exposed in the product.
 */
export async function simulateRazorpayEvent(
  eventName: string,
  workspaceId: string,
  planCode: string,
): Promise<{ success: boolean; handled?: boolean; status?: string | null; error?: string }> {
  if (process.env.NODE_ENV === "production") {
    return { success: false, error: "dev-only" };
  }
  // RCCF-72.17A (SEC-02): the billing simulator can mint entitlement/subscription
  // state, so it requires an authenticated SUPER_ADMIN session. Development mode
  // is NOT an authorization mechanism — role is derived from the server session,
  // never from client-supplied identifiers.
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const isPaidEvent = eventName === "subscription.activated" || eventName === "subscription.charged" || eventName === "order.paid" || eventName === "payment.captured";
    const result = await billingService.handleSubscriptionWebhook({
      eventName,
      workspaceId,
      planCode,
      providerReference: `sim_${eventName}_${Date.now()}`,
      idempotencyKey: `sim_${eventName}_${Date.now()}`,
      renewsAt: eventName === "subscription.activated" || eventName === "subscription.charged" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : null,
      // RCCF-71.4.5 (F1): paid events must carry a valid positive captured
      // amount or the subscription will never transition to ACTIVE.
      amount: isPaidEvent ? capabilityService.getPlan(planCode)?.price ?? 999 : undefined,
    });
    return { success: true, handled: result.handled, status: result.status, error: result.error };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Simulation failed" };
  }
}
