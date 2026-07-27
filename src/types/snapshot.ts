// ── PublishedSnapshot (IMMUTABLE) ─────────────────────────
// Architecture contract. Never modify an existing snapshot.
// Every publish creates a completely new row.
// Storefront reads this object only — never business tables.

export interface PublishedSnapshot {
  _schema: "creatorstore.snapshot";
  _version: number;
  metadata: SnapshotMetadata;
  content: WebsiteAggregate;
  layout: LayoutSnapshot;
  theme: ThemeSnapshot;
  navigation: NavigationItem[];
  renderingHints: RenderingHints;
}

// ── Metadata ──────────────────────────────────────────────

export interface SnapshotMetadata {
  version: number;
  publishedAt: string;
  previousVersion: number | null;
  correlationId: string;
  generatedBy: "dashboard" | "onboarding";
}

// ── Content (from WebsiteAggregateService) ─────────────────

export interface WebsiteAggregate {
  identity: {
    name: string;
    tagline: string;
    bio: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    socialLinks: Array<{ platform: string; url: string }>;
  };
  hero: HeroContent;
  products: Array<{
    id: string; name: string; description: string | null;
    price: number; imageUrl: string | null; images: string[];
    slug: string; isFeatured: boolean; isActive: boolean;
  }>;
  gallery: Array<{
    id: string; title: string; description: string | null;
    imageUrl: string; mediaType: "image" | "video";
    videoUrl: string | null; altText: string | null; isFeatured: boolean;
  }>;
  links: Array<{
    id: string; title: string; url: string; imageUrl: string | null;
  }>;
  seo: {
    title: string;
    description: string;
  };
}

export interface HeroContent {
  title: string;
  subtitle: string;
  description: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  ctaText?: string;
  ctaLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  liveBadgeText?: string;
  showLiveBadge?: boolean;
  imageUrl?: string | null;
}

export interface CTABlock {
  text: string;
  link: string;
}

// ── Layout (from Builder, semantic types only) ────────────

export interface LayoutSnapshot {
  pages: Array<{
    id: string;
    name: string;
    slug: string;
    isHome: boolean;
    order: number;
    sections: Array<{
      id: string;
      moduleId: string;
      config: Record<string, unknown>;
      order: number;
      visible: boolean;
    }>;
  }>;
}

// ── Theme (from WebsiteRepository) ─────────────────────────

export interface ThemeSnapshot {
  packageId: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    foreground: string;
    muted: string;
  };
  typography: {
    heading: string;
    body: string;
  };
}

// ── Navigation (computed at publish time) ─────────────────

export interface NavigationItem {
  label: string;
  href: string;
  order: number;
  enabled?: boolean;
}

// ── Rendering Hints (from Builder, layout only) ───────────

export interface RenderingHints {
  sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
  responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
  animations?: Record<string, { id: string; duration?: number }>;
  customCss?: string;
}

// ── Current schema version ────────────────────────────────
// Increment ONLY for breaking schema changes.
// Migration is handled by serializers, never by runtime if/else.

export const CURRENT_SNAPSHOT_VERSION = 1;
export const SNAPSHOT_SCHEMA = "creatorstore.snapshot" as const;
