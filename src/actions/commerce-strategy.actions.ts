"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  resolveCommerceStrategy,
  getCommerceStrategyReadiness,
  getStrategyDistribution,
  getMigrationReadiness,
} from "@/modules/commerce-strategy";
import type { ResolvedCommerceStrategy } from "@/modules/commerce-strategy";

/** The session user's tenant strategy (creator dashboard / builder). */
export async function getMyCommerceStrategy(): Promise<{ ok: boolean; strategy?: ResolvedCommerceStrategy; error?: string }> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { ok: false, error: "No tenant" };
  const strategy = await resolveCommerceStrategy(tenantId);
  return { ok: true, strategy };
}

/**
 * @deprecated RCCF-PAYMENTS-UX-01C — legacy wrapper now delegates to canonical PaymentAccount readiness.
 * Use computePaymentReadiness directly for sales readiness. Kept for compatibility.
 */
export async function getMyStrategyReadiness(): Promise<{
  ok: boolean;
  readiness?: Awaited<ReturnType<typeof getCommerceStrategyReadiness>>;
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;
  if (!tenantId) return { ok: false, error: "No tenant" };
  const resolved = await resolveCommerceStrategy(tenantId);
  const readiness = await getCommerceStrategyReadiness(tenantId, resolved.id);
  return { ok: true, readiness };
}

/** Super Admin commerce center (read-only). */
export async function getCommerceStrategyOverview(): Promise<{
  ok: boolean;
  distribution?: Awaited<ReturnType<typeof getStrategyDistribution>>;
  migration?: Awaited<ReturnType<typeof getMigrationReadiness>>;
  error?: string;
}> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return { ok: false, error: "Unauthorized" };
  const [distribution, migration] = await Promise.all([getStrategyDistribution(), getMigrationReadiness()]);
  return { ok: true, distribution, migration };
}
