import { industryRegistry } from "@/lib/creation/industry/registry";
import { styleRegistry } from "@/lib/creation/style/registry";
import { blueprintRegistry } from "@/lib/blueprint/registry";
import { themeRegistry } from "@/lib/theme/registry-new";
import { CreationWizardClient } from "./_components/creation-wizard-client";

export const dynamic = "force-dynamic";

export default async function CreatePage() {
  const industries = industryRegistry.getAll();
  const styles = styleRegistry.getAll();
  const blueprints = blueprintRegistry.getAll();
  const themes = themeRegistry.getAll();

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Create Your Website</h1>
        <p className="mt-1 text-sm text-gray-400">Answer a few questions and we&apos;ll build your website.</p>
      </div>
      <CreationWizardClient
        industries={industries}
        styles={styles}
        blueprints={blueprints}
        themes={themes}
      />
    </div>
  );
}
