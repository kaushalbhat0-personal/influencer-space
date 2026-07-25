export type PageType = "home" | "products" | "gallery" | "about" | "contact" | "blog" | "custom";
export type SectionType = "hero" | "featured_products" | "product_grid" | "gallery" | "content_feed" | "about" | "contact_form" | "testimonials" | "stats" | "faq" | "newsletter" | "social_links" | "footer";

export interface WebsiteConfig {
  title: string;
  tagline: string;
  description: string;
  domain: string;
  locale: string;
  currency: string;
  timezone: string;
  version: number;
}

export interface PageBlueprint {
  id: string;
  type: PageType;
  title: string;
  slug: string;
  description: string;
  sections: string[];
  order: number;
  visible: boolean;
  metadata: Record<string, unknown>;
}

export interface NavItem {
  label: string;
  href: string;
  order: number;
  children: NavItem[];
  icon?: string;
  badge?: string;
}

export interface NavigationBlueprint {
  desktop: NavItem[];
  mobile: NavItem[];
  bottom: NavItem[];
  mobileBottom: NavItem[];
  sticky: boolean;
  style: "standard" | "centered" | "minimal";
}

export interface SectionBlueprint {
  id: string;
  type: SectionType;
  page: PageType;
  order: number;
  props: Record<string, unknown>;
  reason: string;
  confidence: number;
}

export interface ProductBlueprint {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  priceRange: string;
  featured: boolean;
  imageUrl: string | null;
  order: number;
  metadata: Record<string, unknown>;
}

export interface GalleryBlueprint {
  enabled: boolean;
  albums: GalleryAlbum[];
  featuredImages: string[];
  ordering: "chronological" | "popular";
  layout: "grid" | "masonry" | "carousel";
}

export interface GalleryAlbum {
  id: string;
  title: string;
  caption: string;
  images: string[];
  coverImage: string;
  order: number;
}

export interface FeedBlueprint {
  enabled: boolean;
  source: string;
  limit: number;
  layout: "grid" | "list" | "carousel";
  showCaptions: boolean;
  autoplay: boolean;
}

export interface SEOBlueprint {
  title: string;
  description: string;
  keywords: string[];
  ogImage: string;
  ogType: string;
  twitterHandle: string;
  canonical: string;
  structuredData: Record<string, unknown>;
  sitemapPriority: number;
  sitemapChangefreq: string;
}

export interface FontConfig {
  heading: string;
  body: string;
  monospace?: string;
}

export interface SpacingConfig {
  sectionPadding: string;
  containerWidth: string;
  gap: string;
}

export interface ButtonConfig {
  borderRadius: string;
  padding: string;
  fontWeight: string;
  textTransform: "none" | "uppercase";
}

export interface CardConfig {
  borderRadius: string;
  shadow: string;
  padding: string;
}

export interface ThemeBlueprint {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  fonts: FontConfig;
  spacing: SpacingConfig;
  borderRadius: string;
  mode: "light" | "dark" | "auto";
  buttons: ButtonConfig;
  cards: CardConfig;
  colors: Record<string, string>;
}

export interface BuilderBlock {
  id: string;
  type: string;
  props: Record<string, unknown>;
  children: string[];
  locked: boolean;
  metadata: Record<string, unknown>;
}

export interface BuilderBlueprint {
  version: number;
  blocks: BuilderBlock[];
  layout: "single" | "sidebar" | "fullwidth";
  containerWidth: string;
  metadata: Record<string, unknown>;
}

export interface BlueprintMetadata {
  generatedAt: string;
  version: number;
  confidence: number;
  sourceKey: string;
  intelligenceVersion: string;
}

export interface WebsiteBlueprint {
  website: WebsiteConfig;
  pages: PageBlueprint[];
  navigation: NavigationBlueprint;
  sections: SectionBlueprint[];
  products: ProductBlueprint[];
  gallery: GalleryBlueprint;
  feed: FeedBlueprint;
  about: SectionBlueprint | null;
  contact: SectionBlueprint | null;
  seo: SEOBlueprint;
  theme: ThemeBlueprint;
  builder: BuilderBlueprint;
  metadata: BlueprintMetadata;
}
