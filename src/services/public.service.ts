import { prisma } from "@/lib/prisma";
import { defaultConfig } from "@/config/influencer";
import { SettingsService } from "@/services/settings.service";
import { getContentFeed } from "@/services/content-feed.service";
import type { PublicFeedItemData } from "@/components/public/ContentFeed";
import { loadProductsForStorefront, loadGalleryForStorefront, loadTimelineForStorefront, loadAffiliatesForStorefront, loadGamesForStorefront } from "@/lib/data/loaders";

export type PublicHeroData = {
  videoUrl: string;
  posterUrl: string;
  subtitle: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  liveBadgeText: string;
  showLiveBadge: boolean;
  videoDesktopAlignment: "top" | "center" | "bottom";
  videoMobileAlignment: "top" | "center" | "bottom";
  imageDesktopAlignment: "top" | "center" | "bottom";
  imageMobileAlignment: "top" | "center" | "bottom";
};

export type PublicProfile = {
  name: string;
  tagline: string;
  bio: string;
  profileImage: string | null;
  social: {
    instagram: string;
    youtube: string;
    twitter: string;
    tiktok: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
};

export type PublicProductData = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
};

export type PublicLinkData = {
  id: string;
  title: string;
  url: string;
  imageUrl: string | null;
  clicks: number;
};

export type PublicGalleryData = {
  id: string;
  url: string;
  caption: string | null;
  isVideo: boolean;
};

export type PublicMilestoneData = {
  id: string;
  year: string;
  title: string;
  description: string;
  imageUrl: string | null;
  stats?: string | null;
};

export type PublicGameData = {
  id: string;
  name: string;
  logoUrl: string | null;
  genre: string | null;
};

export type PublicPageData = {
  profile: PublicProfile;
  hero: PublicHeroData;
  products: PublicProductData[];
  links: PublicLinkData[];
  gallery: PublicGalleryData[];
  milestones: PublicMilestoneData[];
  games: { id: string; name: string; logoUrl: string | null; genre: string | null }[];
  feed: PublicFeedItemData[];
};

const profileDefaults: PublicProfile = {
  name: defaultConfig.name,
  tagline: defaultConfig.tagline,
  bio: defaultConfig.bio,
  profileImage: defaultConfig.profileImage,
  social: { ...defaultConfig.social },
  colors: { ...defaultConfig.colors },
};

export async function getPublicPageData(tenantId: string): Promise<PublicPageData> {
  const data = await Promise.all([
    prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "influencer_data" } },
    }),
    SettingsService.getHeroData(tenantId),
    loadProductsForStorefront(tenantId),
    loadAffiliatesForStorefront(tenantId),
    loadGalleryForStorefront(tenantId),
    loadTimelineForStorefront(tenantId),
    loadGamesForStorefront(tenantId),
    getContentFeed(tenantId),
  ]);

  const [settingRow, heroRaw, products, links, galleryRows, milestones, games, feed] = data;

  const profile: PublicProfile = settingRow?.value
    ? { ...profileDefaults, ...(settingRow.value as Partial<PublicProfile>) }
    : profileDefaults;

  const gallery: PublicGalleryData[] = galleryRows;

  const hero: PublicHeroData = {
    videoUrl: heroRaw.videoUrl || "",
    posterUrl: heroRaw.posterUrl || "",
    subtitle: heroRaw.subtitle || "",
    ctaText: heroRaw.ctaText || "",
    ctaLink: heroRaw.ctaLink || "",
    ctaSecondaryText: heroRaw.ctaSecondaryText || "",
    ctaSecondaryLink: heroRaw.ctaSecondaryLink || "",
    liveBadgeText: heroRaw.liveBadgeText || "",
    showLiveBadge: Boolean(heroRaw.showLiveBadge),
    videoDesktopAlignment: heroRaw.videoDesktopAlignment || "center",
    videoMobileAlignment: heroRaw.videoMobileAlignment || "center",
    imageDesktopAlignment: heroRaw.imageDesktopAlignment || "center",
    imageMobileAlignment: heroRaw.imageMobileAlignment || "center",
  };

  return { profile, hero, products, links, gallery, milestones, games, feed };
}
