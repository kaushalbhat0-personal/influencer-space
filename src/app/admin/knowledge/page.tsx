import { requireTenant } from "@/lib/auth/require-tenant";
import { knowledgeScoreService } from "@/modules/knowledge-runtime";
import { goalRuntime } from "@/modules/goals-runtime";
import { computeGoalAlignment } from "@/modules/goals-runtime";
import { recommendationRuntime } from "@/modules/recommendation-runtime";
import { KnowledgeDashboard } from "@/modules/knowledge-runtime/presentation/knowledge-dashboard";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await requireTenant();

  // RCCF-EPIC-06: the knowledge dashboard shows Recommended Improvements
  // (ordered by impact) instead of a flat list of missing fields.
  const [runtime, goals, recommendations] = await Promise.all([
    knowledgeScoreService.evaluate(session.tenantId),
    goalRuntime.evaluate(session.tenantId),
    recommendationRuntime.getRecommendations(session.tenantId),
  ]);

  const alignment = computeGoalAlignment(goals.activeProfile, goals.snapshot);

  return (
    <KnowledgeDashboard
      initial={runtime}
      goalAlignment={alignment.items.length > 0 ? { label: "Goal Alignment", percent: alignment.overall } : null}
      recommendations={recommendations}
    />
  );
}
