import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { revenueRepository } from "@/modules/billing/infrastructure/revenue-repository";
import { MS_PER_DAY } from "@/lib/constants";
import { logger } from "@/lib/observability/logger";
import { metricsService } from "@/lib/observability/metrics-service";

export interface RevenueDashboard {
  mrr: number;
  arr: number;
  activeCreatorSubs: number;
  activeAgencySubs: number;
  trialUsers: number;
  monthlyRevenue: number;
  commissionRevenue: number;
  platformTakeRate: number;
  totalInvoiced: number;
  pendingInvoices: number;
  failedPayments: number;
}

export interface PlanDistributionRow {
  planCode: string;
  planName: string;
  count: number;
}

export interface RevenueGrowth {
  currentMonth: number;
  previousMonth: number;
  growthPercent: number;
}

/** IMPLEMENTATION-39: real aggregates derived from Billing v2. */
export interface ExtendedRevenueDashboard extends RevenueDashboard {
  activeSubscribers: number;
  averageRevenuePerCreator: number;
  planDistribution: PlanDistributionRow[];
  growth: RevenueGrowth;
  totalPaidInvoices: number;
  invoicePaidAmount: number;
  invoicePendingAmount: number;
}

export class RevenueService {
  async getDashboard(): Promise<RevenueDashboard> {
    const start = Date.now();
    logger.info("getDashboard started", "billing", { operation: "get_dashboard", metadata: {} as Record<string, unknown> });
    const thirtyDaysAgo = new Date(Date.now() - 30 * MS_PER_DAY);

    const [subscriptions, invoices30d, allInvoices, commissionEntries, failedPayments] = await Promise.all([
      billingRepository.getAllSubscriptionsWithPlan(),
      billingRepository.findInvoicesByWorkspaceIds(
        (await prisma.workspace.findMany({ select: { id: true } })).map((w) => w.id),
        1000
      ),
      billingRepository.getInvoiceRevenue(),
      prisma.commissionEntry.findMany({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.billingEvent.count({
        where: { type: "PAYMENT_FAILED", createdAt: { gte: thirtyDaysAgo } },
      }),
    ]);

    const activeCreatorSubs = subscriptions.filter(
      (s) => (s.status === "ACTIVE" || s.status === "TRIALING") && s.plan?.family === "creator"
    ).length;

    const activeAgencySubs = subscriptions.filter(
      (s) => (s.status === "ACTIVE" || s.status === "TRIALING") && s.plan?.family === "agency"
    ).length;

    const trialUsers = subscriptions.filter((s) => s.status === "TRIALING").length;
    const mrr = subscriptions.filter((s) => s.status === "ACTIVE").reduce((sum, s) => sum + (s.plan?.price ?? 0), 0);
    const monthlyRevenue = invoices30d.filter((i) => new Date(i.issuedAt) > thirtyDaysAgo).reduce((sum, i) => sum + i.amount, 0);
    const commissionRevenue = commissionEntries.filter((e) => e.status === "pending" || e.status === "cleared").reduce((sum, e) => sum + e.partnerShare, 0);
    const totalInvoiced = allInvoices._sum.amount ?? 0;
    const pendingInvoices = invoices30d.filter((i) => i.status === "PENDING").length;
    const subscriptionRevenue = invoices30d.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
    const platformTakeRate = subscriptionRevenue > 0 ? Math.round((commissionRevenue / (subscriptionRevenue + commissionRevenue)) * 100) : 0;

    const result = { mrr, arr: mrr * 12, activeCreatorSubs, activeAgencySubs, trialUsers, monthlyRevenue, commissionRevenue, platformTakeRate, totalInvoiced, pendingInvoices, failedPayments };
    logger.info("getDashboard completed", "billing", { operation: "get_dashboard", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
    return result;
  }

  /**
   * IMPLEMENTATION-39 — extended revenue dashboard with real aggregates derived
   * entirely from Billing v2 (BillingSubscription, BillingInvoice, BillingEvent).
   * No hardcoded MRR/prices — used by the Revenue page + diagnostics.
   */
  async getRevenueDashboard(): Promise<ExtendedRevenueDashboard> {
    const base = await this.getDashboard();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [subscriptions, invoices, prevInvoices, planCounts] = await Promise.all([
      billingRepository.getAllSubscriptionsWithPlan(),
      billingRepository.findInvoicesByWorkspaceIds((await prisma.workspace.findMany({ select: { id: true } })).map((w) => w.id), 5000),
      prisma.billingInvoice.findMany({ where: { issuedAt: { gte: prevMonthStart, lt: monthStart }, status: "PAID" }, select: { amount: true } }),
      prisma.billingSubscription.groupBy({ by: ["planId"], _count: true, where: { status: "ACTIVE" } }),
    ]);

    const planDistribution: PlanDistributionRow[] = await Promise.all(
      planCounts.map(async (p) => {
        const plan = await prisma.billingPlan.findUnique({ where: { id: p.planId }, select: { code: true, name: true } });
        return { planCode: plan?.code ?? "unknown", planName: plan?.name ?? "Unknown", count: p._count };
      }),
    );

    const currentMonth = invoices.filter((i) => i.status === "PAID" && new Date(i.issuedAt) >= monthStart).reduce((s, i) => s + i.amount, 0);
    const previousMonth = prevInvoices.reduce((s, i) => s + i.amount, 0);
    const growthPercent = previousMonth > 0 ? Math.round(((currentMonth - previousMonth) / previousMonth) * 100) : 0;
    const activeSubscribers = subscriptions.filter((s) => s.status === "ACTIVE").length;
    const averageRevenuePerCreator = activeSubscribers > 0 ? Math.round((base.mrr / activeSubscribers) * 100) / 100 : 0;

    return {
      ...base,
      activeSubscribers,
      averageRevenuePerCreator,
      planDistribution: planDistribution.sort((a, b) => b.count - a.count),
      growth: { currentMonth, previousMonth, growthPercent },
      totalPaidInvoices: invoices.filter((i) => i.status === "PAID").length,
      invoicePaidAmount: invoices.filter((i) => i.status === "PAID").reduce((s, i) => s + i.amount, 0),
      invoicePendingAmount: invoices.filter((i) => i.status === "PENDING").reduce((s, i) => s + i.amount, 0),
    };
  }

  async getCommissionConfig() {
    const start = Date.now();
    logger.info("getCommissionConfig started", "billing", { operation: "get_commission_config", metadata: {} as Record<string, unknown> });
    const policy = await revenueRepository.getActiveCommissionPolicy();
    const result = policy ?? { agencyClientPercent: 20, platformPercent: 10, referralPercent: 5, creatorDefaultShare: 70, agencyDefaultShare: 30 };
    logger.info("getCommissionConfig completed", "billing", { operation: "get_commission_config", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    return result;
  }

  // ── IMPLEMENTATION-39: admin invoice + unified-transaction queries ────────

  async listInvoicesAdmin(input: { tenantId?: string; status?: string; search?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 25;
    const where: Record<string, unknown> = {};
    if (input.tenantId) where.workspace = { tenantId: input.tenantId };
    if (input.status && input.status !== "ALL") where.status = input.status;
    if (input.search) {
      where.OR = [
        { planCode: { contains: input.search } },
        { id: { contains: input.search } },
      ];
    }
    const [invoices, total] = await Promise.all([
      prisma.billingInvoice.findMany({
        where,
        include: { workspace: { select: { tenant: { select: { name: true, subdomain: true } } } } },
        orderBy: { issuedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.billingInvoice.count({ where }),
    ]);
    return {
      rows: invoices.map((i) => ({
        id: i.id,
        planCode: i.planCode,
        amount: i.amount,
        taxAmount: i.taxAmount ?? 0,
        status: i.status,
        issuedAt: i.issuedAt.toISOString(),
        paidAt: i.paidAt?.toISOString() ?? null,
        dueAt: i.dueAt?.toISOString() ?? null,
        providerReference: i.providerReference ?? null,
        tenantName: i.workspace?.tenant?.name ?? "Unknown",
        subdomain: i.workspace?.tenant?.subdomain ?? "",
      })),
      total,
      page,
      pageSize,
    };
  }

  async listUnifiedTransactions(input: { kind?: string; search?: string; page?: number; pageSize?: number }) {
    const page = input.page ?? 1;
    const pageSize = input.pageSize ?? 25;

    const [events, invoices, payments, workspaces] = await Promise.all([
      prisma.billingEvent.findMany({ orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, type: true, createdAt: true, workspaceId: true, idempotencyKey: true } }),
      prisma.billingInvoice.findMany({ orderBy: { issuedAt: "desc" }, take: 1000, select: { id: true, planCode: true, amount: true, status: true, issuedAt: true, workspaceId: true } }),
      prisma.productOrder.findMany({ orderBy: { createdAt: "desc" }, take: 1000, select: { id: true, amount: true, status: true, createdAt: true, razorpayOrderId: true } }),
      prisma.workspace.findMany({ select: { id: true, tenant: { select: { name: true, subdomain: true } } } }),
    ]);
    const tenantByWorkspace = new Map(workspaces.map((w) => [w.id, w.tenant?.name ?? "Unknown"]));

    type Row = { id: string; kind: string; type: string; amount: number | null; status: string; createdAt: string; tenantName: string; ref: string };
    const rows: Row[] = [
      ...events.map((e) => ({ id: `evt_${e.id}`, kind: "event", type: e.type, amount: null, status: "—", createdAt: e.createdAt.toISOString(), tenantName: e.workspaceId ? tenantByWorkspace.get(e.workspaceId) ?? "Unknown" : "System", ref: e.idempotencyKey ?? "" })),
      ...invoices.map((i) => ({ id: `inv_${i.id}`, kind: "invoice", type: i.planCode, amount: i.amount, status: i.status, createdAt: i.issuedAt.toISOString(), tenantName: i.workspaceId ? tenantByWorkspace.get(i.workspaceId) ?? "Unknown" : "Unknown", ref: i.id })),
      ...payments.map((p) => ({ id: `pay_${p.id}`, kind: "payment", type: "order", amount: p.amount, status: p.status, createdAt: p.createdAt.toISOString(), tenantName: "Storefront", ref: p.razorpayOrderId ?? p.id })),
    ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

    const filtered = rows.filter((r) => {
      if (input.kind && input.kind !== "ALL" && r.kind !== input.kind) return false;
      if (input.search) {
        const q = input.search.toLowerCase();
        return r.type.toLowerCase().includes(q) || r.tenantName.toLowerCase().includes(q) || r.ref.toLowerCase().includes(q);
      }
      return true;
    });

    return {
      rows: filtered.slice((page - 1) * pageSize, page * pageSize),
      total: filtered.length,
      page,
      pageSize,
    };
  }

  async updateCommissionConfig(config: { agencyClientPercent: number; platformPercent: number; referralPercent: number; creatorDefaultShare: number; agencyDefaultShare: number }): Promise<void> {
    const start = Date.now();
    logger.info("updateCommissionConfig started", "billing", { operation: "update_commission_config", metadata: { config } as Record<string, unknown> });

    // RCCF-48: server-side validation — every percentage must be a finite 0..100.
    for (const [key, value] of Object.entries(config)) {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
        throw new Error(`Invalid commission percentage for ${key}`);
      }
    }

    await revenueRepository.upsertCommissionPolicy(config);

    // RCCF-48 — the authoritative global Partner commission rule.
    // `agencyDefaultShare` is the existing field that already represents the
    // default Partner share of creator subscriptions (it feeds the resolver's
    // CommissionPolicy fallback). Save it as an explicit global CommissionRule
    // (partnerId = null, type = "default") so an intentionally configured rate
    // becomes authoritative over the loyalty tier for future transactions.
    // Loyalty economics stay unchanged when no rule is saved.
    const partnerShare = Math.round(config.agencyDefaultShare * 100) / 100;
    const platformShare = Math.round((100 - partnerShare) * 100) / 100;
    const now = new Date();
    const existingGlobal = await prisma.commissionRule.findFirst({
      where: {
        type: "default",
        partnerId: null,
        status: "active",
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: { priority: "asc" },
      select: { id: true },
    });
    if (existingGlobal) {
      await prisma.commissionRule.update({
        where: { id: existingGlobal.id },
        data: { partnerSharePercent: partnerShare, platformSharePercent: platformShare, label: "Platform Default (Commission Center)" },
      });
    } else {
      await prisma.commissionRule.create({
        data: {
          type: "default",
          status: "active",
          partnerId: null,
          platformSharePercent: platformShare,
          partnerSharePercent: partnerShare,
          effectiveFrom: now,
          priority: 100,
          label: "Platform Default (Commission Center)",
          description: "Global Partner subscription commission rule (Commission Center)",
        },
      });
    }

    logger.info("updateCommissionConfig completed", "billing", { operation: "update_commission_config", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
  }

  // ── RCCF-56 — Commission Rule effective-dating control ─────────────────────

  /**
   * List ALL global CommissionRules (type=default, partnerId=null) newest-first,
   * each classified as ACTIVE / SCHEDULED / EXPIRED against the current UTC
   * time. This is the read surface for the Commission Center rule lifecycle.
   * Historical rules are never rewritten; classification is derived at read time.
   */
  async listGlobalCommissionRules(): Promise<Array<{
    id: string;
    partnerSharePercent: number;
    platformSharePercent: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    priority: number;
    status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
  }>> {
    const now = new Date();
    const rules = await prisma.commissionRule.findMany({
      where: { type: "default", partnerId: null },
      orderBy: { effectiveFrom: "desc" },
      select: { id: true, partnerSharePercent: true, platformSharePercent: true, effectiveFrom: true, effectiveTo: true, priority: true },
    });
    return rules.map((r) => {
      let status: "ACTIVE" | "SCHEDULED" | "EXPIRED";
      if (r.effectiveTo && r.effectiveTo.getTime() < now.getTime()) status = "EXPIRED";
      else if (r.effectiveFrom.getTime() > now.getTime()) status = "SCHEDULED";
      else status = "ACTIVE";
      return {
        id: r.id,
        partnerSharePercent: r.partnerSharePercent,
        platformSharePercent: r.platformSharePercent,
        effectiveFrom: r.effectiveFrom.toISOString(),
        effectiveTo: r.effectiveTo?.toISOString() ?? null,
        priority: r.priority,
        status,
      };
    });
  }

  /**
   * RCCF-56 — schedule the global CommissionRule for a date window.
   *
   * Semantics (verified against the runtime resolver):
   *   active while  effectiveFrom <= now <= effectiveTo   (effectiveTo null = open)
   *   priority asc wins; id asc is the deterministic tie-break.
   *
   * Future dates → Option B: close the currently-active global rule(s) at
   * `effectiveFrom - 1ms` (never leaving two overlapping global rules) and
   * create the new rule. Immediate dates (effectiveFrom <= now) → mutate the
   * current active rule (Option A, RCCF-48 behavior). Historical
   * CommissionEntry values are never recalculated.
   *
   * Overlapping windows for the same (global) scope are REJECTED — the control
   * plane refuses ambiguous financial configuration.
   */
  async scheduleGlobalCommissionRule(input: {
    partnerSharePercent: number;
    effectiveFrom: string;
    effectiveTo?: string | null;
    priority?: number;
  }): Promise<{ id: string; status: "ACTIVE" | "SCHEDULED" }> {
    if (typeof input.partnerSharePercent !== "number" || !Number.isFinite(input.partnerSharePercent) || input.partnerSharePercent < 0 || input.partnerSharePercent > 100) {
      throw new Error("Invalid commission percentage");
    }
    const platformSharePercent = Math.round((100 - input.partnerSharePercent) * 100) / 100;
    const effectiveFrom = new Date(input.effectiveFrom);
    if (Number.isNaN(effectiveFrom.getTime())) throw new Error("Invalid effectiveFrom date");
    let effectiveTo: Date | null = null;
    if (input.effectiveTo) {
      effectiveTo = new Date(input.effectiveTo);
      if (Number.isNaN(effectiveTo.getTime())) throw new Error("Invalid effectiveTo date");
      if (effectiveTo.getTime() <= effectiveFrom.getTime()) throw new Error("effectiveTo must be after effectiveFrom");
    }
    const priority = input.priority === undefined ? 100 : Math.floor(input.priority);
    if (!Number.isFinite(priority) || priority < 0) throw new Error("Invalid priority");

    const now = new Date();
    const newEnd = effectiveTo ?? new Date("2100-01-01T00:00:00Z");

    if (effectiveFrom.getTime() > now.getTime()) {
      // Future schedule — Option B: close the currently-active global rule(s),
      // then create. The overlap check only considers FUTURE rules (those that
      // start after now); the current rule is closed, so it must not block.
      const overlapping = await prisma.commissionRule.findFirst({
        where: {
          type: "default", partnerId: null,
          effectiveFrom: { gt: now, lt: newEnd },
          OR: [{ effectiveTo: null }, { effectiveTo: { gt: effectiveFrom } }],
        },
        select: { id: true },
      });
      if (overlapping) {
        throw new Error("A CommissionRule already overlaps this date window");
      }

      await prisma.commissionRule.updateMany({
        where: {
          type: "default", partnerId: null, status: "active",
          effectiveFrom: { lte: now },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
        },
        data: { effectiveTo: new Date(effectiveFrom.getTime() - 1) },
      });

      const created = await prisma.commissionRule.create({
        data: {
          type: "default", status: "active", partnerId: null,
          partnerSharePercent: Math.round(input.partnerSharePercent),
          platformSharePercent,
          effectiveFrom,
          effectiveTo,
          priority,
          label: "Platform Default (Scheduled)",
          description: "Global Partner subscription commission rule (Commission Center scheduled)",
        },
      });
      return { id: created.id, status: "SCHEDULED" };
    }

    // Immediate change — Option A: mutate the currently-active global rule.
    const current = await prisma.commissionRule.findFirst({
      where: {
        type: "default", partnerId: null, status: "active",
        effectiveFrom: { lte: now },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }],
      },
      orderBy: [{ priority: "asc" }, { id: "asc" }],
      select: { id: true },
    });
    if (current) {
      await prisma.commissionRule.update({
        where: { id: current.id },
        data: {
          partnerSharePercent: Math.round(input.partnerSharePercent),
          platformSharePercent,
          label: "Platform Default (Commission Center)",
        },
      });
      return { id: current.id, status: "ACTIVE" };
    }
    const created = await prisma.commissionRule.create({
      data: {
        type: "default", status: "active", partnerId: null,
        partnerSharePercent: Math.round(input.partnerSharePercent),
        platformSharePercent,
        effectiveFrom,
        effectiveTo,
        priority,
        label: "Platform Default (Commission Center)",
        description: "Global Partner subscription commission rule (Commission Center)",
      },
    });
    return { id: created.id, status: "ACTIVE" };
  }

  async getBillingSettings() {
    const start = Date.now();
    logger.info("getBillingSettings started", "billing", { operation: "get_billing_settings", metadata: {} as Record<string, unknown> });
    const cfg = await revenueRepository.getActiveBillingConfig();
    const rev = await revenueRepository.getActiveRevenueConfig();
    const result = {
      defaultCurrency: rev?.defaultCurrency ?? "INR",
      defaultTrialDays: rev?.defaultTrialDays ?? 14,
      gracePeriodDays: rev?.gracePeriodDays ?? 7,
      invoicePrefix: rev?.invoicePrefix ?? "INV",
      autoRenew: rev?.autoRenew ?? true,
      refundWindowDays: rev?.refundWindowDays ?? 30,
      prorationEnabled: rev?.prorationEnabled ?? true,
      taxMode: cfg?.taxMode ?? "exclusive",
      cancellationPolicy: cfg?.cancellationPolicy ?? "immediate",
      defaultRegion: cfg?.defaultRegion ?? "IN",
    };
    logger.info("getBillingSettings completed", "billing", { operation: "get_billing_settings", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    return result;
  }

  async updateBillingSettings(settings: { defaultCurrency?: string; defaultTrialDays?: number; gracePeriodDays?: number; invoicePrefix?: string; autoRenew?: boolean; refundWindowDays?: number; prorationEnabled?: boolean; taxMode?: string; cancellationPolicy?: string; defaultRegion?: string }): Promise<void> {
    const start = Date.now();
    logger.info("updateBillingSettings started", "billing", { operation: "update_billing_settings", metadata: { settings } as Record<string, unknown> });
    const revData: Record<string, unknown> = {};
    const cfgData: Record<string, unknown> = {};
    if (settings.defaultCurrency !== undefined) revData.defaultCurrency = settings.defaultCurrency;
    if (settings.defaultTrialDays !== undefined) revData.defaultTrialDays = settings.defaultTrialDays;
    if (settings.gracePeriodDays !== undefined) revData.gracePeriodDays = settings.gracePeriodDays;
    if (settings.invoicePrefix !== undefined) revData.invoicePrefix = settings.invoicePrefix;
    if (settings.autoRenew !== undefined) revData.autoRenew = settings.autoRenew;
    if (settings.refundWindowDays !== undefined) revData.refundWindowDays = settings.refundWindowDays;
    if (settings.prorationEnabled !== undefined) revData.prorationEnabled = settings.prorationEnabled;
    if (Object.keys(revData).length > 0) await revenueRepository.upsertRevenueConfig(revData);
    if (settings.taxMode !== undefined) cfgData.taxMode = settings.taxMode;
    if (settings.cancellationPolicy !== undefined) cfgData.cancellationPolicy = settings.cancellationPolicy;
    if (settings.defaultRegion !== undefined) cfgData.defaultRegion = settings.defaultRegion;
    if (Object.keys(cfgData).length > 0) await revenueRepository.upsertBillingConfig(cfgData);
    logger.info("updateBillingSettings completed", "billing", { operation: "update_billing_settings", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
  }
}

export const revenueService = new RevenueService();
