import { SettingsService } from "@/services/settings.service";
import { SettingsForm } from "./_components/settings-form";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const config = await SettingsService.getInfluencerData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Website Settings</h1>
        <p className="text-sm text-gray-400">
          Update your brand information below. Changes appear on the public site instantly.
        </p>
      </div>
      <SettingsForm config={config} />
    </div>
  );
}
