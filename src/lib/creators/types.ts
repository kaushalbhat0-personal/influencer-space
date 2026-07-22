export interface CreatorProfile {
  name: string;
  description: string;
  avatarUrl: string | null;
  bannerUrl: string | null;
  followers: number;
  videoCount: number;
  viewCount: number;
  country: string | null;
  platform: string;
  handle: string | null;
  externalId: string | null;
  socialLinks: { platform: string; url: string }[];
  latestContent: {
    title: string;
    description: string;
    thumbnail: string | null;
    publishedAt: string | null;
    viewCount: number;
    duration: string | null;
    url: string;
  }[];
  categories: string[];
  keywords: string[];
  language: string | null;
  rawResponse: unknown;
}

export interface CreatorIntelligence {
  niche: string;
  subNiche: string | null;
  audience: string | null;
  brandPersonality: string | null;
  brandTone: string | null;
  visualStyle: string | null;
  contentStyle: string | null;
  websiteGoal: string | null;
  monetization: string | null;
  recommendedTheme: string;
  recommendedTemplate: string;
  recommendedSections: string[];
  seoKeywords: string[];
  suggestedCta: string | null;
  trustSignals: string[];
  contentPillars: string[];
  confidence: number;
  reasoning: string | null;
}
