import { requireTenant } from "@/lib/auth/require-tenant";
import { knowledgeScoreService } from "@/modules/knowledge-runtime";
import { goalRuntime } from "@/modules/goals-runtime";
import { computeGoalAlignment } from "@/modules/goals-runtime";
import { KnowledgeDashboard } from "@/modules/knowledge-runtime/presentation/knowledge-dashboard";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await requireTenant();
  const runtime = await knowledgeScoreService.evaluate(session.tenantId);

  // RCCF-EPIC-05: goals compose with knowledge — the knowledge dashboard also
  // shows Goal Alignment (a storefront-quality dimension).
  const goals = await goalRuntime.evaluate(session.tenantId);
  const alignment = computeGoalAlignment(goals.activeProfile, goals.snapshot);

  return (
    <KnowledgeDashboard
      initial={runtime}
      goalAlignment={alignment.items.length > 0 ? { label: "Goal Alignment", percent: alignment.overall } : null}
    />
  );
}
