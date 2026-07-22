/**
 * Showcase Registry v1.0
 *
 * Separates generation (DemoSeed) from presentation (ShowcaseEntry).
 * Controls which demos appear on the marketing homepage, which are
 * featured, and which are used for QA/documentation.
 */

export interface ShowcaseEntry {
  seedId: string;
  featured: boolean;
  published: boolean;
  category: string;
  displayOrder: number;
  marketingPriority: number;    // 1=highest, lower values appear first on homepage
  qaEnabled: boolean;
  documentationExample: boolean;
}

export const SHOWCASE_REGISTRY: ShowcaseEntry[] = [
  { seedId: "fitness-coach",      featured: true,  published: true,  category: "Health & Wellness",  displayOrder: 1,  marketingPriority: 1, qaEnabled: true, documentationExample: true },
  { seedId: "yoga-studio",        featured: true,  published: true,  category: "Health & Wellness",  displayOrder: 2,  marketingPriority: 2, qaEnabled: true, documentationExample: false },
  { seedId: "nutrition-coach",    featured: false, published: true,  category: "Health & Wellness",  displayOrder: 3,  marketingPriority: 5, qaEnabled: false, documentationExample: false },
  { seedId: "photographer",       featured: true,  published: true,  category: "Creative",           displayOrder: 1,  marketingPriority: 2, qaEnabled: true, documentationExample: false },
  { seedId: "fashion-brand",      featured: true,  published: true,  category: "Creative",           displayOrder: 2,  marketingPriority: 1, qaEnabled: true, documentationExample: true },
  { seedId: "interior-designer",  featured: false, published: true,  category: "Creative",           displayOrder: 3,  marketingPriority: 4, qaEnabled: false, documentationExample: false },
  { seedId: "artist-painter",     featured: false, published: true,  category: "Creative",           displayOrder: 4,  marketingPriority: 6, qaEnabled: false, documentationExample: false },
  { seedId: "event-planner",      featured: false, published: true,  category: "Creative",           displayOrder: 5,  marketingPriority: 5, qaEnabled: false, documentationExample: false },
  { seedId: "digital-agency",     featured: true,  published: true,  category: "Business Services",  displayOrder: 1,  marketingPriority: 1, qaEnabled: true, documentationExample: true },
  { seedId: "marketing-consultant",featured: false, published: true,  category: "Business Services",  displayOrder: 2,  marketingPriority: 3, qaEnabled: true, documentationExample: false },
  { seedId: "chartered-accountant",featured: false, published: true,  category: "Business Services",  displayOrder: 3,  marketingPriority: 5, qaEnabled: false, documentationExample: false },
  { seedId: "lawyer-legal",       featured: false, published: true,  category: "Business Services",  displayOrder: 4,  marketingPriority: 6, qaEnabled: false, documentationExample: false },
  { seedId: "architect-firm",     featured: false, published: true,  category: "Business Services",  displayOrder: 5,  marketingPriority: 4, qaEnabled: false, documentationExample: false },
  { seedId: "real-estate-consultant",featured: false, published: true, category: "Business Services", displayOrder: 6, marketingPriority: 7, qaEnabled: false, documentationExample: false },
  { seedId: "finance-educator",   featured: true,  published: true,  category: "Education & Finance", displayOrder: 1,  marketingPriority: 2, qaEnabled: true, documentationExample: false },
  { seedId: "teacher-coach",      featured: false, published: true,  category: "Education & Finance", displayOrder: 2,  marketingPriority: 3, qaEnabled: true, documentationExample: false },
  { seedId: "language-academy",   featured: false, published: true,  category: "Education & Finance", displayOrder: 3,  marketingPriority: 4, qaEnabled: false, documentationExample: false },
  { seedId: "music-teacher",      featured: false, published: true,  category: "Education & Finance", displayOrder: 4,  marketingPriority: 5, qaEnabled: false, documentationExample: false },
  { seedId: "restaurant-chef",    featured: false, published: true,  category: "Food & Hospitality",  displayOrder: 1,  marketingPriority: 3, qaEnabled: false, documentationExample: false },
  { seedId: "dentist-clinic",     featured: false, published: true,  category: "Healthcare",          displayOrder: 1,  marketingPriority: 4, qaEnabled: true, documentationExample: false },
  { seedId: "travel-creator",     featured: false, published: true,  category: "Lifestyle",          displayOrder: 1,  marketingPriority: 2, qaEnabled: true, documentationExample: false },
  { seedId: "jewelry-store",      featured: false, published: true,  category: "Retail",             displayOrder: 1,  marketingPriority: 3, qaEnabled: false, documentationExample: false },
  { seedId: "saas-landing",       featured: true,  published: true,  category: "Technology",         displayOrder: 1,  marketingPriority: 1, qaEnabled: true, documentationExample: true },
  { seedId: "ngo-charity",        featured: false, published: true,  category: "Non-Profit",         displayOrder: 1,  marketingPriority: 8, qaEnabled: false, documentationExample: false },
  { seedId: "influencer-creator", featured: false, published: true,  category: "Creator Economy",    displayOrder: 1,  marketingPriority: 2, qaEnabled: true, documentationExample: false },
];

// Derived views
export function getFeaturedDemos(): ShowcaseEntry[] {
  return SHOWCASE_REGISTRY.filter((e) => e.featured && e.published)
    .sort((a, b) => a.marketingPriority - b.marketingPriority);
}

export function getMarketingDemos(limit = 8): ShowcaseEntry[] {
  return SHOWCASE_REGISTRY.filter((e) => e.published)
    .sort((a, b) => a.marketingPriority - b.marketingPriority)
    .slice(0, limit);
}

export function getQADemos(): ShowcaseEntry[] {
  return SHOWCASE_REGISTRY.filter((e) => e.qaEnabled && e.published);
}

export function getDocumentationExamples(): ShowcaseEntry[] {
  return SHOWCASE_REGISTRY.filter((e) => e.documentationExample && e.published);
}

export function getByCategory(category: string): ShowcaseEntry[] {
  return SHOWCASE_REGISTRY.filter((e) => e.category === category);
}

export function getCategories(): string[] {
  const cats = new Set(SHOWCASE_REGISTRY.map((e) => e.category));
  return Array.from(cats).sort();
}
