import { industryRegistry } from "@/lib/creation/industry/registry";
import { styleRegistry } from "@/lib/creation/style/registry";
import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import { CreationWizardClient } from "./_components/creation-wizard-client";

export const dynamic = "force-dynamic";

// RCCF-68.2 — gallery → wizard handoff. `/admin/blueprints` pushes
// `/admin/create?blueprint=<id>`. Validate the id against the CANONICAL
// blueprint registry server-side and pass only a real blueprint id to the
// client. An invalid/unknown id falls back to the normal wizard flow (truthful
// fallback — never executes arbitrary template data).
export default async function CreatePage({ searchParams }: { searchParams: { blueprint?: string } }) {
  const industries = industryRegistry.getAll();
  const styles = styleRegistry.getAll();
  const blueprints = blueprintRegistry.getAll();
  const themes = themeRegistry.getAll();

  const requestedBlueprint = searchParams.blueprint;
  const initialBlueprintId = requestedBlueprint && blueprintRegistry.getById(requestedBlueprint) ? requestedBlueprint : null;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Create Your Website</h1>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Answer a few questions and we&apos;ll build your website.</p>
      </div>
      <CreationWizardClient
        industries={industries}
        styles={styles}
        blueprints={blueprints}
        themes={themes}
        initialBlueprintId={initialBlueprintId}
      />
    </div>
  );
}
