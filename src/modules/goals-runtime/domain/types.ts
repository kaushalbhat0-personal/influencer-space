// ── Creator Goals Runtime — Domain Types ───────────────────
// RCCF-EPIC-05. Goals answer "what are you trying to achieve?" — they COMPOSE
// with knowledge ("who are you?"), never replace it. Goals are modelled as a
// WEIGHTED PROFILE (primary/secondary/optional = relative weights summing to
// 100) so homepage ordering, navigation, Builder suggestions and future
// recommendation engines can make nuanced decisions.

import type { MissingField } from "@/modules/knowledge-runtime";

export type GoalCategory = "conversion" | "revenue" | "audience" | "brand" | "engagement";

export type GoalId =
  | "GET_BOOKINGS"
  | "SELL_PRODUCTS"
  | "SELL_COURSES"
  | "SELL_SERVICES"
  | "BUILD_EMAIL_LIST"
  | "GROW_YOUTUBE"
  | "BUILD_COMMUNITY"
  | "SHOW_PORTFOLIO"
  | "GENERATE_LEADS"
  | "PROMOTE_EVENTS"
  | "FIND_CLIENTS"
  | "BUILD_BRAND"
  | "INCREASE_TRUST"
  | "MONETIZE_CONTENT";

/** Which commerce surface a goal makes primary. */
export type CommerceSurface = "products" | "bookings" | "courses" | "services";

/** Counts the Goal Runtime can read about a creator (deterministic checks). */
export interface GoalCounts {
  products: number;
  bookings: number;
  orders: number;
  courses: number;
  services: number;
  testimonials: number;
  gallery: number;
  timeline: number;
  faq: number;
  contentFeed: number;
  affiliateLinks: number;
}

export interface GoalMilestoneStep {
  id: string;
  label: string;
  description: string;
  action: string;
  href: string;
  category: "setup" | "growth" | "conversion";
  done: (counts: GoalCounts) => boolean;
}

export interface GoalSuggestionTemplate {
  /** Knowledge-runtime field id this suggestion targets. */
  knowledgeField: string;
  /** Builder section module base id (hero, products, gallery…). */
  moduleId: string;
  title: string;
  message: string;
  href: string;
  severity: "info" | "warning" | "critical";
}

export interface GoalDefinition {
  id: GoalId;
  label: string;
  description: string;
  /** Lucide icon name key — mapped to a component in presentation. */
  icon: string;
  category: GoalCategory;
  /** Default priority (lower = recommended sooner). */
  priority: number;
  /** Entity types (knowledge packs) this goal primarily applies to; empty = all. */
  applicableTypes: string[];
  /** Blueprint section base ids this goal surfaces. */
  supportedSections: string[];
  /** Preferred homepage order for this goal (most → least important). */
  sectionOrderHint: string[];
  /** Preferred nav order for this goal (most → least important). */
  navigationPriority: string[];
  /** Recommended dashboard quick actions for this goal. */
  dashboardRecommendations: string[];
  /** Which commerce surface this goal leads with. */
  commercePriority: CommerceSurface | null;
  /** SEO focus this goal implies. */
  seoPriority: "local" | "commerce" | "content" | "portfolio" | "trust";
  /** Knowledge-runtime field ids that build toward this goal. */
  supportingKnowledge: string[];
  /** Goal-aware milestone plan (Phase 9). */
  milestonePath: GoalMilestoneStep[];
  /** Contextual Builder suggestions (Phase 7). */
  suggestions: GoalSuggestionTemplate[];
}

/** A single weighted goal within a profile. */
export interface GoalWeight {
  goalId: GoalId;
  weight: number;
}

/**
 * Canonical goal profile. Weights are relative (0–100) and sum to ≤ 100.
 * Primary goal = highest weight. The weighted model lets creators evolve
 * (coaching-first → products-first) by changing weights, not the model.
 */
export interface GoalProfile {
  weights: GoalWeight[];
  updatedAt: string;
  source: "recommended" | "manual";
  entityType: string;
}

export interface GoalRecommendation {
  goalId: GoalId;
  weight: number;
  reason: string;
}

export interface GoalAlignmentItem {
  goalId: GoalId;
  label: string;
  weight: number;
  /** Supporting knowledge fields complete. */
  supported: number;
  total: number;
  percent: number;
}

export interface GoalAlignment {
  items: GoalAlignmentItem[];
  /** 0-100 weighted alignment across the profile. */
  overall: number;
}

export interface GoalDashboardPrimary {
  goalId: GoalId;
  label: string;
  icon: string;
  weight: number;
  progress: number;
  missing: MissingField[];
  cta: { label: string; href: string } | null;
  recommendations: number;
}

export interface GoalDashboardData {
  primary: GoalDashboardPrimary;
  secondary: Array<{ goalId: GoalId; label: string; weight: number; progress: number }>;
  commercePriority: CommerceSurface | null;
}

export interface GoalBuilderSuggestion {
  goalId: GoalId;
  goalLabel: string;
  goalIcon: string;
  title: string;
  message: string;
  moduleId: string;
  href: string;
  severity: "info" | "warning" | "critical";
}
