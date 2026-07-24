export type {
  BillingAccount,
  PlanDefinition,
  PlanFamily,
  PlanCycle,
  PlanStatus,
  FeatureDefinition,
  FeatureValue,
  FeatureValueType,
  SubscriptionState,
  SubscriptionStatus,
  EntitlementCheck,
  CheckoutParams,
  CheckoutResult,
  BillingProvider,
} from "../domain/types";

export { FEATURES, PLANS, RESERVED_CODES } from "../domain/plan-catalog";
export { EntitlementService, entitlement } from "./entitlements";
export { FeatureGateService, featureGate } from "./feature-gate";
export { billingProviders } from "../infrastructure/provider";
export { razorpayProvider } from "../infrastructure/providers/razorpay";
export { v2FeatureGate } from "../infrastructure/compat";
export {
  canTransition,
  validateTransition,
  getAllowedTransitions,
  LIFECYCLE_STATES,
} from "../domain/lifecycle";
export {
  statusAfterEvent,
} from "../domain/events";
export type { BillingEventType } from "../domain/events";
export { BillingIdempotency, billingIdempotency } from "../infrastructure/idempotency";
