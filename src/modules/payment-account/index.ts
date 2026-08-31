// ── Payment Account — Public API ────────────────────────────
export { PAYMENT_PROVIDERS, getPaymentProviderAdapter, getPaymentProviderLabel } from "./providers/registry";
export type { PaymentProviderAdapter, PaymentCheckoutInput, PaymentCheckoutResult, PaymentVerificationInput, PaymentVerificationResult, PaymentRefundInput, PaymentRefundResult, PaymentAccountStatusResult } from "./providers/types";
export {
  getPaymentAccount,
  getAllPaymentAccounts,
  getActivePaymentAccount,
  savePaymentAccount,
  setActiveProvider,
  verifyPaymentAccount,
  disconnectPaymentAccount,
  computePaymentReadiness,
  getPaymentHealth,
} from "./application/runtime";
export type {
  PaymentAccountData,
  PaymentAccountInput,
  PaymentProviderId,
  PaymentAccountStatus,
  VerificationStatus,
  SettlementMode,
  PaymentReadiness,
  PaymentReadinessReport,
} from "./domain/types";
