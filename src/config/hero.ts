export type HeroSocialPlatform =
  | "youtube" | "instagram" | "x" | "facebook" | "linkedin"
  | "discord" | "telegram" | "whatsapp" | "kick" | "twitch"
  | "website" | "email" | "phone" | "custom";

/** Single source of truth for a creator's social / streaming / contact link. */
export interface HeroSocialLink {
  platform: HeroSocialPlatform | string;
  url: string;
  label?: string;
}

export const HERO_SOCIAL_PLATFORMS: { value: HeroSocialPlatform; label: string }[] = [
  { value: "youtube", label: "YouTube" },
  { value: "instagram", label: "Instagram" },
  { value: "x", label: "X / Twitter" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "discord", label: "Discord" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "kick", label: "Kick" },
  { value: "twitch", label: "Twitch" },
  { value: "website", label: "Website" },
  { value: "email", label: "Email" },
  { value: "phone", label: "Phone" },
  { value: "custom", label: "Custom" },
];

/**
 * Hero owns ALL hero content: title/subtitle/tagline/bio, live badge, CTAs,
 * poster, video, background, social/streaming links and integrations.
 * Nothing else owns these.
 */
export type HeroDataType = {
  videoUrl: string;
  posterUrl: string;
  videoAssetId: string | null;
  posterAssetId: string | null;
  backgroundUrl: string;
  backgroundAssetId: string | null;
  title: string;
  subtitle: string;
  tagline: string;
  bio: string;
  ctaText: string;
  ctaLink: string;
  ctaSecondaryText: string;
  ctaSecondaryLink: string;
  liveBadgeText: string;
  showLiveBadge: boolean;
  socialLinks: HeroSocialLink[];
  videoDesktopAlignment: "top" | "center" | "bottom";
  videoMobileAlignment: "top" | "center" | "bottom";
  imageDesktopAlignment: "top" | "center" | "bottom";
  imageMobileAlignment: "top" | "center" | "bottom";
};

export const defaultHeroData: HeroDataType = {
  videoUrl: "",
  posterUrl: "",
  videoAssetId: null,
  posterAssetId: null,
  backgroundUrl: "",
  backgroundAssetId: null,
  title: "Welcome",
  subtitle: "",
  tagline: "",
  bio: "",
  ctaText: "",
  ctaLink: "",
  ctaSecondaryText: "",
  ctaSecondaryLink: "",
  liveBadgeText: "",
  showLiveBadge: false,
  socialLinks: [],
  videoDesktopAlignment: "center",
  videoMobileAlignment: "center",
  imageDesktopAlignment: "center",
  imageMobileAlignment: "center",
};
