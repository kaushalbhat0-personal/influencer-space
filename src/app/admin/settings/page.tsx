import { SettingsService } from "@/services/settings.service";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [config, heroData] = await Promise.all([
    SettingsService.getInfluencerData(),
    SettingsService.getHeroData(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-gaming">Website Settings</h1>
        <p className="mt-1 text-sm text-gray-400">
          Update your brand information below. Changes appear on the public site instantly.
        </p>
      </div>
      <SettingsForm
        key={`${config.name}-${config.profileImage}-${heroData.videoUrl}`}
        config={config}
        heroData={heroData}
      />
    </div>
  );
}
