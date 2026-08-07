import { requireTenant } from "@/lib/auth/require-tenant";
import { knowledgeScoreService } from "@/modules/knowledge-runtime";
import { KnowledgeDashboard } from "@/modules/knowledge-runtime/presentation/knowledge-dashboard";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const session = await requireTenant();
  const runtime = await knowledgeScoreService.evaluate(session.tenantId);

  return <KnowledgeDashboard initial={runtime} />;
}
