import type { BusinessProfile } from "@/lib/acquisition/business-types";

export interface BusinessRecommendation {
  theme: ThemeRecommendation;
  pages: PageRecommendation[];
  sections: SectionRecommendation[];
  navigation: NavigationRecommendation;
  offers: OfferRecommendation[];
  seo: SeoRecommendation;
  conversion: ConversionRecommendation[];
  health: BusinessHealthScore;
}

export interface ThemeRecommendation {
  family: string;
  reason: string;
  confidence: number;
}

export interface PageRecommendation {
  name: string;
  slug: string;
  isHome: boolean;
  order: number;
  reason: string;
}

export interface SectionRecommendation {
  moduleId: string;
  pageSlug: string;
  order: number;
  reason: string;
}

export interface NavigationRecommendation {
  items: { label: string; href: string; order: number }[];
  reason: string;
}

export interface OfferRecommendation {
  type: string;
  name: string;
  description: string;
  priceHint: string;
  reason: string;
}

export interface SeoRecommendation {
  title: string;
  description: string;
  reason: string;
}

export interface ConversionRecommendation {
  widget: string;
  reason: string;
  priority: number;
}

export interface BusinessHealthScore {
  overall: number;
  completion: number;
  storefrontQuality: number;
  conversionScore: number;
  brandCompleteness: number;
  offerCompleteness: number;
  seoReadiness: number;
  strengths: string[];
  weaknesses: string[];
  criticalWarnings: string[];
  suggestions: string[];
}

export interface BusinessTemplate {
  id: string;
  name: string;
  category: string;
  themeFamily: string;
  themeReason: string;
  pages: { name: string; slug: string; isHome: boolean; order: number }[];
  sections: { moduleId: string; pageSlug: string; order: number }[];
  navigation: { label: string; href: string; order: number }[];
  offers: { type: string; name: string; description: string; priceHint: string }[];
  seo: { titleTemplate: string; descriptionTemplate: string };
  conversion: { widget: string; priority: number }[];
}

export interface RecommendationProvider {
  id: string;
  name: string;
  generate(business: BusinessProfile): BusinessRecommendation;
}
