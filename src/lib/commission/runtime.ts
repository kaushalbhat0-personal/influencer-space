// ── Subscription Revenue Runtime — RCCF-IMPLEMENTATION-72 ───────────────────
// Activates the existing commission/ledger architecture for the target model:
// agencies earn a configurable recurring % of creator SUBSCRIPTIONS. Creators
// keep 100% of product revenue. No transaction fees.
//
// Attribution: BillingSubscription.workspaceId → Workspace.tenantId →
// AgencyTenant.agencyId (reuses AgencyTenant — no duplicated relationship).
// Splits: explicit partner CommissionRule → LoyaltyTier (RCCF-IMPLEMENTATION-75)
// → plan/default rule → AgencyTenant.revSharePercent → CommissionPolicy
// .agencyDefaultShare → 20% default.

import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import { cache as reactCache } from "react";
import { logAction } from "@/lib/audit";
import { runtimeEventBus } from "@/modules/event-runtime";
import { captureError } from "@/lib/observability/error-tracker";
import { resolveLoyaltyTier, getActiveClientCount } from "./loyalty";
import type { RuntimeEvent } from "@/modules/event-runtime/domain/types";

const requestCache: <T extends (...args: never[]) => unknown>(fn: T) => T =
  typeof reactCache === "function" ? reactCache : ((fn: (x: never) => unknown) => fn as never);

export interface RevenueSplit {
  platformShare: number;
  partnerShare: number;
  platformPercent: number;
  partnerPercent: number;
  ruleId: string | null;
  source: "rule" | "loyalty" | "relationship" | "policy" | "default";
}

export interface CommissionRecordResult {
  success: boolean;
  skipped?: "no-partner" | "already-recorded" | "free-partner";
  entryId?: string;
  split?: RevenueSplit;
}

// ── Partner-plan commission eligibility (RCCF-73 §13) ────────────────────────
// Explicit business invariant: the FREE Partner tier NEVER earns commission;
// PAID Partner plans are eligible, with the percentage still resolved through
// the existing configurable hierarchy (rules → loyalty → relationship →
// policy → default). This predicate gates ELIGIBILITY only — never a rate.
//
// Eligible   = the agency's OWN subscription is ACTIVE (paid) on a partner-
//              family plan other than partner_free (Solo/Scale/Enterprise…).
// Ineligible = partner_free (trial or post-trial), TRIALING paid plans (not
//              yet paid), or no resolvable agency subscription.
export function isCommissionEligiblePartnerPlan(planCode: string | null | undefined): boolean {
  return !!planCode && planCode.startsWith("partner_") && planCode !== "partner_free";
}

/**
 * Resolve the commission ELIGIBILITY of a partner from their own billing state.
 * Server-derived from the canonical BillingAccount(accountType="agency") →
 * BillingSubscription chain — never from client input or the invoice payload.
 */
export const resolvePartnerCommissionEligibility = requestCache(
  async (partnerId: string): Promise<{ eligible: boolean; planCode: string | null; status: string | null }> => {
    const account = await prisma.billingAccount.findUnique({
      where: { accountType_accountId: { accountType: "agency", accountId: partnerId } },
      select: { id: true },
    });
    if (!account) return { eligible: false, planCode: null, status: null };
    const subs = await prisma.billingSubscription.findMany({
      where: { accountId: account.id },
      select: { status: true, plan: { select: { code: true, family: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    for (const s of subs) {
      if (
        s.status === "ACTIVE" &&
        s.plan?.family === "partner" &&
        isCommissionEligiblePartnerPlan(s.plan.code)
      ) {
        return { eligible: true, planCode: s.plan.code, status: s.status };
      }
    }
    return { eligible: false, planCode: subs[0]?.plan?.code ?? null, status: subs[0]?.status ?? null };
  },
);

// ── Attribution (Phase 1) ────────────────────────────────────────────────────

/** The agency managing a workspace's tenant, via AgencyTenant (reused). */
export async function resolvePartnerForWorkspace(workspaceId: string): Promise<string | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { tenantId: true },
  });
  if (!ws?.tenantId) return null;
  const link = await prisma.agencyTenant.findUnique({
    where: { tenantId: ws.tenantId },
    select: { agencyId: true },
  });
  return link?.agencyId ?? null;
}

// ── Split resolution (Phases 2 + 4) ──────────────────────────────────────────

interface SplitSource {
  platformPercent: number;
  partnerPercent: number;
  ruleId: string | null;
  source: RevenueSplit["source"];
}

/** Export for tests: resolve the platform/agency split for a subscription. */
export const resolveSplitSource = requestCache(async (partnerId: string, planCode: string, tenantId: string | null): Promise<SplitSource> => {
  // RCCF-48 — approved hierarchy: partner-specific rule → plan-specific rule →
  // global CommissionRule → loyalty tier → AgencyTenant.revSharePercent →
  // CommissionPolicy → 80/20 fallback. An explicit rule is authoritative;
  // without a rule, the existing loyalty economics apply unchanged.
  const rules = await prisma.commissionRule.findMany({
    where: { status: "active" },
    // RCCF-56 — deterministic tie-break: priority asc, then id asc. Same-scope
    // rules with equal priority now resolve deterministically instead of
    // depending on implicit DB order.
    orderBy: [{ priority: "asc" }, { id: "asc" }],
    select: {
      id: true, type: true, partnerId: true, platformSharePercent: true,
      partnerSharePercent: true, metadata: true, effectiveFrom: true, effectiveTo: true,
    },
  });
  const now = new Date();
  const active = rules.filter(
    (r) => r.effectiveFrom <= now && (!r.effectiveTo || r.effectiveTo >= now),
  );

  // 1. Partner-specific rule.
  const partnerRule = active.find((r) => r.partnerId === partnerId);
  if (partnerRule) return { platformPercent: partnerRule.platformSharePercent, partnerPercent: partnerRule.partnerSharePercent, ruleId: partnerRule.id, source: "rule" };

  // 2. Plan-specific rule.
  const planRule = active.find((r) => (r.metadata as Record<string, unknown> | null)?.["planCode"] === planCode);
  if (planRule) return { platformPercent: planRule.platformSharePercent, partnerPercent: planRule.partnerSharePercent, ruleId: planRule.id, source: "rule" };

  // 3. Global CommissionRule.
  const defaultRule = active.find((r) => r.type === "default" && r.partnerId == null);
  if (defaultRule) return { platformPercent: defaultRule.platformSharePercent, partnerPercent: defaultRule.partnerSharePercent, ruleId: defaultRule.id, source: "rule" };

  // 4. Loyalty tier by active-client count (automatic escalation — unchanged).
  const loyaltyTier = await resolveLoyaltyTier(partnerId);
  if (loyaltyTier) {
    const partnerPercent = Math.min(100, Math.max(0, Math.round(loyaltyTier.commissionPercent)));
    return { platformPercent: 100 - partnerPercent, partnerPercent, ruleId: null, source: "loyalty" };
  }

  // 5. Per-creator agency relationship share.
  if (tenantId) {
    const link = await prisma.agencyTenant.findUnique({
      where: { tenantId },
      select: { revSharePercent: true },
    });
    if (link && link.revSharePercent > 0) {
      const partnerPercent = Math.min(100, Math.max(0, Math.round(link.revSharePercent)));
      return { platformPercent: 100 - partnerPercent, partnerPercent, ruleId: null, source: "relationship" };
    }
  }

  // 6. Platform policy.
  const policy = await prisma.commissionPolicy.findFirst({
    select: { agencyDefaultShare: true },
  });
  if (policy && policy.agencyDefaultShare > 0) {
    const partnerPercent = Math.min(100, Math.max(0, Math.round(policy.agencyDefaultShare)));
    return { platformPercent: 100 - partnerPercent, partnerPercent, ruleId: null, source: "policy" };
  }

  // 7. Default — RCCF-FINANCE-02: until an agency reaches 5 ACTIVE clients,
  // royalty is 0%. The loyalty tier 0–4 → 0% encodes this; if no tier row
  // matches (e.g. DB not yet seeded), fall back to 0% not 20%.
  const { royaltyPercentForActiveClients } = await import("@/config/commerce/agency-commercial");
  try {
    const fallbackCount = await getActiveClientCount(partnerId);
    const fallbackPercent = royaltyPercentForActiveClients(fallbackCount);
    if (fallbackPercent === 0) return { platformPercent: 100, partnerPercent: 0, ruleId: null, source: "default" };
  } catch {}
  return { platformPercent: 80, partnerPercent: 20, ruleId: null, source: "default" };
});

/** Compute the platform/agency split for a subscription amount (rupees). */
export function computeSubscriptionSplit(amount: number, src: SplitSource): RevenueSplit {
  const gross = Math.round(amount * 100) / 100;
  const partnerShare = Math.round((gross * src.partnerPercent) / 100 * 100) / 100;
  const platformShare = Math.round((gross - partnerShare) * 100) / 100;
  return { platformShare, partnerShare, platformPercent: src.platformPercent, partnerPercent: src.partnerPercent, ruleId: src.ruleId, source: src.source };
}

// ── Commission recording (Phase 3) ───────────────────────────────────────────

/**
 * Record a subscription-revenue commission for the agency managing the
 * workspace. Idempotent per invoice, transactional (CommissionEntry +
 * PartnerLedger), emits canonical events + audit. Returns skipped reasons
 * instead of throwing for benign cases; real failures surface to the caller.
 *
 * RCCF-41 — accepts an optional `tx` so the caller can commit the invoice and
 * the commission in ONE transaction (invoice + commission + ledger are atomic).
 */
export async function recordSubscriptionCommission(
  params: {
    workspaceId: string;
    planCode: string;
    subscriptionId: string;
    invoiceId: string;
    amount: number;
    event: "created" | "renewed" | "upgraded";
  },
  tx?: Prisma.TransactionClient,
): Promise<CommissionRecordResult> {
  const partnerId = await resolvePartnerForWorkspace(params.workspaceId);
  if (!partnerId) return { success: false, skipped: "no-partner" };

  // RCCF-73 §13 — the free Partner tier earns ZERO commission. Paid plans
  // proceed; the rate still comes exclusively from the configured hierarchy.
  const eligibility = await resolvePartnerCommissionEligibility(partnerId);
  if (!eligibility.eligible) {
    await logAction("system", "commission:partner-ineligible", { partnerId, planCode: eligibility.planCode, status: eligibility.status }).catch(() => {});
    return { success: false, skipped: "free-partner" };
  }

  const existing = await prisma.commissionEntry.findFirst({
    where: { invoiceId: params.invoiceId },
    select: { id: true },
  });
  if (existing) return { success: false, skipped: "already-recorded" };

  const ws = await prisma.workspace.findUnique({ where: { id: params.workspaceId }, select: { tenantId: true } });
  const src = await resolveSplitSource(partnerId, params.planCode, ws?.tenantId ?? null);
  const split = computeSubscriptionSplit(params.amount, src);

  try {
    const commit = async (client: Prisma.TransactionClient | typeof prisma) => {
      const entry = await client.commissionEntry.create({
        data: {
          invoiceId: params.invoiceId,
          partnerId,
          subscriptionId: params.subscriptionId,
          planCode: params.planCode,
          amount: params.amount,
          platformShare: split.platformShare,
          partnerShare: split.partnerShare,
          platformPercent: split.platformPercent,
          partnerPercent: split.partnerPercent,
          entryType: `subscription_${params.event}`,
          status: "pending",
          description: `Subscription revenue share for ${params.planCode} (${params.event}) — invoice ${params.invoiceId}`,
          ruleId: split.ruleId,
          audit: { source: split.source, event: params.event, actor: "billing-webhook" },
        },
      });

      // Append-only partner ledger (balance chain) inside the same transaction.
      const last = await client.partnerLedger.findFirst({
        where: { partnerId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const balanceBefore = last?.balanceAfter ?? 0;
      await client.partnerLedger.create({
        data: {
          partnerId,
          type: "COMMISSION_EARNED",
          amount: split.partnerShare,
          reference: entry.id,
          referenceType: "commission_entry",
          description: `Commission for ${params.planCode} (${params.event}) — invoice ${params.invoiceId}`,
          commissionId: entry.id,
          balanceBefore,
          balanceAfter: Math.round((balanceBefore + split.partnerShare) * 100) / 100,
        },
      });
    };

    if (tx) {
      await commit(tx);
    } else {
      await prisma.$transaction(async (t) => commit(t));
    }

    await emitEvent({
      type: params.event === "created" ? "subscription.created" : params.event === "renewed" ? "subscription.renewed" : "subscription.upgraded",
      tenantId: ws?.tenantId ?? "system",
      entityId: params.subscriptionId,
      payload: { workspaceId: params.workspaceId, planCode: params.planCode, amount: params.amount },
    });
    await emitEvent({
      type: "commission.created",
      tenantId: ws?.tenantId ?? "system",
      entityId: params.invoiceId,
      payload: { partnerId, invoiceId: params.invoiceId, subscriptionId: params.subscriptionId, planCode: params.planCode, amount: params.amount, partnerShare: split.partnerShare, platformShare: split.platformShare },
    });

    await logAction("system", "commission:subscription-created", {
      partnerId, workspaceId: params.workspaceId, planCode: params.planCode,
      invoiceId: params.invoiceId, amount: params.amount, partnerShare: split.partnerShare,
    }).catch(() => {});

    // FINANCE-ROYALTY-AGGREGATE-03: portfolio-wide catch-up for current billing period
    // If this invoice caused the agency to cross into a higher tier, all other
    // qualifying PAID invoices in the same YYYY-MM period that are still below
    // the new portfolio rate receive an additive delta (append-only, idempotent).
    try {
      await createAggregateRoyaltyCatchUp({
        agencyId: partnerId,
        triggerInvoiceId: params.invoiceId,
        triggerWorkspaceId: params.workspaceId,
      });
    } catch (err) {
      captureError(err, { service: "commission-runtime", operation: "aggregateCatchUp" });
    }

    return { success: true, split };
  } catch (err) {
    await emitEvent({
      type: "commission.failed",
      tenantId: ws?.tenantId ?? "system",
      entityId: params.invoiceId,
      payload: { partnerId, planCode: params.planCode, error: err instanceof Error ? err.message : String(err) },
    }).catch(() => {});
    captureError(err, { service: "commission-runtime", operation: "recordSubscriptionCommission" });
    throw err;
  }
}

async function emitEvent(event: Omit<RuntimeEvent, "occurredAt">): Promise<void> {
  await runtimeEventBus.publish({ ...event, occurredAt: new Date().toISOString() }).catch(() => {});
}

// ── FINANCE-ROYALTY-AGGREGATE-03 — portfolio-wide catch-up ────────────────────

/**
 * Current billing period catch-up: when the agency crosses into a new portfolio
 * tier, qualifying PAID SaaS invoices in the current YYYY-MM period that are
 * below the new portfolio rate receive an additive delta CommissionEntry.
 *
 * Keeps invoice-level traceability (one CommissionEntry per invoice) while the
 * portfolio total becomes TOTAL qualifying revenue × newRate. Uses append-only
 * catch-up entries (entryType subscription_aggregate_catchup) with parentEntryId
 * pointing to the original commission, so refunds can sum original + catch-ups.
 *
 * Idempotent via BillingEvent idempotencyKey:
 *   commission_aggregate_catchup:<agencyId>:<period>:<toPercent>
 * The whole batch is atomic; replay finds the BillingEvent and skips.
 */
export async function createAggregateRoyaltyCatchUp(params: {
  agencyId: string;
  triggerInvoiceId: string;
  triggerWorkspaceId: string;
  period?: string; // YYYY-MM, defaults to trigger invoice issuedAt
  tx?: Prisma.TransactionClient;
}): Promise<{ created: number; totalDelta: number; period: string; toPercent: number } | null> {
  const agencyId = params.agencyId;
  // Resolve current tier (portfolio-wide) — must be after the triggering invoice's ACTIVE count includes it
  const { royaltyPercentForActiveClients } = await import("@/config/commerce/agency-commercial");
  const activeCount = await getActiveClientCount(agencyId);
  const toPercent = royaltyPercentForActiveClients(activeCount);
  if (toPercent === 0) return null; // 0–4 → no catch-up needed

  // Determine billing period from triggering invoice
  const triggerInvoice = await (params.tx ?? prisma).billingInvoice.findUnique({
    where: { id: params.triggerInvoiceId },
    select: { issuedAt: true, createdAt: true },
  });
  if (!triggerInvoice) return null;
  const issuedAt = (triggerInvoice as { issuedAt: Date }).issuedAt ?? (triggerInvoice as { createdAt: Date }).createdAt;
  const period = params.period ?? `${issuedAt.getFullYear()}-${String(issuedAt.getMonth() + 1).padStart(2, "0")}`;
  const periodStart = new Date(`${period}-01T00:00:00.000Z`);
  const periodEnd = new Date(periodStart);
  periodEnd.setMonth(periodEnd.getMonth() + 1);

  // Idempotency: one catch-up batch per agency+period+toPercent
  const batchIdempotencyKey = `commission_aggregate_catchup:${agencyId}:${period}:${toPercent}`;
  const existingBatch = await (params.tx ?? prisma).billingEvent.findUnique({
    where: { idempotencyKey: batchIdempotencyKey },
    select: { id: true },
  });
  if (existingBatch) return null;

  // Find qualifying PAID SaaS invoices for this agency in this period
  // Qualifying: workspace belongs to ACTIVE AgencyTenant with ACTIVE BillingSubscription, planCode in creator family, status PAID
  // We resolve workspaceIds via AgencyTenant → Workspace → BillingSubscription ACTIVE
  const activeLinks = await prisma.agencyTenant.findMany({
    where: { agencyId, status: "ACTIVE", offboardedAt: null },
    select: { tenantId: true, workspaceId: true },
  });
  if (activeLinks.length === 0) return null;

  // Collect workspaceIds that are currently ACTIVE clients
  const activeWorkspaceIds: string[] = [];
  for (const link of activeLinks) {
    // Prefer linked workspaceId, fallback to tenant lookup
    let wsId = link.workspaceId;
    if (!wsId && link.tenantId) {
      const ws = await prisma.workspace.findUnique({ where: { tenantId: link.tenantId }, select: { id: true } });
      wsId = ws?.id ?? null;
    }
    if (!wsId) continue;
    const sub = await prisma.billingSubscription.findUnique({ where: { workspaceId: wsId }, select: { status: true } });
    if (sub?.status === "ACTIVE") activeWorkspaceIds.push(wsId);
  }
  if (activeWorkspaceIds.length === 0) return null;

  const qualifyingInvoices = await prisma.billingInvoice.findMany({
    where: {
      workspaceId: { in: activeWorkspaceIds },
      status: "PAID",
      issuedAt: { gte: periodStart, lt: periodEnd },
    },
    select: { id: true, workspaceId: true, planCode: true, amount: true, amountPaise: true, subscriptionId: true },
  });

  // Filter to creator SaaS family only (exclude any non-creator invoices that might have slipped)
  const { getCommercePlan } = await import("@/config/commerce/plans");
  const qualifying = qualifyingInvoices.filter((inv) => {
    const plan = getCommercePlan(inv.planCode);
    return plan?.family === "creator";
  });
  if (qualifying.length === 0) return null;

  // For each qualifying invoice, compute effective current percent and delta
  let created = 0;
  let totalDelta = 0;
  const catchUps: Array<{ invoice: typeof qualifying[0]; originalId: string; deltaShare: number; deltaPaise: number }> = [];

  for (const inv of qualifying) {
    // Find original subscription commission for this invoice (first subscription_* entry)
    const original = await prisma.commissionEntry.findFirst({
      where: { invoiceId: inv.id, entryType: { startsWith: "subscription_" } },
      orderBy: { createdAt: "asc" },
      select: { id: true, partnerShare: true, partnerPercent: true },
    });
    // If no original (e.g. invoice created before commission was enabled), treat as 0%
    const originalShare = original?.partnerShare ?? 0;

    // Sum existing catch-ups for this invoice (any catch-up for this invoice, regardless of parent)
    const catchUpAgg = await prisma.commissionEntry.aggregate({
      where: { invoiceId: inv.id, entryType: "subscription_aggregate_catchup" },
      _sum: { partnerShare: true },
    });
    const existingCatchUpShare = (catchUpAgg._sum.partnerShare ?? 0) as number;
    const effectiveShare = originalShare + existingCatchUpShare;
    const effectivePercent = inv.amount > 0 ? Math.round((effectiveShare / inv.amount) * 100) : 0;

    if (effectivePercent >= toPercent) continue; // already at or above new tier

    const deltaPercent = toPercent - effectivePercent;
    const deltaShare = Math.round((inv.amount * deltaPercent) / 100 * 100) / 100;
    if (deltaShare <= 0) continue;

    // Idempotency per invoice+period+toPercent: check if a catch-up for this invoice already exists for this toPercent
    const existingCatchUpForInvoice = await prisma.commissionEntry.findFirst({
      where: { invoiceId: inv.id, entryType: "subscription_aggregate_catchup", audit: { path: ["toPercent"], equals: toPercent } },
      select: { id: true },
    });
    if (existingCatchUpForInvoice) continue;

    catchUps.push({ invoice: inv, originalId: original?.id ?? null, deltaShare, deltaPaise: Math.round(deltaShare * 100) });
  }

  if (catchUps.length === 0) {
    // Still create the batch idempotency marker so future same-tier triggers don't re-scan unnecessarily?
    // We create it only if at least one catch-up was needed, to allow later tier increases.
    return null;
  }

  // Atomic batch: BillingEvent + all catch-up CommissionEntry + PartnerLedger entries
  const run = async (client: Prisma.TransactionClient | typeof prisma) => {
    await client.billingEvent.create({
      data: {
        workspaceId: params.triggerWorkspaceId,
        accountId: agencyId,
        type: "COMMISSION_AGGREGATE_CATCHUP",
        idempotencyKey: batchIdempotencyKey,
        payload: {
          agencyId,
          period,
          toPercent,
          triggerInvoiceId: params.triggerInvoiceId,
          catchUpCount: catchUps.length,
          totalDelta: Math.round(catchUps.reduce((s, c) => s + c.deltaShare, 0) * 100) / 100,
        },
      },
    });

    for (const cu of catchUps) {
      const originalCommission = await client.commissionEntry.findFirst({
        where: { id: cu.originalId },
        select: { id: true, partnerId: true, subscriptionId: true, planCode: true, amount: true },
      });
      // If originalId was invoiceId (no original commission), fetch invoice's subscriptionId/planCode from invoice
      const partnerIdForEntry = originalCommission?.partnerId ?? agencyId;
      const subscriptionIdForEntry = originalCommission?.subscriptionId ?? cu.invoice.subscriptionId ?? null;
      const planCodeForEntry = originalCommission?.planCode ?? cu.invoice.planCode;

      const entry = await client.commissionEntry.create({
        data: {
          invoiceId: cu.invoice.id,
          partnerId: partnerIdForEntry,
          subscriptionId: subscriptionIdForEntry,
          planCode: planCodeForEntry,
          amount: cu.invoice.amount,
          platformShare: Math.round((cu.invoice.amount - cu.deltaShare) * 100) / 100 - (cu.invoice.amount - cu.deltaShare > 0 ? 0 : 0), // platformShare not critical for catch-up; set as 0 or delta complement
          partnerShare: cu.deltaShare,
          platformPercent: 100 - toPercent,
          partnerPercent: toPercent,
          entryType: "subscription_aggregate_catchup",
          status: "pending",
          parentEntryId: cu.originalId,
          description: `Aggregate catch-up to ${toPercent}% for period ${period} — invoice ${cu.invoice.id}`,
          audit: { source: "aggregate_catchup", period, toPercent, fromPercent: Math.round(((cu.deltaShare / cu.invoice.amount) * 100) * 100) / 100, triggerInvoiceId: params.triggerInvoiceId },
        },
      });

      const last = await client.partnerLedger.findFirst({
        where: { partnerId: agencyId },
        orderBy: { createdAt: "desc" },
        select: { balanceAfter: true },
      });
      const balanceBefore = last?.balanceAfter ?? 0;
      await client.partnerLedger.create({
        data: {
          partnerId: agencyId,
          type: "COMMISSION_EARNED",
          amount: cu.deltaShare,
          reference: entry.id,
          referenceType: "commission_entry",
          description: `Aggregate catch-up ${toPercent}% for ${cu.invoice.id} period ${period}`,
          commissionId: entry.id,
          balanceBefore,
          balanceAfter: Math.round((balanceBefore + cu.deltaShare) * 100) / 100,
        },
      });
      created++;
      totalDelta = Math.round((totalDelta + cu.deltaShare) * 100) / 100;
    }
  };

  if (params.tx) {
    await run(params.tx as Prisma.TransactionClient);
  } else {
    await prisma.$transaction(async (tx) => run(tx));
  }

  return { created, totalDelta, period, toPercent };
}

// ── Reporting + health (Phases 13 + 14) ──────────────────────────────────────

/**
 * RCCF-43 — resolve PENDING commission entries to their NET settleable share.
 * A pending original is reduced by its append-only reversal children so a
 * partially refunded commission settles only its unrefunded remainder
 * (e.g. original ₹300, reversal −₹120 → ₹180). Entries with net ≤ 0 are
 * excluded. Transaction-aware (used by settlement + the revenue summary).
 */
export async function resolveNetPendingEntries(
  client: Prisma.TransactionClient | typeof prisma,
  params: { partnerId?: string; ids?: string[]; excludedIds?: string[] },
): Promise<Array<{ id: string; netShare: number }>> {
  const where: Prisma.CommissionEntryWhereInput = { status: "pending" };
  if (params.partnerId) where.partnerId = params.partnerId;
  if (params.ids) where.id = { in: params.ids };
  if (params.excludedIds?.length) where.id = { ...((where.id as object) ?? {}), notIn: params.excludedIds };

  const pending = await client.commissionEntry.findMany({
    where,
    select: { id: true, partnerShare: true },
  });
  if (pending.length === 0) return [];

  // FINANCE-ROYALTY-AGGREGATE-03: only refund_reversal entries are reversals;
  // catch-up entries (subscription_aggregate_catchup) are positive earned commission
  // and must not be netted as reversals.
  const reversals = await client.commissionEntry.findMany({
    where: { parentEntryId: { in: pending.map((p) => p.id) }, entryType: "refund_reversal" },
    select: { parentEntryId: true, partnerShare: true },
  });
  const byParent = new Map<string, number>();
  for (const r of reversals) {
    if (!r.parentEntryId) continue;
    byParent.set(r.parentEntryId, (byParent.get(r.parentEntryId) ?? 0) + r.partnerShare);
  }

  const out: Array<{ id: string; netShare: number }> = [];
  for (const p of pending) {
    const net = Math.round((p.partnerShare + (byParent.get(p.id) ?? 0)) * 100) / 100;
    if (net > 0) out.push({ id: p.id, netShare: net });
  }
  return out;
}

/**
 * RCCF-43 — partner-scoped reserved-entry exclusion. Only the partner's OWN
 * settled commission entries are excluded from their pending summary — another
 * partner's reservations can never suppress this partner's numbers.
 */
async function reservedEntryIds(partnerId: string): Promise<{ id?: { notIn: string[] } }> {
  const reserved = await prisma.settlementItem.findMany({
    where: { settlement: { partnerId } },
    select: { commissionEntryId: true },
  });
  if (reserved.length === 0) return {};
  return { id: { notIn: reserved.map((r) => r.commissionEntryId) } };
}

/** Agency revenue summary from the DB runtime (the canonical financial source). */
export async function getPartnerRevenueSummary(partnerId: string): Promise<{
  grossCommission: number;
  refundReversals: number;
  netCommission: number;
  clawbackDue: number;
  lifetime: number;
  pending: number;
  paid: number;
  available: number;
  entryCount: number;
  activeClients: number;
  upcomingRenewals: number;
}> {
  const [grossAgg, reversalAgg, clawbackAgg, entryCount, activeClients, renewals] = await Promise.all([
    prisma.commissionEntry.aggregate({
      where: { partnerId, entryType: { startsWith: "subscription_" } },
      _sum: { partnerShare: true },
    }),
    prisma.commissionEntry.aggregate({
      where: { partnerId, entryType: "refund_reversal" },
      _sum: { partnerShare: true },
    }),
    prisma.partnerLedger.aggregate({
      where: { partnerId, type: "CLAWBACK_DUE" },
      _sum: { amount: true },
    }),
    prisma.commissionEntry.count({ where: { partnerId } }),
    getActiveClientCount(partnerId),
    prisma.billingSubscription.count({
      where: { workspace: { tenant: { agencyTenant: { agencyId: partnerId } } }, status: { in: ["ACTIVE", "TRIALING"] } },
    }),
  ]);

  const grossCommission = Math.round((grossAgg._sum.partnerShare ?? 0) * 100) / 100;
  const refundReversals = Math.round((reversalAgg._sum.partnerShare ?? 0) * 100) / 100; // negative
  const netCommission = Math.round((grossCommission + refundReversals) * 100) / 100;
  // RCCF-50: clawback due = settled commission that was later refunded (an
  // outstanding obligation, negative in the ledger). Surfaced separately and
  // subtracted from available so the partner is never shown as eligible for
  // amounts already paid and later refunded.
  const clawbackDue = Math.abs(Math.round((clawbackAgg._sum.amount ?? 0) * 100) / 100);

  const paidAgg = await prisma.partnerLedger.aggregate({
    where: { partnerId, type: "SETTLEMENT_PAID" },
    _sum: { amount: true },
  });
  const paid = paidAgg._sum.amount ?? 0;

  const excluded = (await reservedEntryIds(partnerId)).id?.notIn ?? [];
  const netPending = await resolveNetPendingEntries(prisma, { partnerId, excludedIds: excluded });
  const pending = Math.round(netPending.reduce((s, e) => s + e.netShare, 0) * 100) / 100;

  return {
    grossCommission,
    refundReversals,
    netCommission,
    clawbackDue,
    lifetime: netCommission,
    pending,
    paid,
    available: Math.max(0, Math.round((netCommission - paid - clawbackDue) * 100) / 100),
    entryCount,
    activeClients,
    upcomingRenewals: renewals,
  };
}

/** Platform-level revenue summary (Phase 14). */
export async function getPlatformRevenueSummary(): Promise<{
  platformRevenue: number;
  agencyRevenue: number;
  totalSubscriptions: number;
  commissionEntries: number;
  pendingSettlements: number;
  paidPayouts: number;
  topAgencies: Array<{ partnerId: string; revenue: number }>;
}> {
  const [entries, totalSubscriptions, pendingSettlements, paidPayouts] = await Promise.all([
    prisma.commissionEntry.findMany({ select: { partnerId: true, platformShare: true, partnerShare: true } }),
    prisma.billingSubscription.count(),
    prisma.settlement.count({ where: { status: { in: ["PENDING", "READY", "APPROVED", "PROCESSING"] } } }),
    prisma.payoutBatch.count({ where: { status: { in: ["paid", "completed"] } } }),
  ]);
  const byPartner = new Map<string, number>();
  let platformRevenue = 0;
  let agencyRevenue = 0;
  for (const e of entries) {
    platformRevenue += e.platformShare;
    agencyRevenue += e.partnerShare;
    byPartner.set(e.partnerId, (byPartner.get(e.partnerId) ?? 0) + e.partnerShare);
  }
  return {
    platformRevenue,
    agencyRevenue,
    totalSubscriptions,
    commissionEntries: entries.length,
    pendingSettlements,
    paidPayouts,
    topAgencies: Array.from(byPartner.entries()).map(([partnerId, revenue]) => ({ partnerId, revenue })).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
  };
}

/** Phase 13 — revenue runtime health. */
export async function getRevenueRuntimeHealth(): Promise<Array<{ id: string; label: string; status: "healthy" | "warning" | "broken"; detail: string }>> {
  const [commissionCount, lastCommission, settlementActive, payoutFailed, ledgerCount, strategyDistribution] = await Promise.all([
    prisma.commissionEntry.count(),
    prisma.commissionEntry.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
    prisma.settlement.count({ where: { status: { in: ["PENDING", "READY", "APPROVED", "PROCESSING"] } } }),
    prisma.payoutBatch.count({ where: { status: "failed" } }),
    prisma.partnerLedger.count(),
    // RCCF-IMPLEMENTATION-73: commerce strategy readiness (platform-wide).
    (async () => {
      const { getStrategyDistribution } = await import("@/modules/commerce-strategy");
      const dist = await getStrategyDistribution();
      return dist.reduce((s, d) => s + d.count, 0);
    })(),
  ]);
  return [
    {
      id: "commission",
      label: "Commission Runtime",
      status: commissionCount > 0 ? "healthy" : lastCommission ? "warning" : "broken",
      detail: commissionCount > 0 ? `${commissionCount} entries recorded` : "No commission entries — agency revenue inactive",
    },
    {
      id: "settlement",
      label: "Settlement Runtime",
      status: "healthy",
      detail: `${settlementActive} active settlements`,
    },
    {
      id: "ledger",
      label: "Partner Ledger",
      status: ledgerCount > 0 ? "healthy" : "warning",
      detail: `${ledgerCount} ledger entries`,
    },
    {
      id: "payout",
      label: "Payout Runtime",
      status: payoutFailed > 0 ? "warning" : "healthy",
      detail: `${payoutFailed} failed payouts`,
    },
    {
      id: "commerce-strategy",
      label: "Commerce Strategy",
      status: strategyDistribution > 0 ? "healthy" : "warning",
      detail: `${strategyDistribution} tenants resolved`,
    },
  ];
}
