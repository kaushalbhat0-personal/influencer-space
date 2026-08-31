// ── Payment Account — Domain Types ──────────────────────────
// RCCF-IMPLEMENTATION-74. The creator's canonical payment account for
// DIRECT_CREATOR commerce. CreatorStore is never in the money flow.

export type PaymentProviderId = "razorpay" | "stripe" | "phonepe" | "cashfree" | "payu" | "manual";
export type PaymentAccountStatus = "pending" | "active" | "disconnected";
/** RCCF-69.2 — `configured` = credentials/format validated (NOT provider-verified). */
export type VerificationStatus = "unverified" | "pending" | "configured" | "verified" | "failed";
export type SettlementMode = "upi" | "bank";

/** The canonical, non-secret payment account view (never exposes encrypted fields). */
export interface PaymentAccountData {
  id: string;
  tenantId: string;
  provider: PaymentProviderId;
  displayName: string | null;
  accountHolderName: string | null;
  merchantName: string | null;
  upiId: string | null;
  bankAccountName: string | null;
  hasBankAccountNumber: boolean;
  ifsc: string | null;
  settlementMode: SettlementMode;
  status: PaymentAccountStatus;
  verificationStatus: VerificationStatus;
  capabilities: Record<string, boolean>;
  hasProviderKeys: boolean;
  lastVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  providerAccountId: string | null;
  isActive: boolean;
}

export type PaymentReadiness = "ready" | "warning" | "blocked";

export interface PaymentReadinessReport {
  tenantId: string;
  readiness: PaymentReadiness;
  strategy: string;
  provider: PaymentProviderId | null;
  requirements: Array<{ key: string; label: string; met: boolean; severity: "required" | "optional" }>;
  missing: string[];
}

export interface PaymentAccountInput {
  provider?: PaymentProviderId;
  displayName?: string;
  accountHolderName?: string;
  merchantName?: string;
  upiId?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  ifsc?: string;
  settlementMode?: SettlementMode;
  providerKeyId?: string;
  providerKeySecret?: string;
  providerAccountId?: string;
  isActive?: boolean;
  capabilities?: Record<string, boolean>;
}
