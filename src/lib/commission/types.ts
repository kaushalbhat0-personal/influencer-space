import type { CommissionRuleType, CommissionRuleStatus, LedgerEntryType, BalanceType } from "./constants";

export interface CommissionRule {
  id: string;
  type: CommissionRuleType;
  status: CommissionRuleStatus;
  partnerId?: string;
  platformSharePercent: number;
  partnerSharePercent: number;
  effectiveFrom: string;
  effectiveTo?: string;
  priority: number;
  label: string;
  description?: string;
  metadata?: Record<string, string>;
  createdAt: string;
}

export interface CommissionCalculation {
  gross: number;
  platformShare: number;
  partnerShare: number;
  platformPercent: number;
  partnerPercent: number;
  tax: number;
  discount: number;
  transactionFee?: number;
  net: number;
  currency: string;
}

export interface CommissionEntry {
  id: string;
  invoiceId: string;
  partnerId: string;
  subscriptionId: string;
  planCode: string;
  amount: CommissionCalculation;
  ruleId: string;
  type: LedgerEntryType;
  status: "pending" | "cleared" | "reversed";
  description: string;
  audit: AuditMetadata;
  createdAt: string;
  clearedAt?: string;
  reversedAt?: string;
  parentEntryId?: string;
}

export interface AuditMetadata {
  calculationVersion: number;
  ruleUsed: string;
  ruleType: CommissionRuleType;
  platformPercent: number;
  partnerPercent: number;
  invoiceReference: string;
  partnerReference: string;
  calculatedAt: string;
}

export interface PartnerBalance {
  partnerId: string;
  pending: number;
  available: number;
  paid: number;
  lifetime: number;
  currency: string;
  lastUpdated: string;
}

export interface BalanceTransaction {
  id: string;
  partnerId: string;
  entryId: string;
  amount: number;
  type: BalanceType;
  description: string;
  createdAt: string;
}

export interface CommissionRuleQuery {
  partnerId?: string;
  type?: CommissionRuleType;
  status?: CommissionRuleStatus;
  effectiveAt?: string;
}

export interface CommissionEntryQuery {
  partnerId?: string;
  invoiceId?: string;
  type?: LedgerEntryType;
  status?: CommissionEntry["status"];
  createdAfter?: string;
  createdBefore?: string;
  limit?: number;
  offset?: number;
}

export interface CommissionSummary {
  partnerId: string;
  totalCommissions: number;
  totalPlatformShare: number;
  totalPartnerShare: number;
  entryCount: number;
  pendingCount: number;
  clearedCount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
}
