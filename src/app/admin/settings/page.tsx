import { ContentContainer } from "@/components/layout";
import { SettingsService } from "@/services/settings.service";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { requireTenant } from "@/lib/auth/require-tenant";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { tenantId } = await requireTenant();

  const heroData = await SettingsService.getHeroData(tenantId);

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Hero</h1>
        <p className="mt-1 text-sm text-gray-400">
          Customize your hero section.
        </p>
      </div>
      <SettingsForm
        key={JSON.stringify({ heroData })}
        heroData={heroData}
        tenantId={tenantId}
      />
    </ContentContainer>
  );
}