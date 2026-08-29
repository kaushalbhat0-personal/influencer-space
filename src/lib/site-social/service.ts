import { SettingsService } from "@/services/settings.service";
import type { HeroSocialLink } from "@/config/hero";

const SITE_SOCIAL_KEY = "site_social_links" as const;

/**
 * RCCF-07A — Shared site-level social links.
 *
 * Single persistence for social profiles reused by Hero and Footer.
 * Backward compat: if site_social_links is absent, callers fall back to
 * hero_data.socialLinks (existing tenants). No migration required.
 */
export interface SiteSocialService {
  get(tenantId: string): Promise<HeroSocialLink[]>;
  save(tenantId: string, links: HeroSocialLink[]): Promise<void>;
  /** Resolve the effective social links with hero_data fallback. */
  resolve(tenantId: string): Promise<HeroSocialLink[]>;
}

export const siteSocialService: SiteSocialService = {
  async get(tenantId: string): Promise<HeroSocialLink[]> {
    const v = await SettingsService.getSettingByKey(tenantId, SITE_SOCIAL_KEY);
    return Array.isArray(v) ? (v as HeroSocialLink[]) : [];
  },

  async save(tenantId: string, links: HeroSocialLink[]): Promise<void> {
    const safe = links.filter((l) => l.platform && l.url && l.url.trim()).map((l) => ({ platform: l.platform, url: l.url.trim(), label: (l.label ?? "").trim() || undefined }));
    await SettingsService.upsertSetting(tenantId, SITE_SOCIAL_KEY, safe as unknown as never);
  },

  async resolve(tenantId: string): Promise<HeroSocialLink[]> {
    const site = await SettingsService.getSettingByKey(tenantId, SITE_SOCIAL_KEY);
    if (Array.isArray(site) && (site as unknown[]).length > 0) return site as HeroSocialLink[];
    // compat: fall back to hero_data.socialLinks
    const hero = await SettingsService.getHeroData(tenantId);
    return (hero.socialLinks ?? []) as HeroSocialLink[];
  },
};

export const SITE_SOCIAL_KEY_NAME = SITE_SOCIAL_KEY;
