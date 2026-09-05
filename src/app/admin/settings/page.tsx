import { ContentContainer } from "@/components/layout";
import { SettingsService } from "@/services/settings.service";
import { SettingsForm } from "@/features/settings/components/settings-form";
import { requireTenant } from "@/lib/auth/require-tenant";
import { prisma } from "@/lib/prisma";
import { HERO_TEXT_ALIGN_VALUES, HERO_CONTENT_WIDTH_VALUES, HERO_OVERLAY_VALUES } from "@/lib/hero/presentation-options";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const { tenantId } = await requireTenant();

  const heroData = await SettingsService.getHeroData(tenantId);

  // RCCF-71.3: HERO PRESENTATION — read the persisted Website.themeConfig hero
  // presets (written by the Builder appearance panel) and normalize them against
  // the canonical registries so the settings preview renders the EXACT presets
  // publish + the preview route + Builder resolve. Never persisted here.
  const website = await prisma.website.findUnique({
    where: { tenantId },
    select: { themeConfig: true },
  });
  const cfg = (website?.themeConfig ?? {}) as Record<string, string>;
  const heroPresentation = {
    textAlign: HERO_TEXT_ALIGN_VALUES.has(cfg.heroTextAlign) ? cfg.heroTextAlign : "center",
    contentWidth: HERO_CONTENT_WIDTH_VALUES.has(cfg.heroContentWidth) ? cfg.heroContentWidth : "medium",
    overlay: HERO_OVERLAY_VALUES.has(cfg.heroOverlay) ? cfg.heroOverlay : "medium",
  };

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="platform-display">Hero</h1>
        <p className="platform-body mt-1.5">
          Customize your hero section.
        </p>
      </div>
      <SettingsForm
        key={JSON.stringify({ heroData, heroPresentation })}
        heroData={heroData}
        tenantId={tenantId}
        heroPresentation={heroPresentation}
      />
    </ContentContainer>
  );
}