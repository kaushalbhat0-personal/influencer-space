import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { entitlementService } from "@/lib/capabilities";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { AppearanceManager } from "./_components/appearance-manager";
import Link from "next/link";

const FONT_REVERSE_MAP: Record<string, string> = {
  "Geist, system-ui, sans-serif": "geist",
  "Inter, system-ui, sans-serif": "inter",
  "'IBM Plex Sans', system-ui, sans-serif": "plex",
  "'JetBrains Mono', monospace": "mono",
};

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

  const resolved = await resolveActivePlan(null, tenantId);
  // RCCF-11: the page manages premium appearance/theme customization. Gate on
  // the canonical premium_themes capability (previously gated on custom_branding,
  // which no plan grants — locking the page for every plan).
  const canAppearance = entitlementService.has(resolved.code, "premium_themes");
  if (!canAppearance) {
    return (
      <div>
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Appearance</h1>
        <div className="mt-8 rounded-xl border border-amber-500/20 bg-amber-500/5 p-6 text-center">
          <p className="text-sm text-amber-400">Premium appearance and themes require a <span className="font-semibold">Creator Grow</span> subscription or higher.</p>
          <Link href="/admin/billing" className="mt-4 inline-block admin-btn-cyan px-6 py-2.5 text-sm">Upgrade Plan</Link>
        </div>
      </div>
    );
  }

  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { id: true, themePackageId: true, themeColors: true, themeFonts: true, themeConfig: true },
  });

  const dbColors = (website?.themeColors ?? {}) as Record<string, string>;
  const dbFonts = (website?.themeFonts ?? {}) as Record<string, string>;
  const dbConfig = (website?.themeConfig ?? {}) as Record<string, string>;

  const initialTheme = {
    primary: dbColors.primary ?? "#00f5ff",
    secondary: dbColors.secondary ?? "#00f5ff",
    accent: dbColors.accent ?? "#06b6d4",
    font: FONT_REVERSE_MAP[dbFonts.heading] ?? "geist",
    borderRadius: dbConfig.borderRadius ?? "8",
    layoutDensity: (dbConfig.layoutDensity as "compact" | "comfortable" | "spacious") ?? "comfortable",
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="admin-gradient-text text-2xl font-bold font-display">Appearance & Theme</h1>
        <p className="mt-1 text-sm text-gray-400">Customize colors, fonts, and layout. Changes appear in the live preview instantly.</p>
      </div>
      <AppearanceManager tenantId={tenantId} initialTheme={initialTheme} />
    </div>
  );
}
