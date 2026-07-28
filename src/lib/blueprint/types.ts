export type BlueprintCategory =
  | "creator" | "business" | "education" | "commerce" | "restaurant"
  | "portfolio" | "photography" | "gaming" | "agency" | "podcast" | "luxury";

export type BlueprintStatus = "active" | "deprecated" | "coming_soon";

export type CreatorType = "individual" | "business" | "agency" | "enterprise";

export interface BlueprintAuthor {
  name: string;
  url?: string;
}

export interface BlueprintSectionDefinition {
  id: string;
  moduleId: string;
  order: number;
  visible: boolean;
  config?: Record<string, unknown>;
}

export interface BlueprintPageDefinition {
  id: string;
  name: string;
  slug: string;
  isHome: boolean;
  order: number;
  sections: BlueprintSectionDefinition[];
}

export interface BlueprintNavigationItem {
  id: string;
  label: string;
  href: string;
  type: "page" | "anchor" | "external";
  order: number;
  visible: boolean;
}

export interface BlueprintStarterContent {
  placeholders: Record<string, string>;
  products?: Array<Record<string, unknown>>;
  gallery?: Array<Record<string, unknown>>;
  testimonials?: Array<Record<string, unknown>>;
  faq?: Array<Record<string, unknown>>;
}

export interface BlueprintSeoDefaults {
  titlePattern: string;
  descriptionPattern: string;
  schemaTypes: string[];
  ogImage?: string;
  twitterCard?: "summary" | "summary_large_image";
}

export interface BlueprintAIMetadata {
  creatorTypes: CreatorType[];
  industry: string[];
  businessGoals: string[];
  requiredQuestions: string[];
  recommendedSections: string[];
  contentPrompts: Record<string, string>;
  imagePrompts: Record<string, string>;
  seoPrompts: Record<string, string>;
  generationHints: Record<string, unknown>;
}

export interface BlueprintCompatibility {
  minPlatformVersion?: string;
  maxPlatformVersion?: string;
  requiresCapabilities: string[];
}

export interface BlueprintInheritance {
  parentId: string | null;
  mergeStrategy: "replace" | "merge" | "prepend" | "append";
}

export interface BlueprintDefinition {
  id: string;
  slug: string;
  name: string;
  description: string;
  author: BlueprintAuthor;
  version: string;
  schemaVersion: number;
  status: BlueprintStatus;
  category: BlueprintCategory;
  tags: string[];
  thumbnail?: string;
  previewImage?: string;
  pages: BlueprintPageDefinition[];
  navigation: BlueprintNavigationItem[];
  starterContent?: BlueprintStarterContent;
  recommendedThemes: string[];
  compatibleThemes: string[];
  incompatibleThemes: string[];
  requiredCapabilities: string[];
  featureFlags: Record<string, boolean>;
  seoDefaults: BlueprintSeoDefaults;
  aiMetadata: BlueprintAIMetadata;
  onboardingMetadata: Record<string, unknown>;
  compatibility: BlueprintCompatibility;
  inheritance: BlueprintInheritance;
}
