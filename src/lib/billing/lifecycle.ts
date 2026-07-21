/**
 * Billing v2 — Subscription Lifecycle State Machine
 *
 * Validates legal state transitions.
 * Illegal transitions throw.
 *
 * States:
 *   DRAFT → ACTIVE (or TRIALING)
 *   TRIALING → ACTIVE (or EXPIRED)
 *   ACTIVE → PAST_DUE (or CANCELLED)
 *   PAST_DUE → ACTIVE (or CANCELLED, or EXPIRED)
 *   CANCELLED → ACTIVE (reactivation)
 *   ACTIVE → EXPIRED (end of term)
 */

import type { SubscriptionStatus } from "./types";

export const LIFECYCLE_STATES: SubscriptionStatus[] = [
  "DRAFT",
  "TRIALING",
  "ACTIVE",
  "PAST_DUE",
  "CANCELLED",
  "EXPIRED",
];

interface Transition {
  from: SubscriptionStatus[];
  to: SubscriptionStatus;
}

const LEGAL_TRANSITIONS: Transition[] = [
  { from: ["DRAFT"],                    to: "ACTIVE" },
  { from: ["DRAFT"],                    to: "TRIALING" },
  { from: ["TRIALING"],                 to: "ACTIVE" },
  { from: ["TRIALING"],                 to: "EXPIRED" },
  { from: ["TRIALING"],                 to: "CANCELLED" },
  { from: ["ACTIVE"],                   to: "PAST_DUE" },
  { from: ["ACTIVE"],                   to: "CANCELLED" },
  { from: ["ACTIVE"],                   to: "EXPIRED" },
  { from: ["PAST_DUE"],                 to: "ACTIVE" },
  { from: ["PAST_DUE"],                 to: "CANCELLED" },
  { from: ["PAST_DUE"],                 to: "EXPIRED" },
  { from: ["CANCELLED"],                to: "ACTIVE" },
  { from: ["EXPIRED"],                  to: "ACTIVE" },
  { from: ["CANCELLED", "EXPIRED"],     to: "DRAFT" },
];

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return LEGAL_TRANSITIONS.some((t) => t.from.includes(from) && t.to === to);
}

export function validateTransition(from: SubscriptionStatus, to: SubscriptionStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(
      `Illegal subscription state transition: "${from}" → "${to}"`
    );
  }
}

export function getAllowedTransitions(from: SubscriptionStatus): SubscriptionStatus[] {
  return LEGAL_TRANSITIONS
    .filter((t) => t.from.includes(from))
    .map((t) => t.to);
}
