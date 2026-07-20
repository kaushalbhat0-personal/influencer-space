import { SettingsService } from "@/services/settings.service";

export async function heroDataLoader(
  tenantId: string,
  _config: Record<string, unknown>,
  _context: Record<string, unknown>
) {
  void _config; void _context;
  const heroData = await SettingsService.getHeroData(tenantId);
  return {
    videoUrl: heroData.videoUrl || "",
    posterUrl: heroData.posterUrl || "",
    subtitle: heroData.subtitle || "",
    ctaText: heroData.ctaText || "",
    ctaLink: heroData.ctaLink || "",
    ctaSecondaryText: heroData.ctaSecondaryText || "",
    ctaSecondaryLink: heroData.ctaSecondaryLink || "",
    liveBadgeText: heroData.liveBadgeText || "",
    showLiveBadge: Boolean(heroData.showLiveBadge),
    videoDesktopAlignment: heroData.videoDesktopAlignment || "center",
    videoMobileAlignment: heroData.videoMobileAlignment || "center",
    imageDesktopAlignment: heroData.imageDesktopAlignment || "center",
    imageMobileAlignment: heroData.imageMobileAlignment || "center",
  };
}
