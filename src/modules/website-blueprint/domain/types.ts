// ─── Website Blueprint — Canonical Website Model ──────────────────────────

export interface WebsiteBlueprint {
  metadata: BlueprintMetadata;
  branding: BlueprintBranding;
  theme: BlueprintTheme;
  layout: BlueprintLayout;
  navigation: BlueprintNavigation;
  pages: BlueprintPage[];
  globalSections: BlueprintSection[];
  commerce: BlueprintCommerce;
  seo: BlueprintSeo;
  automation: BlueprintAutomation;
  analytics: BlueprintAnalytics;
  version: BlueprintVersion;
}

// ─── Metadata ─────────────────────────────────────────────────────────────

export interface BlueprintMetadata {
  name: string;
  description: string;
  businessCategory: string;
  createdAt: string;
  updatedAt: string;
  sourceStrategy: string;
  sourceInput: string;
  generationReason: string;
}

// ─── Branding ─────────────────────────────────────────────────────────────

export interface BlueprintBranding {
  businessName: string;
  ownerName: string;
  tagline: string;
  bio: string;
  logoUrl?: string;
  coverUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  fontHeading?: string;
  fontBody?: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────

export interface BlueprintTheme {
  family: string;
  packageId: string;
  mode: "light" | "dark";
  reason: string;
}

// ─── Layout ───────────────────────────────────────────────────────────────

export interface BlueprintLayout {
  pageWidth: "narrow" | "default" | "wide" | "full";
  contentSpacing: "compact" | "comfortable" | "spacious";
  containerStyle: "boxed" | "fullWidth";
}

// ─── Navigation ───────────────────────────────────────────────────────────

export interface BlueprintNavigation {
  items: BlueprintNavItem[];
  style: "top" | "sidebar" | "bottom" | "minimal";
  sticky: boolean;
  reason: string;
}

export interface BlueprintNavItem {
  id: string;
  label: string;
  href: string;
  order: number;
  visible: boolean;
}

// ─── Pages ────────────────────────────────────────────────────────────────

export interface BlueprintPage {
  id: string;
  slug: string;
  title: string;
  purpose: string;
  layout: BlueprintPageLayout;
  sections: BlueprintSection[];
  visibility: "published" | "draft" | "hidden";
  seo: BlueprintPageSeo;
  reason: string;
}

export interface BlueprintPageLayout {
  width: "narrow" | "default" | "wide" | "full";
  showTitle: boolean;
  showFooter: boolean;
}

export interface BlueprintPageSeo {
  title: string;
  description: string;
  ogImage?: string;
  noIndex: boolean;
}

// ─── Sections ─────────────────────────────────────────────────────────────

export interface BlueprintSection {
  id: string;
  type: string;
  label: string;
  priority: number;
  order: number;
  visibility: "visible" | "hidden";
  configuration: Record<string, unknown>;
  dataBinding?: BlueprintDataBinding;
  layoutHints: BlueprintLayoutHints;
  blocks: BlueprintBlock[];
}

export interface BlueprintDataBinding {
  source: "static" | "products" | "gallery" | "testimonials" | "faq" | "social" | "blog";
  query?: Record<string, unknown>;
}

export interface BlueprintLayoutHints {
  width: "narrow" | "default" | "wide" | "full";
  padding: "none" | "small" | "medium" | "large";
  background: "default" | "muted" | "accent" | "dark";
}

// ─── Blocks ───────────────────────────────────────────────────────────────

export interface BlueprintBlock {
  id: string;
  type: string;
  content: Record<string, unknown>;
  style: Record<string, unknown>;
  configuration: Record<string, unknown>;
  order: number;
}

// ─── Commerce ─────────────────────────────────────────────────────────────

export interface BlueprintCommerce {
  enabled: boolean;
  currency: string;
  offers: BlueprintOffer[];
  checkoutType: "self" | "external";
}

export interface BlueprintOffer {
  id: string;
  type: string;
  name: string;
  description: string;
  price: number;
  currency: string;
}

// ─── SEO ──────────────────────────────────────────────────────────────────

export interface BlueprintSeo {
  globalTitle: string;
  globalDescription: string;
  ogImage?: string;
  schemaType: string;
  canonicalUrl?: string;
  reason: string;
}

// ─── Automation ───────────────────────────────────────────────────────────

export interface BlueprintAutomation {
  enabled: boolean;
  triggers: string[];
}

// ─── Analytics ────────────────────────────────────────────────────────────

export interface BlueprintAnalytics {
  enabled: boolean;
  trackEvents: string[];
}

// ─── Versioning ───────────────────────────────────────────────────────────

export interface BlueprintVersion {
  major: number;
  minor: number;
  patch: number;
  status: "draft" | "published" | "archived";
  previousVersion?: string;
  changelog?: string;
}

// ─── Providers ────────────────────────────────────────────────────────────

export interface BlueprintProvider {
  id: string;
  name: string;
  compose(profile: Record<string, unknown>, recommendations: Record<string, unknown>): WebsiteBlueprint;
}
