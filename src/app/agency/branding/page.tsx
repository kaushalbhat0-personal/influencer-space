import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { agencyBranding } from "@/lib/client/branding";
import { EmptyState } from "@/components/ui/EmptyState";
import { Palette } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AgencyBrandingPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const brand = await agencyBranding.getBrand(agencyId);

  return (
    <ContentContainer>
      <PageHeader
        title="White Label Branding"
        description="Customize how your agency appears to clients."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Branding" }]}
      />

      <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-6">
        <h3 className="text-sm font-semibold text-white mb-4">Brand Settings</h3>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Primary Color</label>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg border border-white/10" style={{ backgroundColor: brand.primaryColor }} />
              <code className="text-sm text-zinc-300 font-mono">{brand.primaryColor}</code>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Accent Color</label>
            <div className="flex items-center gap-3">
              <span className="h-8 w-8 rounded-lg border border-white/10" style={{ backgroundColor: brand.accentColor }} />
              <code className="text-sm text-zinc-300 font-mono">{brand.accentColor}</code>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Support Email</label>
            <p className="text-sm text-zinc-300">{brand.supportEmail ?? "Not set"}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">Support Phone</label>
            <p className="text-sm text-zinc-300">{brand.supportPhone ?? "Not set"}</p>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-zinc-400 mb-1">Footer Text</label>
            <p className="text-sm text-zinc-300">{brand.footerText ?? "Not set"}</p>
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-amber-500/5 border border-amber-500/10 p-4">
          <p className="text-xs text-amber-400">
            Branding settings are applied to the Client Portal. Full white-label including admin UI, 
            email templates, and custom domains will be available in a future release.
          </p>
        </div>
      </div>
    </ContentContainer>
  );
}
