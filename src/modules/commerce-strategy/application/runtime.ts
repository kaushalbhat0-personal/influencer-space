// ── Commerce Strategy — Resolution Engine ───────────────────
// RCCF-IMPLEMENTATION-73 Phase 3. resolveCommerceStrategy() answers the single
// question every commerce flow asks. Priority: tenant override → workspace
// override → platform default → PLATFORM_COLLECT. Request-cached; no duplicated
// queries; consumers never touch the database directly.

import { cache as reactCache } from "react";
import { prisma } from "@/lib/prisma";
import { runtimeEventBus } from "@/modules/event-runtime";
import {
  COMMERCE_STRATEGY_REGISTRY,
  COMMERCE_STRATEGY_BY_ID,
  DEFAULT_COMMERCE_STRATEGY_ID,
} from "./registry";
import type {
  CommerceStrategyId,
  ResolvedCommerceStrategy,
  StrategyReadinessReport,
} from "../domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

const TENANT_KEY = "commerce_strategy";
const PLATFORM_DEFAULT_KEY = "commerce_strategy_default";

// ── Resolution (request-cached) ──────────────────────────────

const resolveCached = requestCache(async (tenantId: string): Promise<ResolvedCommerceStrategy> => {
  // 1. Tenant override.
  const setting = await prisma.setting.findUnique({
    where: { tenantId_key: { tenantId, key: TENANT_KEY } },
    select: { value: true },
  });
  const tenantValue = parseStrategyId(setting?.value);
  if (tenantValue) return buildResolved(tenantValue, "tenant");

  // 2. Workspace override (single tenant workspace).
  const workspace = await prisma.workspace.findUnique({
    where: { tenantId },
    select: { metadata: true },
  });
  const wsValue = parseStrategyId((workspace?.metadata as Record<string, unknown> | null)?.["commerceStrategy"]);
  if (wsValue) return buildResolved(wsValue, "workspace");

  // 3. Platform default.
  const platformTenant = await prisma.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
  if (platformTenant) {
    const platform = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: platformTenant.id, key: PLATFORM_DEFAULT_KEY } },
      select: { value: true },
    });
    const platformValue = parseStrategyId(platform?.value);
    if (platformValue) return buildResolved(platformValue, "platform");
  }

  // 4. Default.
  return buildResolved(DEFAULT_COMMERCE_STRATEGY_ID, "default");
});

export async function resolveCommerceStrategy(tenantId: string): Promise<ResolvedCommerceStrategy> {
  return resolveCached(tenantId);
}

function buildResolved(id: CommerceStrategyId, source: ResolvedCommerceStrategy["source"]): ResolvedCommerceStrategy {
  const definition = COMMERCE_STRATEGY_BY_ID[id] ?? COMMERCE_STRATEGY_BY_ID[DEFAULT_COMMERCE_STRATEGY_ID]!;
  return {
    id: definition.id,
    source,
    definition,
    readiness: definition.id === "PLATFORM_COLLECT" ? "ready" : definition.status === "active" ? "ready" : "incomplete",
    reason: definition.status === "future" || definition.status === "reserved"
      ? `${definition.label} is reserved — the platform prepares for it without behavior changes.`
      : null,
  };
}

function parseStrategyId(value: unknown): CommerceStrategyId | null {
  if (typeof value === "string") {
    const id = value as CommerceStrategyId;
    return COMMERCE_STRATEGY_BY_ID[id] ? id : null;
  }
  if (value && typeof value === "object") {
    const id = (value as Record<string, unknown>)["strategy"] as CommerceStrategyId;
    return COMMERCE_STRATEGY_BY_ID[id] ? id : null;
  }
  return null;
}

// ── Readiness (Phase 11) ─────────────────────────────────────

/** Check a tenant's readiness for a strategy (e.g. DIRECT_CREATOR needs a linked Razorpay account). */
export async function getCommerceStrategyReadiness(tenantId: string, strategy: CommerceStrategyId = DEFAULT_COMMERCE_STRATEGY_ID): Promise<StrategyReadinessReport> {
  const definition = COMMERCE_STRATEGY_BY_ID[strategy] ?? COMMERCE_STRATEGY_BY_ID[DEFAULT_COMMERCE_STRATEGY_ID]!;

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { razorpayAccountId: true, razorpaySetupComplete: true },
  });

  const requirements = [
    { key: "linked_account", label: "Razorpay account linked", met: definition.requiresLinkedAccount ? !!tenant?.razorpayAccountId : true },
    { key: "payout_account", label: "Payout/fund account configured", met: definition.requiresSettlement ? !!tenant?.razorpayAccountId && !!tenant?.razorpaySetupComplete : true },
  ];

  const unmet = requirements.filter((r) => !r.met);
  const readiness = unmet.length === 0 ? "ready" : definition.id === "PLATFORM_COLLECT" ? "ready" : "incomplete";
  return { strategy: definition.id, readiness, requirements };
}

// ── Distribution + migration readiness (Phase 9) ─────────────

export async function getStrategyDistribution(): Promise<Array<{ strategy: CommerceStrategyId; count: number }>> {
  const [tenants, settings, workspaces, platform] = await Promise.all([
    prisma.tenant.findMany({ select: { id: true } }),
    prisma.setting.findMany({ where: { key: TENANT_KEY }, select: { tenantId: true, value: true } }),
    prisma.workspace.findMany({ select: { tenantId: true, metadata: true } }),
    prisma.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } }),
  ]);

  const byTenant = new Map<string, CommerceStrategyId>();
  for (const s of settings) {
    const id = parseStrategyId(s.value);
    if (id) byTenant.set(s.tenantId, id);
  }
  for (const w of workspaces) {
    if (w.tenantId && !byTenant.has(w.tenantId)) {
      const id = parseStrategyId((w.metadata as Record<string, unknown> | null)?.["commerceStrategy"]);
      if (id) byTenant.set(w.tenantId, id);
    }
  }
  let platformDefault: CommerceStrategyId = DEFAULT_COMMERCE_STRATEGY_ID;
  if (platform) {
    const p = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId: platform.id, key: PLATFORM_DEFAULT_KEY } }, select: { value: true } });
    platformDefault = parseStrategyId(p?.value) ?? DEFAULT_COMMERCE_STRATEGY_ID;
  }

  const counts = new Map<CommerceStrategyId, number>();
  for (const t of tenants) {
    const id = byTenant.get(t.id) ?? platformDefault;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return COMMERCE_STRATEGY_REGISTRY.map((s) => ({ strategy: s.id, count: counts.get(s.id) ?? 0 }));
}

export async function getMigrationReadiness(): Promise<{
  total: number;
  directReady: number;
  directIncomplete: number;
  reason: string;
}> {
  const tenants = await prisma.tenant.findMany({ select: { razorpayAccountId: true } });
  const directReady = tenants.filter((t) => t.razorpayAccountId).length;
  return {
    total: tenants.length,
    directReady,
    directIncomplete: tenants.length - directReady,
    reason: "DIRECT_CREATOR requires creator Razorpay linked accounts (next EPIC). PLATFORM_COLLECT remains the default.",
  };
}

// ── Event emission (Phase 10) ────────────────────────────────

export async function emitStrategyEvent(tenantId: string, strategy: CommerceStrategyId): Promise<void> {
  await runtimeEventBus.publish({
    type: "commerce.strategy.resolved",
    tenantId,
    payload: { strategy },
    occurredAt: new Date().toISOString(),
  }).catch(() => {});
}

export async function setTenantCommerceStrategy(tenantId: string, strategy: CommerceStrategyId): Promise<{ success: boolean; error?: string }> {
  if (!COMMERCE_STRATEGY_BY_ID[strategy]) return { success: false, error: "Unknown strategy" };
  const previous = (await resolveCached(tenantId)).id;
  await prisma.setting.upsert({
    where: { tenantId_key: { tenantId, key: TENANT_KEY } },
    update: { value: strategy },
    create: { tenantId, key: TENANT_KEY, value: strategy },
  });
  await runtimeEventBus.publish({
    type: "commerce.strategy.changed",
    tenantId,
    payload: { previous, strategy },
    occurredAt: new Date().toISOString(),
  }).catch(() => {});
  return { success: true };
}
