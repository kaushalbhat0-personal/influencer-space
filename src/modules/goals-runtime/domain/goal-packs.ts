// ── Goal Packs (Phase 3) ────────────────────────────────────
// Base goal weights per entity type. The recommendation engine starts from
// these deterministic priors and adjusts them with live knowledge signals.
// Keys are the knowledge-runtime entity packs (fitness, restaurant, …).

import type { GoalId } from "./types";

export interface GoalPack {
  entityType: string;
  /** base weights — do not need to sum to 100 (normalized by the engine). */
  weights: Array<{ goalId: GoalId; weight: number; reason: string }>;
}

export const GOAL_PACKS: GoalPack[] = [
  {
    entityType: "fitness",
    weights: [
      { goalId: "GET_BOOKINGS", weight: 40, reason: "Fitness creators convert on booked sessions." },
      { goalId: "BUILD_EMAIL_LIST", weight: 15, reason: "Email retains clients between programs." },
      { goalId: "SELL_PRODUCTS", weight: 15, reason: "Programs and plans are natural digital products." },
      { goalId: "SHOW_PORTFOLIO", weight: 10, reason: "Transformations prove results." },
      { goalId: "INCREASE_TRUST", weight: 10, reason: "Certifications and results build trust." },
    ],
  },
  {
    entityType: "restaurant",
    weights: [
      { goalId: "GET_BOOKINGS", weight: 45, reason: "Restaurants convert on reservations." },
      { goalId: "SELL_PRODUCTS", weight: 20, reason: "Menu items can be ordered online." },
      { goalId: "PROMOTE_EVENTS", weight: 15, reason: "Events fill tables during off-peak hours." },
      { goalId: "BUILD_EMAIL_LIST", weight: 10, reason: "Email keeps regulars coming back." },
    ],
  },
  {
    entityType: "photography",
    weights: [
      { goalId: "SHOW_PORTFOLIO", weight: 40, reason: "A portfolio is the strongest sales tool." },
      { goalId: "GET_BOOKINGS", weight: 25, reason: "Photographers sell booked sessions." },
      { goalId: "SELL_PRODUCTS", weight: 15, reason: "Packages and print sales monetize the work." },
      { goalId: "FIND_CLIENTS", weight: 10, reason: "Inbound client enquiries." },
    ],
  },
  {
    entityType: "designer",
    weights: [
      { goalId: "SHOW_PORTFOLIO", weight: 35, reason: "Case studies win design clients." },
      { goalId: "FIND_CLIENTS", weight: 25, reason: "Designers need inbound leads." },
      { goalId: "SELL_SERVICES", weight: 20, reason: "Clear service packages close deals." },
      { goalId: "SELL_PRODUCTS", weight: 10, reason: "Digital products diversify revenue." },
    ],
  },
  {
    entityType: "educator",
    weights: [
      { goalId: "SELL_COURSES", weight: 45, reason: "Educators monetize with courses." },
      { goalId: "BUILD_EMAIL_LIST", weight: 20, reason: "Email nurtures students." },
      { goalId: "BUILD_COMMUNITY", weight: 15, reason: "Community drives course referrals." },
      { goalId: "GROW_YOUTUBE", weight: 10, reason: "Content attracts new students." },
    ],
  },
  {
    entityType: "creator",
    weights: [
      { goalId: "MONETIZE_CONTENT", weight: 25, reason: "Creators monetize audiences directly." },
      { goalId: "GROW_YOUTUBE", weight: 20, reason: "Platform growth expands the audience." },
      { goalId: "BUILD_EMAIL_LIST", weight: 15, reason: "Owned audience reduces platform risk." },
      { goalId: "BUILD_BRAND", weight: 15, reason: "A strong brand attracts sponsors." },
      { goalId: "INCREASE_TRUST", weight: 10, reason: "Proof turns viewers into buyers." },
      { goalId: "SHOW_PORTFOLIO", weight: 10, reason: "Content showcases the creator's work." },
    ],
  },
];

export function getBaseWeights(entityType: string): GoalPack["weights"] {
  const pack = GOAL_PACKS.find((p) => p.entityType === entityType);
  return pack?.weights ?? GOAL_PACKS[GOAL_PACKS.length - 1]!.weights;
}
