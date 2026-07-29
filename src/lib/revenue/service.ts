import { prisma } from "@/lib/prisma";
import { billingRepository } from "@/modules/billing/infrastructure/repository";

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

export interface CommissionConfig {
  agencyClientPercent: number;
  platformPercent: number;
  referralPercent: number;
  defaultCreatorPercent: number;
  defaultAgencyPercent: number;
}

export interface BillingSettings {
  defaultCurrency: string;
  defaultTrialDays: number;
  gracePeriodDays: number;
  invoicePrefix: string;
  autoRenew: boolean;
  refundWindowDays: number;
  prorationEnabled: boolean;
}

const COMMISSION_KEY = "revenue_commission_config";
const BILLING_SETTINGS_KEY = "revenue_billing_settings";

function parseJson<T>(value: unknown, fallback: T): T {
  if (!value) return fallback;
  try {
    return { ...fallback, ...(value as Record<string, unknown>) } as T;
  } catch {
    return fallback;
  }
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
    const mrr = subscriptions
      .filter((s) => s.status === "ACTIVE")
      .reduce((sum, s) => sum + (s.plan?.price ?? 0), 0);

    const monthlyRevenue = invoices30d
      .filter((i) => new Date(i.issuedAt) > thirtyDaysAgo)
      .reduce((sum, i) => sum + i.amount, 0);

    const commissionRevenue = commissionEntries
      .filter((e) => e.status === "pending" || e.status === "paid")
      .reduce((sum, e) => sum + e.partnerShare, 0);

    const totalInvoiced = (allInvoices._sum.amount ?? 0);
    const pendingInvoices = invoices30d.filter((i) => i.status === "PENDING").length;

    const subscriptionRevenue = invoices30d
      .filter((i) => i.status === "PAID")
      .reduce((sum, i) => sum + i.amount, 0);

    const platformTakeRate = subscriptionRevenue > 0
      ? Math.round((commissionRevenue / (subscriptionRevenue + commissionRevenue)) * 100)
      : 0;

    return {
      mrr,
      arr: mrr * 12,
      activeCreatorSubs,
      activeAgencySubs,
      trialUsers,
      monthlyRevenue,
      commissionRevenue,
      platformTakeRate,
      totalInvoiced,
      pendingInvoices,
      failedPayments,
    };
  }

  async getCommissionConfig(): Promise<CommissionConfig> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: "platform", key: COMMISSION_KEY } },
    });
    return parseJson<CommissionConfig>(setting?.value, {
      agencyClientPercent: 20,
      platformPercent: 10,
      referralPercent: 5,
      defaultCreatorPercent: 70,
      defaultAgencyPercent: 30,
    });
  }

  async updateCommissionConfig(config: CommissionConfig): Promise<void> {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: "platform", key: COMMISSION_KEY } },
      update: { value: JSON.parse(JSON.stringify(config)) },
      create: { tenantId: "platform", key: COMMISSION_KEY, value: JSON.parse(JSON.stringify(config)) },
    });
  }

  async getBillingSettings(): Promise<BillingSettings> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: "platform", key: BILLING_SETTINGS_KEY } },
    });
    return parseJson<BillingSettings>(setting?.value, {
      defaultCurrency: "INR",
      defaultTrialDays: 14,
      gracePeriodDays: 7,
      invoicePrefix: "INV",
      autoRenew: true,
      refundWindowDays: 30,
      prorationEnabled: true,
    });
  }

  async updateBillingSettings(settings: BillingSettings): Promise<void> {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: "platform", key: BILLING_SETTINGS_KEY } },
      update: { value: JSON.parse(JSON.stringify(settings)) },
      create: { tenantId: "platform", key: BILLING_SETTINGS_KEY, value: JSON.parse(JSON.stringify(settings)) },
    });
  }
}

export const revenueService = new RevenueService();
