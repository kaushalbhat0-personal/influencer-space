// ── Commerce Ordering (Phase 8) ─────────────────────────────
// Commerce ordering adapts to goals: booking-first creators lead with
// bookings, products-first with products, courses-first with courses. This is
// a deterministic, registry-derived surface that consumers (dashboard quick
// cards, navigation, future recommendation runtime) can use.

import type { CommerceSurface, GoalProfile } from "../domain/types";
import { getGoal } from "../domain/registry";
import { primaryGoal } from "./weights";

export type { CommerceSurface } from "../domain/types";

export const COMMERCE_SURFACE_LABELS: Record<CommerceSurface, string> = {
  products: "Products",
  bookings: "Bookings",
  courses: "Courses",
  services: "Services",
};

/** Which commerce surface the profile leads with (null = no commerce goal). */
export function commercePriority(profile: GoalProfile | null): CommerceSurface | null {
  if (!profile) return null;
  for (const weight of profile.weights) {
    const goal = getGoal(weight.goalId);
    if (goal?.commercePriority) return goal.commercePriority;
  }
  return null;
}

/**
 * Rank of a surface for a profile (0 = primary). Non-commerce surfaces always
 * rank after commerce surfaces.
 */
export function commerceRank(surface: CommerceSurface, profile: GoalProfile | null): number {
  if (!profile) return 1;
  const primary = commercePriority(profile);
  const primaryIndex = surface === primary ? 0 : 1;
  const order: CommerceSurface[] = ["bookings", "products", "courses", "services"];
  const surfaceIndex = order.indexOf(surface);
  return primaryIndex * 10 + (surfaceIndex >= 0 ? surfaceIndex : 99);
}

/**
 * Reorder a list of items by commerce affinity. `keyOf` maps an item to a
 * surface ("products" | "bookings" | "courses" | "services") or null.
 */
export function applyCommerceOrder<T>(
  items: T[],
  profile: GoalProfile | null,
  keyOf: (item: T) => CommerceSurface | null,
): T[] {
  if (!profile || profile.weights.length === 0) return items;
  const commerceItems = items.filter((i) => keyOf(i) !== null);
  const otherItems = items.filter((i) => keyOf(i) === null);
  const ordered = [...commerceItems].sort((a, b) => {
    const ra = commerceRank(keyOf(a)!, profile);
    const rb = commerceRank(keyOf(b)!, profile);
    return ra - rb;
  });
  return [...ordered, ...otherItems];
}

export function primaryGoalSummary(profile: GoalProfile | null): { goalId: string; weight: number } | null {
  const primary = primaryGoal(profile);
  return primary ? { goalId: primary.goalId, weight: primary.weight } : null;
}
