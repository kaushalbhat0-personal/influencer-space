import { requireTenant } from "@/lib/auth/require-tenant";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import { GoalsSettingsPage } from "@/modules/goals-runtime/presentation/goals-settings-page";

export const dynamic = "force-dynamic";

export default async function GoalsPage() {
  const session = await requireTenant();

  // RCCF-INTEGRATION-01: one RuntimeContext build feeds the goals page.
  const context = await runtimeContextBuilder.build(session.tenantId);
  const { profile, activeProfile, recommendations, alignment, builderSuggestions, dashboard, counts, milestones, commercePriority } = context.goals;

  return (
    <GoalsSettingsPage
      initial={{
        profile,
        activeProfile,
        recommendations,
        alignment,
        builderSuggestions,
        dashboard,
        counts,
        milestones,
        commercePriority,
      }}
    />
  );
}
