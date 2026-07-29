import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";
import { revenueRepository } from "./repository";

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

export class RevenueService {
  async getDashboard(): Promise<RevenueDashboard> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000);

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
    const commissionRevenue = commissionEntries.filter((e) => e.status === "pending" || e.status === "paid").reduce((sum, e) => sum + e.partnerShare, 0);
    const totalInvoiced = allInvoices._sum.amount ?? 0;
    const pendingInvoices = invoices30d.filter((i) => i.status === "PENDING").length;
    const subscriptionRevenue = invoices30d.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
    const platformTakeRate = subscriptionRevenue > 0 ? Math.round((commissionRevenue / (subscriptionRevenue + commissionRevenue)) * 100) : 0;

    return { mrr, arr: mrr * 12, activeCreatorSubs, activeAgencySubs, trialUsers, monthlyRevenue, commissionRevenue, platformTakeRate, totalInvoiced, pendingInvoices, failedPayments };
  }

  async getCommissionConfig() {
    const policy = await revenueRepository.getActiveCommissionPolicy();
    return policy ?? { agencyClientPercent: 20, platformPercent: 10, referralPercent: 5, creatorDefaultShare: 70, agencyDefaultShare: 30 };
  }

  async updateCommissionConfig(config: { agencyClientPercent: number; platformPercent: number; referralPercent: number; creatorDefaultShare: number; agencyDefaultShare: number }): Promise<void> {
    await revenueRepository.upsertCommissionPolicy(config);
  }

  async getBillingSettings() {
    const cfg = await revenueRepository.getActiveBillingConfig();
    const rev = await revenueRepository.getActiveRevenueConfig();
    return {
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
  }

  async updateBillingSettings(settings: { defaultCurrency?: string; defaultTrialDays?: number; gracePeriodDays?: number; invoicePrefix?: string; autoRenew?: boolean; refundWindowDays?: number; prorationEnabled?: boolean; taxMode?: string; cancellationPolicy?: string; defaultRegion?: string }): Promise<void> {
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
  }
}

export const revenueService = new RevenueService();
