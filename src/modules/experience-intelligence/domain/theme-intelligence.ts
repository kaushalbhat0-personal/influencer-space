// ── Theme Intelligence (Phase 11) ───────────────────────────
// Theme × Experience × Goals combine deterministically. Each primary goal
// implies an emphasis directive (whitespace / media / trust / content) — never
// hardcoded visual combinations in the theme runtime.

import type { GoalId, GoalProfile } from "@/modules/goals-runtime";
import { primaryGoal } from "@/modules/goals-runtime/application/weights";
import type { ThemeEmphasis } from "./types";

const EMPHASIS_BY_GOAL: Record<GoalId, ThemeEmphasis> = {
  GET_BOOKINGS: { whitespace: "medium", mediaEmphasis: "medium", trustEmphasis: "high", contentEmphasis: "medium" },
  SELL_PRODUCTS: { whitespace: "medium", mediaEmphasis: "high", trustEmphasis: "high", contentEmphasis: "medium" },
  SELL_COURSES: { whitespace: "medium", mediaEmphasis: "medium", trustEmphasis: "high", contentEmphasis: "high" },
  SELL_SERVICES: { whitespace: "medium", mediaEmphasis: "medium", trustEmphasis: "high", contentEmphasis: "medium" },
  BUILD_EMAIL_LIST: { whitespace: "medium", mediaEmphasis: "low", trustEmphasis: "medium", contentEmphasis: "high" },
  GROW_YOUTUBE: { whitespace: "compact", mediaEmphasis: "high", trustEmphasis: "medium", contentEmphasis: "high" },
  BUILD_COMMUNITY: { whitespace: "medium", mediaEmphasis: "medium", trustEmphasis: "high", contentEmphasis: "high" },
  SHOW_PORTFOLIO: { whitespace: "high", mediaEmphasis: "high", trustEmphasis: "medium", contentEmphasis: "medium" },
  GENERATE_LEADS: { whitespace: "compact", mediaEmphasis: "low", trustEmphasis: "high", contentEmphasis: "medium" },
  PROMOTE_EVENTS: { whitespace: "compact", mediaEmphasis: "high", trustEmphasis: "medium", contentEmphasis: "medium" },
  FIND_CLIENTS: { whitespace: "high", mediaEmphasis: "high", trustEmphasis: "high", contentEmphasis: "medium" },
  BUILD_BRAND: { whitespace: "high", mediaEmphasis: "medium", trustEmphasis: "high", contentEmphasis: "low" },
  INCREASE_TRUST: { whitespace: "high", mediaEmphasis: "low", trustEmphasis: "high", contentEmphasis: "medium" },
  MONETIZE_CONTENT: { whitespace: "compact", mediaEmphasis: "high", trustEmphasis: "medium", contentEmphasis: "medium" },
};

const DEFAULT_EMPHASIS: ThemeEmphasis = { whitespace: "medium", mediaEmphasis: "medium", trustEmphasis: "medium", contentEmphasis: "medium" };

export function themeEmphasisFor(profile: GoalProfile | null): ThemeEmphasis {
  const primary = primaryGoal(profile);
  return primary ? EMPHASIS_BY_GOAL[primary.goalId] ?? DEFAULT_EMPHASIS : DEFAULT_EMPHASIS;
}
