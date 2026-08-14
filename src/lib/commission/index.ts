// ── LEGACY / NON-AUTHORITATIVE (RCCF-57) ─────────────────────────────────────
// The in-memory ruleEngine + commissionLedger below are legacy diagnostic
// helpers (rehydrated by the Super Admin ops dashboard). They CANNOT influence
// real financial decisions: the canonical commission truth is
// src/lib/commission/runtime.ts, which records CommissionEntry + PartnerLedger
// rows directly through Prisma. Do not use these exports for new financial
// logic.
export { commissionService } from "./service";
export type { CommissionService } from "./service";
export { ruleEngine } from "./rules";
export type { RuleEngine } from "./rules";
export { commissionLedger } from "./ledger";
export type { CommissionLedger } from "./ledger";
export { calculateCommission, computeBalanceImpact } from "./calculator";

export * from "./constants";
export type * from "./types";

export {
  validateRuleType, validateRuleStatus, validatePercent,
  validateCurrency, validateMinorUnits, validateCreateRule,
  validateCommissionEntry,
} from "./validation";

export { buildCommissionSummary, aggregateByType, aggregateByStatus, totalPartnerShareForPeriod } from "./queries";

export {
  formatCommissionSummary, formatMoney, formatPercent,
  balanceToSummary, ruleToLabel, defaultRule,
} from "./mapper";

export {
  getActiveClientCount, getLoyaltyTiers, tierForCount,
  resolveLoyaltyTier, getLoyaltyProgress,
} from "./loyalty";
export type { LoyaltyTierRow, LoyaltyProgress } from "./loyalty";
