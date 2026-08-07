import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { revenueRepository } from "@/modules/billing/infrastructure/revenue-repository";
import { MS_PER_DAY } from "@/lib/constants";
import { logger } from "@/lib/observability/logger";
import { metricsService } from "@/lib/observability/metrics-service";
import { captureError } from "@/lib/observability/error-tracker";

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
    await revenueRepository.upsertCommissionPolicy(config);

    // Sync to canonical CommissionRule engine so UI changes affect actual calculations
    const { commissionService } = await import("@/lib/commission");
    const { ruleEngine } = await import("@/lib/commission/rules");
    try {
      const existingDefault = ruleEngine.resolveRule("", "");
      if (existingDefault && existingDefault.id) {
        ruleEngine.removeRule(existingDefault.id);
      }
      commissionService.createRule({
        // VALIDATION-04: the runtime rule is a two-way platform+partner split
        // that must sum to 100 — the raw agencyDefaultShare (e.g. 30) alongside
        // platformPercent (e.g. 10) failed validation, so the rule was silently
        // never created and Commission Center edits had no runtime effect.
        platformSharePercent: config.platformPercent,
        partnerSharePercent: 100 - config.platformPercent,
        type: "default",
        label: "Platform Default (from Commission Center)",
      });
    } catch (err) {
      captureError(err instanceof Error ? err : new Error(String(err)), { service: "revenue", operation: "syncCommissionRule" });
    }

    logger.info("updateCommissionConfig completed", "billing", { operation: "update_commission_config", duration: Date.now() - start, metadata: { result: "success" } as Record<string, unknown> });
    metricsService.recordDuration("billing_execution", Date.now() - start);
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
