import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { SettingsForm } from "./_components/settings-form";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">
          Website Settings
        </h1>
        <p className="mt-4 text-gray-400">
          No tenant configured. Please seed a tenant first.
        </p>
      </div>
    );
  }

  const [config, heroData, tenant] = await Promise.all([
    SettingsService.getInfluencerData(tenantId),
    SettingsService.getHeroData(tenantId),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { youtubeApiKey: true, instagramApiKey: true },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Website Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Update your brand information below. Changes appear on the public site instantly.
        </p>
      </div>
      <SettingsForm
        key={`${config.name}-${config.profileImage}-${heroData.videoUrl}`}
        config={config}
        heroData={heroData}
        role={session?.user?.role ?? "ADMIN"}
        youtubeApiKey={tenant?.youtubeApiKey ?? ""}
        instagramApiKey={tenant?.instagramApiKey ?? ""}
      />
    </div>
  );
}
