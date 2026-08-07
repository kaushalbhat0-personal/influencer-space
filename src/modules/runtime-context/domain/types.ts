// ── Unified Runtime Context — Domain Types ─────────────────
// RCCF-INTEGRATION-01. One request-scoped context that carries every runtime's
// output, assembled from a SINGLE WebsiteAggregate build. Every consumer reads
// this context instead of rebuilding data. Zero global state, performance only.

import type {
  KnowledgeSnapshot,
  KnowledgeRuntimeResult,
  StorefrontScore,
} from "@/modules/knowledge-runtime";
import type { GoalRuntimeResult } from "@/modules/goals-runtime";
import type { Recommendation } from "@/modules/recommendation-runtime";
import type { CreatorSuccessData } from "@/lib/creator-success/runtime";
import type { HealthReport } from "@/lib/platform/health/engine";
import type { DashboardMetrics } from "@/features/dashboard/types";

export interface RuntimeContext {
  tenantId: string;
  /** Single WebsiteAggregate snapshot — built ONCE per request. */
  snapshot: KnowledgeSnapshot;
  /** Knowledge Runtime result (score, questions, hints, pack). */
  knowledge: KnowledgeRuntimeResult;
  /** Goals Runtime result (profile, alignment, milestones, ordering). */
  goals: GoalRuntimeResult;
  /** Success Runtime (milestones, completion %, next task). */
  success: CreatorSuccessData | null;
  /** Recommendation Runtime (scored next actions). */
  recommendations: Recommendation[];
  /** Storefront Quality Score including the Goal Alignment dimension. */
  storefrontScore: StorefrontScore;
  /** Platform health engine report. */
  health: HealthReport;
  /** Canonical dashboard metrics. */
  metrics: DashboardMetrics;
  /** Intelligence-derived metrics (from the recommendation context — no extra query). */
  intelligence: {
    publishState: string | null;
    published: boolean;
    analyticsActive: boolean;
  };
}
