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
  desktopAlignment: "top" | "center" | "bottom";
  mobileAlignment: "top" | "center" | "bottom";
};

export const defaultHeroData: HeroDataType = {
  videoUrl: "/videos/intro-video/intro.mp4",
  posterUrl: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1920&h=1080&fit=crop",
  title: "Raj 'Snax' Varma",
  subtitle: "S8UL Esports | BGMI Pro | Content Creator",
  tagline: "Hyderabad ki energy — global level ka game.",
  ctaText: "Subscribe",
  ctaLink: "https://youtube.com/@SnaxGaming",
  ctaSecondaryText: "Follow on IG",
  ctaSecondaryLink: "https://instagram.com/snaxgaming",
  liveBadgeText: "Live on YouTube",
  showLiveBadge: true,
  desktopAlignment: "center",
  mobileAlignment: "center",
};