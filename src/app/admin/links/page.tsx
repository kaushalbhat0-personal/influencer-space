import { requireTenant } from "@/lib/auth/require-tenant";
import { ContentContainer, PageHeader } from "@/components/layout";
import { SocialLinksEditor } from "@/features/links/components/social-links-editor";
import { SettingsService } from "@/services/settings.service";
import type { HeroSocialLink } from "@/config/hero";

export const dynamic = "force-dynamic";

/**
 * IMPLEMENTATION-18A — the Links module is PRESENTATION ONLY.
 * It renders whatever Hero publishes: social/streaming links live in
 * hero_data.socialLinks (owned by Hero). This page is a single CRUD surface
 * that writes to the same Hero storage the Hero settings form uses.
 */
export default async function AdminLinksPage() {
  const { tenantId } = await requireTenant();

  const hero = await SettingsService.getHeroData(tenantId);
  const socialLinks: HeroSocialLink[] = Array.isArray(hero.socialLinks) ? hero.socialLinks : [];

  return (
    <ContentContainer>
      <PageHeader
        title="Links"
        description="Social, streaming and contact links — published by Hero. The Links section and footer render these automatically."
        breadcrumbs={[{ label: "Dashboard", href: "/admin/dashboard" }, { label: "Links" }]}
      />
      <div className="rounded-xl border border-white/5 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <h2 className="mb-1 text-sm font-semibold text-zinc-300">Hero Social Links</h2>
        <p className="mb-4 text-xs text-zinc-500">
          Stored once in Hero. Rendered on the Hero, the Links section and the Footer.
        </p>
        <SocialLinksEditor tenantId={tenantId} initialLinks={socialLinks} />
      </div>
    </ContentContainer>
  );
}
