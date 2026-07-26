import { ContentContainer } from "@/components/layout";
import { SettingsService } from "@/services/settings.service";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { requireTenant } from "@/lib/auth/require-tenant";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { tenantId, role } = await requireTenant();

  const [config, heroData, tenantKeys] = await Promise.all([
    SettingsService.getInfluencerData(tenantId),
    SettingsService.getHeroData(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { youtubeApiKey: true, instagramApiKey: true },
    }),
  ]);

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Website Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Update your brand information below. Changes appear on the public site instantly.
        </p>
      </div>
      <SettingsForm
        key={JSON.stringify({ config, heroData })}
        config={config}
        heroData={heroData}
        role={role}
        youtubeKeyConfigured={!!tenantKeys?.youtubeApiKey}
        instagramKeyConfigured={!!tenantKeys?.instagramApiKey}
        tenantId={tenantId}
      />
    </ContentContainer>
  );
}
