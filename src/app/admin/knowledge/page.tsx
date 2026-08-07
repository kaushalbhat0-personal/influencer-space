import { requireTenant } from "@/lib/auth/require-tenant";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { KnowledgeDashboard } from "@/modules/knowledge-runtime/presentation/knowledge-dashboard";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await requireTenant();

  // RCCF-INTEGRATION-01: one RuntimeContext build feeds knowledge, goals
  // (goal alignment) and recommendations — a single WebsiteAggregate build.
  const context = await runtimeContextBuilder.build(session.tenantId);

  return (
    <KnowledgeDashboard
      initial={context.knowledge}
      goalAlignment={{ label: "Goal Alignment", percent: context.goals.alignment.overall }}
      recommendations={context.recommendations}
    />
  );
}
