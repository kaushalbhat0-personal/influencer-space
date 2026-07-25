import type { PayoutStatus, PayoutProviderType } from "./constants";

export interface PayoutBatch {
  id: string;
  partnerId: string;
  status: PayoutStatus;
  provider: PayoutProviderType;
  currency: string;
  total: number;
  fee: number;
  netAmount: number;
  entryCount: number;
  entries: string[];
  idempotencyKey: string;
  audit: PayoutAudit;
  metadata?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutAudit {
  payoutVersion: number;
  initiatedBy: string;
  approvedBy?: string;
  providerReference?: string;
  bankReference?: string;
  failureReason?: string;
  settledAt?: string;
}

export interface PayoutEligibility {
  eligible: boolean;
  partnerId: string;
  availableBalance: number;
  pendingBalance: number;
  totalReserved: number;
  minimumThreshold: number;
  meetsMinimum: boolean;
  hasVerifiedAccount: boolean;
  partnerActive: boolean;
  reasons: string[];
}

export interface PayoutProviderCapabilities extends PayoutProviderCapabilityFields {
  type: PayoutProviderType;
}

export interface PayoutProviderCapabilityFields {
  label: string;
  supportsAutomation: boolean;
  supportsInstant: boolean;
  supportsPartial: boolean;
  supportsReversal: boolean;
}

export interface PayoutProviderResult {
  success: boolean;
  providerReference?: string;
  bankReference?: string;
  error?: string;
}

export interface PayoutReservation {
  id: string;
  batchId: string;
  partnerId: string;
  commissionEntryId: string;
  amount: number;
  status: "reserved" | "settled" | "released";
  createdAt: string;
  settledAt?: string;
  releasedAt?: string;
}

export interface PayoutQuery {
  partnerId?: string;
  status?: PayoutStatus;
  provider?: PayoutProviderType;
  createdAfter?: string;
  createdBefore?: string;
  minAmount?: number;
  maxAmount?: number;
  limit?: number;
  offset?: number;
}

export interface PayoutSummary {
  partnerId: string;
  totalBatches: number;
  totalAmount: number;
  totalFee: number;
  totalNet: number;
  pendingCount: number;
  completedCount: number;
  failedCount: number;
  currency: string;
}
