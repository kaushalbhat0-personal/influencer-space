import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { SettingsService } from "@/services/settings.service";
import { prisma } from "@/lib/prisma";
import { SettingsForm } from "@/features/settings/components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Website Settings</h1>
        <p className="mt-4 text-gray-400">No tenant configured. Please seed a tenant first.</p>
      </ContentContainer>
    );
  }

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
        role={session?.user?.role ?? "ADMIN"}
        youtubeKeyConfigured={!!tenantKeys?.youtubeApiKey}
        instagramKeyConfigured={!!tenantKeys?.instagramApiKey}
        tenantId={tenantId}
      />
    </ContentContainer>
  );
}
