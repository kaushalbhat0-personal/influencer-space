// ── Recommendation Runtime — Domain Types ──────────────────
// RCCF-EPIC-06. Answers "what should you do next?" by continuously analyzing
// every creator's business from EXISTING runtimes only — Knowledge, Goals,
// Success, Commerce, Experience, Storefront Quality and Dashboard Metrics.
//
// The runtime never owns data and never invents recommendations. It computes
// the highest-impact next action, deterministically.

import type { KnowledgeSnapshot, KnowledgeScore, StorefrontScore } from "@/modules/knowledge-runtime";
import type { GoalCounts, GoalProfile } from "@/modules/goals-runtime";
import type { CreatorSuccessData } from "@/lib/creator-success/runtime";

export type RecommendationCategory =
  | "critical"
  | "high_impact"
  | "quick_win"
  | "growth"
  | "optimization"
  | "advanced";

export const RECOMMENDATION_CATEGORY_LABELS: Record<RecommendationCategory, string> = {
  critical: "Critical",
  high_impact: "High Impact",
  quick_win: "Quick Wins",
  growth: "Growth",
  optimization: "Optimization",
  advanced: "Advanced",
};

export type RecommendationStatus = "dismissed" | "completed" | "ignored" | "accepted";

/** Expected storefront-quality deltas this recommendation unlocks (Phase 8). */
export interface ExpectedImpact {
  knowledge?: number;
  content?: number;
  commerce?: number;
  brand?: number;
  seo?: number;
  trust?: number;
  accessibility?: number;
  goalAlignment?: number;
}

export interface RecommendationMetrics {
  productCount: number;
  orderCount: number;
  bookingCount: number;
  galleryCount: number;
  testimonialCount: number;
  courseCount: number;
  serviceCount: number;
  faqCount: number;
  timelineCount: number;
  affiliateLinkCount: number;
  contentFeedCount: number;
  publishState: string | null;
  published: boolean;
  analyticsActive: boolean;
}

/** Everything the engine reads — assembled only from existing runtimes. */
export interface RecommendationContext {
  snapshot: KnowledgeSnapshot;
  activeProfile: GoalProfile | null;
  success: CreatorSuccessData | null;
  storefront: StorefrontScore;
  knowledgeScore: KnowledgeScore;
  metrics: RecommendationMetrics;
  counts: GoalCounts;
}

export interface RecommendationDefinition {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  /** 1 = highest base priority. */
  priority: 1 | 2 | 3 | 4 | 5;
  estimatedTime: number;
  expectedImpact: ExpectedImpact;
  /** Recommendation ids that must be complete before this one. */
  prerequisites: string[];
  /** goalId → affinity (0-1). Drives goal alignment in scoring. */
  goalAffinity: Record<string, number>;
  /** Knowledge field ids this recommendation closes. */
  knowledgeDependencies: string[];
  /** Success milestone ids related (Phase 10 — no duplicate logic). */
  successDependencies: string[];
  storefrontDimensionsAffected: Array<keyof ExpectedImpact>;
  dashboardAction: { label: string; href: string };
  /** Builder section base id this recommendation applies to (null = global). */
  builderAction: { label: string; moduleId: string | null };
  adminHref: string;
  when: (ctx: RecommendationContext) => boolean;
  done: (ctx: RecommendationContext) => boolean;
  reason: (ctx: RecommendationContext) => string;
}

export interface RecommendationHistoryEntry {
  status: RecommendationStatus;
  shownAt?: string;
  completedAt?: string;
  dismissedAt?: string;
  ignoredAt?: string;
  /** Scores recorded when the recommendation was completed (Phase 12). */
  completedScores?: {
    knowledge: number;
    goalAlignment: number;
    storefront: number;
  };
}

export type RecommendationHistory = Record<string, RecommendationHistoryEntry>;

export interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: RecommendationCategory;
  categoryLabel: string;
  priority: number;
  estimatedTime: number;
  /** 0-100 deterministic priority score. */
  score: number;
  expectedImpact: ExpectedImpact;
  storefrontLift: number;
  /** Expected Business Health lift (RCCF-EPIC-07). */
  healthLift: number;
  goalAffinity: string[];
  missingKnowledge: string[];
  reasons: string[];
  actions: {
    dashboard: { label: string; href: string };
    builder: { label: string; moduleId: string | null };
    adminHref: string;
  };
  history: { status?: RecommendationStatus; shownAt?: string } | null;
}

export interface RecommendationAnalytics {
  totals: {
    suggested: number;
    completed: number;
    dismissed: number;
    creatorsWithRecommendations: number;
  };
  perRecommendation: Array<{
    id: string;
    title: string;
    suggested: number;
    completed: number;
    dismissed: number;
    completionRate: number;
    avgCompletionMinutes: number | null;
    expectedLift: { knowledge: number; goalAlignment: number; storefront: number };
  }>;
}
