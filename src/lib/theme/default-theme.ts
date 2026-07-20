import type { Theme, ThemeManifest } from "./types";
import { DEFAULT_NEON_DARK_TOKENS } from "./tokens";

export const NEON_DARK_THEME: Theme = {
  identity: {
    id: "com.creatos.neon-dark",
    name: "Neon Dark",
    version: "1.0.0",
    author: {
      type: "platform",
      id: "com.creatos",
    },
  },
  inheritance: {
    extends: null,
    overridableTokens: Object.keys(DEFAULT_NEON_DARK_TOKENS),
    lockedTokens: [],
  },
  tokens: structuredClone(DEFAULT_NEON_DARK_TOKENS),
  variants: {
    products: {
      ProductCard: "default",
      ProductGrid: "default",
    },
    hero: {
      HeroBanner: "default",
    },
    gallery: {
      GalleryCard: "default",
      GalleryGrid: "default",
    },
    timeline: {
      TimelineEntry: "default",
      TimelineSection: "default",
    },
    contentFeed: {
      FeedCard: "default",
      FeedGrid: "default",
    },
    profile: {
      ProfileHeader: "default",
    },
    newsletter: {
      SubscribeForm: "default",
    },
  },
  layouts: [
    {
      name: "Default",
      moduleOrder: [
        "hero",
        "profile",
        "links",
        "products",
        "gallery",
        "timeline",
        "contentFeed",
        "newsletter",
      ],
      moduleVisibility: {
        hero: true,
        profile: true,
        links: true,
        products: true,
        gallery: true,
        timeline: true,
        contentFeed: true,
        newsletter: true,
      },
    },
    {
      name: "Minimal",
      moduleOrder: ["hero", "profile", "products", "links", "contentFeed"],
      moduleVisibility: {
        hero: true,
        profile: true,
        links: true,
        products: true,
        gallery: false,
        timeline: false,
        contentFeed: true,
        newsletter: false,
      },
    },
  ],
  fonts: [
    {
      family: "Inter",
      fallbacks: ["system-ui", "-apple-system", "sans-serif"],
      importUrl:
        "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
    },
  ],
  animations: [
    {
      name: "fadeIn",
      keyframes: {
        from: { opacity: "0" },
        to: { opacity: "1" },
      },
      config: {
        duration: "300ms",
        easing: "cubic-bezier(0.4,0,0.2,1)",
      },
    },
    {
      name: "slideUp",
      keyframes: {
        from: { opacity: "0", transform: "translateY(20px)" },
        to: { opacity: "1", transform: "translateY(0)" },
      },
      config: {
        duration: "400ms",
        easing: "cubic-bezier(0.4,0,0.2,1)",
      },
    },
  ],
  surfaceOverrides: {
    email_template: {
      "color.surface.primary": "#f9fafb",
      "color.text.primary": "#111827",
    },
    pdf_export: {
      "color.surface.primary": "#ffffff",
      "color.text.primary": "#000000",
    },
  },
  marketplace: {
    previewImages: [],
    tags: ["dark", "neon", "gaming", "modern"],
    pricing: {
      free: true,
    },
    compatibleModules: ["*"],
    minPlatformVersion: "1.0.0",
  },
};

export const NEON_DARK_MANIFEST: ThemeManifest = {
  id: "com.creatos.neon-dark",
  name: "Neon Dark",
  version: "1.0.0",
  description:
    "The default dark theme for CreatorOS. Features neon cyan accents on deep dark backgrounds. Designed for gaming creators but adaptable to any niche.",
  author: {
    name: "CreatorOS",
    type: "platform",
    id: "com.creatos",
    url: "https://creatos.io",
  },
  license: "MIT",
  previewImages: [],
  tags: ["dark", "neon", "gaming", "modern", "default"],
  minPlatformVersion: "1.0.0",
  supportedSurfaces: [
    "website",
    "website_preview",
    "api_rest",
    "admin_panel",
    "agency_preview",
    "ai_context",
  ],
  supportedModules: ["*"],
  pricing: {
    free: true,
  },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

export const PLATFORM_DEFAULT_THEME = NEON_DARK_THEME;
export const PLATFORM_DEFAULT_THEME_ID = "com.creatos.neon-dark";
