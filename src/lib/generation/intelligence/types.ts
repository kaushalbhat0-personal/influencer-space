import type { PipelineStage } from "@/lib/generation/contracts";

export interface ContentItem {
  id: string;
  type: "post" | "video" | "story" | "reel" | "tweet" | "article";
  text: string;
  hashtags: string[];
  mentions: string[];
  likes: number;
  comments: number;
  shares: number;
  createdAt: string;
  url: string;
}

export interface ContentSource {
  platform: string;
  username: string;
  displayName: string;
  bio: string;
  avatarUrl: string;
  followers: number;
  following: number;
  posts: number;
  engagement: number;
  content: ContentItem[];
  categories: string[];
  links: string[];
}

export interface CreatorIntelligence {
  name: string;
  username: string;
  bio: string;
  niche: string;
  subNiche: string[];
  platform: string;
  followers: number;
  engagement: number;
  contentFrequency: "daily" | "weekly" | "monthly" | "irregular";
  verified: boolean;
  confidence: number;
}

export interface BrandIntelligence {
  name: string;
  tagline: string;
  description: string;
  colors: string[];
  logo: string | null;
  existingBranding: boolean;
  brandVoice: "professional" | "casual" | "humorous" | "inspirational" | "educational";
  confidence: number;
}

export interface AudienceIntelligence {
  ageRange: string;
  primaryGender: string;
  primaryLanguage: string;
  topCountries: string[];
  interests: string[];
  incomeLevel: "low" | "medium" | "high";
  devicePreference: "mobile" | "desktop" | "mixed";
  activeHours: string[];
  confidence: number;
}

export interface ProductIntelligence {
  name: string;
  type: "physical" | "digital" | "service" | "subscription" | "experience";
  category: string;
  description: string;
  priceRange: string;
  recommended: boolean;
  reason: string;
  confidence: number;
}

export interface ContentIntelligence {
  topContentTypes: string[];
  averagePostLength: number;
  commonHashtags: string[];
  commonTopics: string[];
  postingSchedule: string;
  contentQuality: "low" | "medium" | "high";
  estimatedReadTime: number;
  confidence: number;
}

export interface SEOIntelligence {
  pageTitle: string;
  metaDescription: string;
  keywords: string[];
  focusPhrase: string;
  slug: string;
  canonical: string;
  confidence: number;
}

export interface ThemeIntelligence {
  palette: string[];
  primary: string;
  secondary: string;
  accent: string;
  mode: "light" | "dark" | "auto";
  fontPairing: string;
  borderRadius: string;
  confidence: number;
}

export interface SectionIntelligence {
  type: PipelineStage;
  priority: number;
  recommended: boolean;
  reason: string;
  order: number;
  confidence: number;
}

export interface SocialLink {
  platform: string;
  url: string;
  handle: string;
  followers: number;
  primary: boolean;
}

export interface BusinessModelIntelligence {
  type: "merch" | "digital_products" | "services" | "affiliate" | "subscription" | "mixed";
  primaryRevenueSource: string;
  monetizationChannels: string[];
  priceTier: "budget" | "mid" | "premium";
  confidence: number;
}

export interface KnowledgeGraph {
  creator: CreatorIntelligence;
  brand: BrandIntelligence;
  audience: AudienceIntelligence;
  products: ProductIntelligence[];
  content: ContentIntelligence;
  seo: SEOIntelligence;
  theme: ThemeIntelligence;
  sections: SectionIntelligence[];
  socialLinks: SocialLink[];
  businessModel: BusinessModelIntelligence;
  confidence: number;
}

export interface IntelligenceConfig {
  cacheTTLMs: number;
  minConfidenceForAutoAccept: number;
  minConfidenceForAIReturn: number;
  defaultLocale: string;
  maxContentItems: number;
}

export const THEME_PALETTES: Record<string, { primary: string; secondary: string; accent: string; mode: "light" | "dark" }> = {
  gaming: { primary: "#7C3AED", secondary: "#A78BFA", accent: "#C4B5FD", mode: "dark" },
  education: { primary: "#3B82F6", secondary: "#60A5FA", accent: "#93C5FD", mode: "light" },
  finance: { primary: "#059669", secondary: "#34D399", accent: "#6EE7B7", mode: "light" },
  fitness: { primary: "#EA580C", secondary: "#F97316", accent: "#FB923C", mode: "light" },
  music: { primary: "#DB2777", secondary: "#EC4899", accent: "#F472B6", mode: "dark" },
  travel: { primary: "#0EA5E9", secondary: "#38BDF8", accent: "#7DD3FC", mode: "light" },
  food: { primary: "#D97706", secondary: "#F59E0B", accent: "#FBBF24", mode: "light" },
  photography: { primary: "#475569", secondary: "#64748B", accent: "#94A3B8", mode: "dark" },
  technology: { primary: "#4F46E5", secondary: "#6366F1", accent: "#818CF8", mode: "dark" },
  art: { primary: "#8B5CF6", secondary: "#A78BFA", accent: "#C4B5FD", mode: "light" },
  lifestyle: { primary: "#EC4899", secondary: "#F472B6", accent: "#F9A8D4", mode: "light" },
  sports: { primary: "#2563EB", secondary: "#3B82F6", accent: "#60A5FA", mode: "light" },
  news: { primary: "#1E293B", secondary: "#334155", accent: "#475569", mode: "dark" },
  default: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", mode: "light" },
};

export const NICHE_KEYWORDS: Record<string, string[]> = {
  gaming: ["gaming", "twitch", "playthrough", "esports", "minecraft", "fortnite", "stream", "gamer", "lets play", "gameplay", "fps", "rpg", "speedrun"],
  education: ["tutorial", "course", "learn", "lesson", "educational", "how to", "guide", "class", "training", "workshop", "lecture", "study"],
  finance: ["finance", "invest", "money", "stock", "crypto", "trading", "budget", "saving", "wealth", "financial", "economy", "business"],
  fitness: ["fitness", "workout", "gym", "exercise", "health", "training", "yoga", "muscle", "diet", "nutrition", "wellness", "crossfit"],
  music: ["music", "song", "album", "concert", "guitar", "piano", "singer", "rapper", "producer", "beat", "band", "melody"],
  travel: ["travel", "trip", "vacation", "adventure", "explore", "wanderlust", "tourist", "journey", "destination", "backpack", "road trip"],
  food: ["food", "recipe", "cooking", "baking", "restaurant", "chef", "meal", "cuisine", "delicious", "kitchen", "gourmet", "bites"],
  photography: ["photography", "photo", "camera", "portrait", "landscape", "edit", "lightroom", "photographer", "shots", "capture", "lens"],
  technology: ["tech", "coding", "programming", "software", "app", "developer", "ai", "startup", "innovation", "gadget", "saas", "web3"],
  art: ["art", "drawing", "painting", "sketch", "illustration", "digital art", "creative", "design", "artist", "canvas", "brush"],
  lifestyle: ["lifestyle", "daily", "vlog", "routine", "fashion", "beauty", "home", "family", "life", "motivation", "inspiration"],
  sports: ["sports", "soccer", "football", "basketball", "tennis", "cricket", "athlete", "training", "coach", "fitness", "competition"],
  news: ["news", "breaking", "update", "report", "politics", "world", "current", "headline", "press", "media", "journalism"],
};

export const SECTION_TYPES: Record<string, PipelineStage[]> = {
  gaming: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  education: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  finance: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  fitness: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  music: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  travel: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  food: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  photography: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  technology: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  art: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  lifestyle: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  sports: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
  news: ["source_resolution", "profile_extraction", "theme_selection", "content_generation", "seo_generation", "section_composition", "website_composition"],
};

export const PRODUCT_RECOMMENDATIONS: Record<string, Array<{ name: string; type: string; category: string; priceRange: string }>> = {
  gaming: [
    { name: "Branded Merch", type: "physical", category: "Apparel", priceRange: "$20-$50" },
    { name: "Digital Wallpapers", type: "digital", category: "Digital Art", priceRange: "$5-$15" },
    { name: "Coaching Sessions", type: "service", category: "Coaching", priceRange: "$50-$200" },
  ],
  education: [
    { name: "Online Course", type: "digital", category: "Education", priceRange: "$50-$200" },
    { name: "Study Materials", type: "digital", category: "Resources", priceRange: "$10-$30" },
    { name: "1:1 Tutoring", type: "service", category: "Tutoring", priceRange: "$30-$100" },
  ],
  finance: [
    { name: "Investment Guide", type: "digital", category: "Finance", priceRange: "$20-$100" },
    { name: "Template Pack", type: "digital", category: "Tools", priceRange: "$10-$50" },
    { name: "Consultation", type: "service", category: "Consulting", priceRange: "$100-$500" },
  ],
  fitness: [
    { name: "Workout Program", type: "digital", category: "Fitness", priceRange: "$20-$80" },
    { name: "Branded Apparel", type: "physical", category: "Apparel", priceRange: "$25-$60" },
    { name: "Meal Plan", type: "digital", category: "Nutrition", priceRange: "$10-$40" },
  ],
  music: [
    { name: "Merch Store", type: "physical", category: "Apparel", priceRange: "$20-$50" },
    { name: "Beat Pack", type: "digital", category: "Music", priceRange: "$15-$60" },
    { name: "Production Course", type: "digital", category: "Education", priceRange: "$50-$200" },
  ],
  travel: [
    { name: "Travel Guide", type: "digital", category: "Guides", priceRange: "$10-$30" },
    { name: "Preset Pack", type: "digital", category: "Photography", priceRange: "$10-$25" },
    { name: "Photography Print", type: "physical", category: "Art", priceRange: "$20-$100" },
  ],
  food: [
    { name: "Recipe Book", type: "digital", category: "Cooking", priceRange: "$10-$25" },
    { name: "Branded Merch", type: "physical", category: "Kitchen", priceRange: "$15-$40" },
    { name: "Cooking Course", type: "digital", category: "Education", priceRange: "$30-$100" },
  ],
  photography: [
    { name: "Print Store", type: "physical", category: "Art", priceRange: "$20-$200" },
    { name: "Preset Pack", type: "digital", category: "Photography", priceRange: "$15-$50" },
    { name: "Workshop", type: "digital", category: "Education", priceRange: "$50-$150" },
  ],
  technology: [
    { name: "SaaS Product", type: "digital", category: "Software", priceRange: "$10-$100/mo" },
    { name: "API Access", type: "subscription", category: "Developer Tools", priceRange: "$20-$200/mo" },
    { name: "Code Templates", type: "digital", category: "Developer Resources", priceRange: "$10-$50" },
  ],
  art: [
    { name: "Print Store", type: "physical", category: "Art", priceRange: "$20-$200" },
    { name: "Digital Downloads", type: "digital", category: "Art", priceRange: "$5-$30" },
    { name: "Commission Work", type: "service", category: "Art", priceRange: "$50-$500" },
  ],
  lifestyle: [
    { name: "Branded Merch", type: "physical", category: "Apparel", priceRange: "$20-$50" },
    { name: "Digital Planner", type: "digital", category: "Productivity", priceRange: "$10-$25" },
    { name: "Coaching", type: "service", category: "Coaching", priceRange: "$50-$200" },
  ],
  sports: [
    { name: "Branded Apparel", type: "physical", category: "Apparel", priceRange: "$25-$60" },
    { name: "Training Program", type: "digital", category: "Fitness", priceRange: "$20-$80" },
    { name: "Coaching", type: "service", category: "Coaching", priceRange: "$50-$200" },
  ],
  news: [
    { name: "Newsletter", type: "subscription", category: "Media", priceRange: "$5-$20/mo" },
    { name: "Premium Content", type: "digital", category: "Media", priceRange: "$10-$30" },
    { name: "Ad Space", type: "service", category: "Advertising", priceRange: "$100-$1000" },
  ],
};

export function formatConfidence(value: number): string {
  const pct = Math.round(value * 100);
  if (pct >= 90) return "very_high";
  if (pct >= 70) return "high";
  if (pct >= 50) return "medium";
  if (pct >= 30) return "low";
  return "very_low";
}
