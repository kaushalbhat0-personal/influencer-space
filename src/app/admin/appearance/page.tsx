import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { SettingsService } from "@/services/settings.service";
import { getPlanLimits } from "@/lib/feature-gate";
import { AppearanceManager } from "./_components/appearance-manager";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AppearancePage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Appearance</h1>
        <p className="mt-4 text-gray-400">No tenant configured. Please seed a tenant first.</p>
      </div>
    );
  }

  const plan = await getPlanLimits(tenantId);
  if (!plan.limits.customBranding) {
    return (
      <div>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Appearance</h1>
        <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <p className="text-sm text-amber-400">
            Custom branding and themes require a{" "}
            <span className="font-semibold">Pro</span> subscription.
          </p>
          <Link
            href="/admin/billing"
            className="mt-4 inline-block admin-btn-cyan px-6 py-2.5 text-sm"
          >
            Upgrade to Pro
          </Link>
        </div>
      </div>
    );
  }

  const themeConfig = await SettingsService.getThemeConfig(tenantId);

  return (
    <div>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Appearance & Theme</h1>
        <p className="mt-1 text-sm text-gray-400">
          Customize colors, fonts, and layout. Changes appear in the live preview instantly.
        </p>
      </div>
      <AppearanceManager tenantId={tenantId} initialTheme={themeConfig} />
    </div>
  );
}
