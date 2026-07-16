import { prisma } from "@/lib/prisma";
import { SettingsService } from "@/services/settings.service";

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
  alignment: "top" | "center" | "bottom";
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
  stats: string | null;
};

export type PublicPageData = {
  profile: PublicProfile;
  hero: PublicHeroData;
  products: PublicProductData[];
  links: PublicLinkData[];
  gallery: PublicGalleryData[];
  milestones: PublicMilestoneData[];
};

const defaultProfile: PublicProfile = {
  name: "Creator",
  tagline: "",
  bio: "",
  profileImage: null,
  social: { instagram: "", youtube: "", twitter: "", tiktok: "" },
  colors: { primary: "#2D1B69", secondary: "#00f5ff", accent: "#ff00e5" },
};

export async function getPublicPageData(tenantId: string): Promise<PublicPageData> {
  const data = await Promise.all([
    prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "influencer_data" } },
    }),
    SettingsService.getHeroData(tenantId),
    prisma.product.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, name: true, description: true, price: true, imageUrl: true },
    }),
    prisma.affiliateLink.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, url: true, imageUrl: true, clicks: true },
    }),
    prisma.galleryImage.findMany({
      where: { tenantId, isActive: true },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: { id: true, title: true, description: true, imageUrl: true, mediaType: true, videoUrl: true },
    }),
    prisma.timelineEvent.findMany({
      where: { tenantId, isActive: true },
      orderBy: { year: "desc" },
      select: { id: true, year: true, title: true, description: true, imageUrl: true, stats: true },
    }),
  ]);

  const [settingRow, heroRaw, products, links, galleryRows, milestones] = data;

  const profile: PublicProfile = settingRow?.value
    ? { ...defaultProfile, ...(settingRow.value as Partial<PublicProfile>) }
    : defaultProfile;

  const gallery: PublicGalleryData[] = galleryRows.map((g) => ({
    id: g.id,
    url: g.mediaType === "video" && g.videoUrl ? g.videoUrl : g.imageUrl,
    caption: g.description || g.title,
    isVideo: g.mediaType === "video",
  }));

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
    alignment: heroRaw.alignment || "center",
  };

  return { profile, hero, products, links, gallery, milestones };
}
