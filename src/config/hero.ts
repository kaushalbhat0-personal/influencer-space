export type HeroDataType = {
  videoUrl: string;
  posterUrl: string;
  title: string;
  subtitle: string;
  tagline: string;
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

export const defaultHeroData: HeroDataType = {
  videoUrl: "",
  posterUrl: "",
  title: "Welcome",
  subtitle: "",
  tagline: "",
  ctaText: "",
  ctaLink: "",
  ctaSecondaryText: "",
  ctaSecondaryLink: "",
  liveBadgeText: "",
  showLiveBadge: false,
  videoDesktopAlignment: "center",
  videoMobileAlignment: "center",
  imageDesktopAlignment: "center",
  imageMobileAlignment: "center",
};