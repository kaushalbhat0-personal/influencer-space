// ── PublishedSnapshot (IMMUTABLE) ─────────────────────────
// Architecture contract. Never modify an existing snapshot.
// Every publish creates a completely new row.
// Storefront reads this object only — never business tables.

export interface PublishedSnapshot {
  _schema: "creatorstore.snapshot";
  _version: number;
  metadata: SnapshotMetadata;
  content: WebsiteAggregate;
  /**
   * RCCF-02: homepage-curated aggregate (featured-first, capped per
   * DEFAULT_HOMEPAGE_LIMITS). The homepage renders this; independent collection
   * pages ([domain]/[slug]) render `content` (full collections). Optional — old
   * snapshots fall back to `content` on the homepage.
   */
  homepageContent?: WebsiteAggregate;
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
  /**
   * RCCF-02: baked storefront gates so the published storefront reads NO live
   * business tables. Optional — old snapshots default to false.
   */
  goalProfilePresent?: boolean;
  maintenanceMode?: boolean;
}

// ── Content (from WebsiteAggregateService) ─────────────────

export interface TestimonialContent {
  id: string;
  author: string;
  role: string | null;
  content: string;
  avatarUrl: string | null;
  rating: number;
  featured: boolean;
  category: string;
}

export interface FaqContent {
  id: string;
  question: string;
  answer: string;
  category: string;
}

export interface TimelineContent {
  id: string;
  year: string;
  title: string;
  description: string;
  imageUrl: string | null;
  stats: string | null;
}

export interface GameContent {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  genre: string | null;
}

export interface ContentFeedContent {
  id: string;
  platform: string;
  mediaType: string;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  permalink: string | null;
}

export interface WebsiteAggregate {
  identity: {
    name: string;
    tagline: string;
    bio: string;
    avatarUrl: string | null;
    bannerUrl: string | null;
    socialLinks: Array<{ platform: string; url: string }>;
  };
  /** Creator-verified declared facts from the knowledge_completion setting. */
  declaredFacts?: Record<string, unknown>;
  hero: HeroContent;
  products: Array<{
    id: string; name: string; description: string | null;
    price: number; imageUrl: string | null; images: string[];
    slug: string; isFeatured: boolean; isActive: boolean;
    // RCCF-66.2: per-product sales mode + resolved WhatsApp destination.
    // Optional — old snapshots without these degrade to ONLINE (no WhatsApp CTA).
    commerceMode?: string;
    whatsappUrl?: string | null;
  }>;
  gallery: Array<{
    id: string; title: string; description: string | null;
    imageUrl: string; mediaType: "image" | "video";
    videoUrl: string | null; altText: string | null; isFeatured: boolean;
  }>;
  links: Array<{
    id: string; title: string; url: string; imageUrl: string | null; clicks: number;
  }>;
  seo: {
    title: string;
    description: string;
  };
  testimonials: TestimonialContent[];
  faq: FaqContent[];
  timeline: TimelineContent[];
  games: GameContent[];
  contentFeed: ContentFeedContent[];
  courses: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    imageUrl: string | null;
    category: string | null;
    featured?: boolean;
  }>;
  services: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    duration: string | null;
    imageUrl?: string | null;
    category?: string | null;
    featured?: boolean;
    // RCCF-67.5 — explicit bookable state + future open slots. Optional so
    // legacy snapshots without service booking render safely (display-only).
    bookable?: boolean;
    bookableSlots?: Array<{
      id: string;
      slotDate: string;
      slotStart: string;
      slotEnd: string;
      timezone: string;
      approvalRequired: boolean;
    }>;
  }>;
  /** RCCF-67.4 — bookable slots exposed to the storefront. Only OPEN slots
   * (created by the creator with no customer assigned) are included; admin-only
   * metadata, approval internals and private notes are never exposed. Optional —
   * legacy snapshots load safely without it. */
  bookings?: Array<{
    id: string;
    title: string;
    description: string | null;
    price: number;
    duration: number;
    slotDate: string;
    slotStart: string;
    slotEnd: string;
    timezone: string;
    approvalRequired: boolean;
  }>;
}

export interface HeroSocialLink {
  platform: string;
  url: string;
  label?: string;
}

export interface HeroContent {
  title: string;
  name?: string;
  profilePictureUrl?: string | null;
  profilePictureAssetId?: string | null;
  subtitle: string;
  description: string;
  tagline?: string;
  bio?: string;
  videoUrl?: string | null;
  posterUrl?: string | null;
  videoAssetId?: string | null;
  posterAssetId?: string | null;
  backgroundUrl?: string | null;
  backgroundAssetId?: string | null;
  ctaText?: string;
  ctaLink?: string;
  ctaSecondaryText?: string;
  ctaSecondaryLink?: string;
  liveBadgeText?: string;
  showLiveBadge?: boolean;
  imageUrl?: string | null;
  socialLinks?: HeroSocialLink[];
  videoDesktopAlignment?: "top" | "center" | "bottom";
  videoMobileAlignment?: "top" | "center" | "bottom";
  imageDesktopAlignment?: "top" | "center" | "bottom";
  imageMobileAlignment?: "top" | "center" | "bottom";
  // RCCF-71.3: HERO PRESENTATION only — persisted via Website.themeConfig and
  // merged onto snapshot.content.hero by buildRuntimeSnapshot / the Builder
  // canvas. Old snapshots without them render the exact current look (the
  // renderer falls back to center / medium / the current gradient). Content is
  // NEVER stored here (hero_data owns content).
  textAlign?: "left" | "center" | "right";
  contentWidth?: "narrow" | "medium" | "wide";
  overlay?: "none" | "soft" | "medium" | "strong";
  // IMPLEMENTATION-21 (BUG 3): resolved by resolveHeroMediaForRuntime() in the
  // aggregate. Renderers consume ONLY these fields — never the raw *_Url /
  // *_AssetId values above.
  resolvedMedia?: "video" | "image" | "background" | "placeholder";
  mediaType?: "video" | "image";
  mediaUrl?: string | null;
  mediaPoster?: string | null;
  rendererDecision?: string;
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
    // RCCF-LAUNCH-TRACK-05: full token set (additive — old snapshots resolve to
    // derived/global fallbacks).
    success?: string;
    warning?: string;
    danger?: string;
    surface?: string;
    surfaceSecondary?: string;
    border?: string;
    focus?: string;
    textSecondary?: string;
  };
  typography: {
    heading: string;
    body: string;
    mono?: string;
    display?: string;
    /**
     * RCCF-71.2: controlled heading weight (e.g. "700"). Optional — old
     * snapshots render with the renderer-side 700 fallback.
     */
    headingWeight?: string;
  };
  /**
   * RCCF-71.1: creator appearance config baked into the canonical snapshot.
   * Optional — old snapshots without these fields render with the defaults
   * (8px radius scale / comfortable section spacing) via LayoutEngine.
   */
  borderRadius?: string;
  layoutDensity?: "compact" | "comfortable" | "spacious";
}

// ── Navigation (persisted, canonical) ────────────────────

export type NavItemType = "page" | "anchor" | "external";

export interface NavigationItem {
  id: string;
  label: string;
  href: string;
  type: NavItemType;
  order: number;
  visible: boolean;
  target?: "_self" | "_blank";
  icon?: string | null;
  /**
   * RCCF-72.11 — when set, this item is an AUTO-GENERATED section anchor tied
   * to a renderable section base (e.g. "products"). Reconciliation may add or
   * remove generated anchors as the renderable section graph changes, but items
   * WITHOUT this field (page / external / manually authored anchors) are treated
   * as user-authored and are NEVER removed automatically.
   */
  generatedFromSection?: string;
}

// ── Rendering Hints (from Builder, layout only) ───────────

export interface RenderingHints {
  sectionVisibility?: Record<string, "visible" | "hidden" | "auto">;
  responsive?: Record<string, { mobile?: boolean; tablet?: boolean; desktop?: boolean }>;
  animations?: Record<string, { id: string; duration?: number }>;
  customCss?: string;
  /**
   * RCCF-02: the capability-resolved ThemeExperience baked at publish time so
   * the published storefront applies NO plan/billing reads at render time.
   * Optional — old snapshots fall back to the free-tier experience.
   */
  experience?: unknown;
}

// ── Current schema version ────────────────────────────────
// Increment ONLY for breaking schema changes.
// Migration is handled by serializers, never by runtime if/else.

export const CURRENT_SNAPSHOT_VERSION = 1;
export const SNAPSHOT_SCHEMA = "creatorstore.snapshot" as const;
