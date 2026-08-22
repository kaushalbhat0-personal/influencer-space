// RCCF-72.18D.5.2-B — Order Presentation Helpers.
// Pure, deterministic, presentation-only. No database, no server actions.
// Reuses the canonical vocabularies — never a second status enum, never an
// invented fulfillment state, never a renamed refund state. The D.5.1 ledger
// meaning is preserved: refundAmount is ACTUAL refunded paise (never a
// reservation — PENDING is the in-flight marker).

import type { BadgeVariant } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import { toMinorUnits } from "@/lib/commission/constants";
import { canTransition, getFulfillmentStrategy, statusLabel } from "@/modules/fulfillment/application/strategies";
import type { FulfillmentStatus } from "@/modules/fulfillment/domain/types";

// ── Order payment status ─────────────────────────────────────────────
// Canonical ProductOrder vocabulary written by the platform:
//   PENDING  ← checkout creation
//   COMPLETED← completeProductOrder (RCCF-38 canonical boundary)
// No other order status is ever written (dead "PAID" was removed in D.5.2-A).
export interface OrderStatusPresentation {
  label: string;
  badgeVariant: BadgeVariant;
}

const ORDER_STATUS_PRESENTATION: Record<string, OrderStatusPresentation> = {
  PENDING: { label: "Pending", badgeVariant: "warning" },
  COMPLETED: { label: "Paid", badgeVariant: "success" },
};

export function getOrderStatusPresentation(status: string): OrderStatusPresentation {
  return ORDER_STATUS_PRESENTATION[status] ?? { label: status, badgeVariant: "default" };
}

// ── Refund status ────────────────────────────────────────────────────
// Exact RefundStatus enum vocabulary (prisma schema): NONE | PENDING |
// PARTIAL | REFUNDED | FAILED. Labels never imply reservation semantics.
export const REFUND_STATUS_PRESENTATION: Record<string, OrderStatusPresentation> = {
  NONE: { label: "No refund", badgeVariant: "default" },
  PENDING: { label: "Refund in progress", badgeVariant: "info" },
  PARTIAL: { label: "Partially refunded", badgeVariant: "gold" },
  REFUNDED: { label: "Refunded", badgeVariant: "info" },
  FAILED: { label: "Refund failed", badgeVariant: "danger" },
};

export function getRefundStatusPresentation(status: string): OrderStatusPresentation {
  return REFUND_STATUS_PRESENTATION[status] ?? { label: status, badgeVariant: "default" };
}

// ── Money ────────────────────────────────────────────────────────────

/** Minor units (paise) → ₹ display, matching every other money surface. */
export function formatPaise(paise: number): string {
  return formatCurrency(paise / 100);
}

/** Stored rupee amount → ₹ display. */
export function formatOrderAmount(amount: number): string {
  return formatCurrency(amount);
}

// ── Dates ────────────────────────────────────────────────────────────

export function formatOrderDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── RCCF-72.18D.5.2-C — fulfillment controls (presentation only) ─────
// Candidate buttons for the order drawer, derived from the CANONICAL
// transition table in @/modules/fulfillment — never a second state machine.
// The UI uses this ONLY to decide what to render; the server action re-validates
// role, tenant, and transition legality authoritatively on every mutation.
// Scope: forward progression for physical orders. Cancellation/return
// lifecycles are a deferred RCCF; digital/course/service/booking fulfillments
// keep their existing dedicated surfaces (download links / queue actions).
const PHYSICAL_PROGRESSION: FulfillmentStatus[] = ["preparing", "packed", "shipped", "delivered"];

export function getFulfillmentControls(fulfillmentType: string, status: string): Array<{ status: FulfillmentStatus; label: string }> {
  if (fulfillmentType !== "physical") return [];
  const strategy = getFulfillmentStrategy("physical");
  return PHYSICAL_PROGRESSION.filter((next) => canTransition(strategy, status as FulfillmentStatus, next))
    .map((next) => ({ status: next, label: `Mark as ${statusLabel(next)}` }));
}

// ── RCCF-72.18D.5.2-D — refund initiation presentation ───────────────
// Pure helpers only: the D.3/D.4 server actions remain fully authoritative.

/**
 * Parses a user-typed rupee amount into integer paise using the repository's
 * canonical minor-unit conversion (toMinorUnits). Strictly rejects anything
 * that is not a plain positive currency value with at most two decimals —
 * fractional paise are rejected, never rounded.
 */
export type RefundAmountParseResult =
  | { ok: true; paise: number }
  | { ok: false; reason: "empty" | "invalid-format" | "fractional-paise" | "non-positive" | "exceeds-remaining" };

const REFUND_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

export function parseRefundAmountInput(raw: string, maxPaise: number): RefundAmountParseResult {
  const trimmed = raw.trim().replace(/[₹,\s]/g, "");
  if (!trimmed) return { ok: false, reason: "empty" };
  if (/^\d+\.\d{3,}$/.test(trimmed)) return { ok: false, reason: "fractional-paise" };
  if (!REFUND_AMOUNT_PATTERN.test(trimmed)) return { ok: false, reason: "invalid-format" };
  const paise = toMinorUnits(Number(trimmed));
  if (!Number.isFinite(paise) || paise <= 0) return { ok: false, reason: "non-positive" };
  if (paise > maxPaise) return { ok: false, reason: "exceeds-remaining" };
  return { ok: true, paise };
}

/**
 * Maps the documented D.3/D.4 result codes to safe human-readable messages.
 * Unknown codes degrade to a generic message — provider/Prisma internals must
 * never reach the UI. Failure wording reflects the actual D.4 contract:
 * failed executions write ONLY refundStatus=FAILED (D.5.1), so headroom is
 * preserved and retryable.
 */
const REFUND_ERROR_PRESENTATIONS: Record<string, string> = {
  NOT_FOUND: "Order not found.",
  UNAUTHORIZED: "You are not allowed to refund this order.",
  FORBIDDEN: "You are not allowed to refund this order.",
  INVALID_STRATEGY: "This order cannot be refunded through the creator-direct path.",
  MISSING_PAYMENT_ACCOUNT: "This order has no payment account binding and cannot be refunded here.",
  INVALID_PAYMENT_ACCOUNT: "The payment account bound to this order cannot process refunds.",
  UNAUTHORIZED_PROVIDER: "The payment account keys for this order are not usable for refunds.",
  NO_CAPTURED_PAYMENT: "There is no captured payment on this order to refund.",
  INVALID_ORDER_STATUS: "Only completed orders can be refunded.",
  INVALID_REFUND_STATE: "This order is not currently in a refundable state.",
  REFUND_IN_PROGRESS: "A refund is already in progress for this order.",
  AMOUNT_EXCEEDS_REMAINING: "The entered amount exceeds the remaining refundable amount.",
  CONCURRENT_MODIFICATION: "The refund state changed while you were working. The latest state is shown below.",
  INVALID_AMOUNT: "Enter a valid refund amount.",
  PROVIDER_NOT_SUPPORTED: "Refunds are not supported for this payment provider yet.",
  PROVIDER_ERROR: "The refund attempt failed. The remaining amount stays available to retry.",
  INVALID_REQUEST: "The payment provider rejected the refund. Please verify the details and retry.",
};

export function getRefundErrorMessage(code?: string): string {
  if (code && REFUND_ERROR_PRESENTATIONS[code]) return REFUND_ERROR_PRESENTATIONS[code];
  return "Something went wrong. Please try again.";
}
