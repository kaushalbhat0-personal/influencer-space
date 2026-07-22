import { buildStorefrontUrl } from "@/lib/config/platform";
import { publishService } from "@/lib/website";

export interface ShowcaseSite {
  id: string;
  name: string;
  category: string;
  description: string;
  storefrontUrl: string;
  products?: { name: string; price: number }[];
  featured?: boolean;
}

const CATEGORIES = [
  "Gaming", "Fitness", "Music", "Food", "Education",
  "Technology", "Lifestyle", "Fashion", "Art", "Business",
];

export class ShowcaseService {
  async getPublished(filters?: { category?: string; search?: string }): Promise<ShowcaseSite[]> {
    const published = await publishService.listByState("live");

    let sites: ShowcaseSite[] = published.map((ps) => ({
      id: ps.website.tenant.subdomain,
      name: ps.website.brand?.name || ps.website.tenant.name,
      category: this.inferCategory(ps.website.brand?.name || ""),
      description: ps.website.brand?.bio || ps.website.brand?.tagline || "Creator storefront",
      storefrontUrl: buildStorefrontUrl(ps.website.tenant.subdomain),
      products: [],
    }));

    if (sites.length === 0) {
      sites = this.getFallbackSites();
    }

    if (filters?.category) sites = sites.filter((s) => s.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      sites = sites.filter((s) => s.name.toLowerCase().includes(q));
    }

    return sites;
  }

  async getCategories(): Promise<string[]> {
    const sites = await this.getPublished();
    const cats = new Set(sites.map((s) => s.category));
    return CATEGORIES.filter((c) => cats.has(c));
  }

  private inferCategory(name: string): string {
    const lower = name.toLowerCase();
    if (lower.includes("gaming") || lower.includes("game") || lower.includes("stream")) return "Gaming";
    if (lower.includes("fit") || lower.includes("health") || lower.includes("wellness")) return "Fitness";
    if (lower.includes("music") || lower.includes("beat") || lower.includes("audio")) return "Music";
    if (lower.includes("food") || lower.includes("chef") || lower.includes("recipe")) return "Food";
    if (lower.includes("tech") || lower.includes("code") || lower.includes("dev")) return "Technology";
    if (lower.includes("fashion") || lower.includes("style")) return "Fashion";
    if (lower.includes("art") || lower.includes("photo") || lower.includes("design")) return "Art";
    return "Creator";
  }

  private getFallbackSites(): ShowcaseSite[] {
    return [
      { id: "gaming-pro", name: "GamingLegend Pro", category: "Gaming", description: "Premium gaming creator storefront", storefrontUrl: buildStorefrontUrl("gaminglegend-pro"), products: [], featured: true },
      { id: "fitness-coach", name: "FitnessCoach India", category: "Fitness", description: "Transform your body with expert guidance", storefrontUrl: buildStorefrontUrl("fitnesscoach-india"), products: [] },
      { id: "tech-review", name: "TechReview Zone", category: "Technology", description: "Latest gadgets and tech reviews", storefrontUrl: buildStorefrontUrl("techreview-zone"), products: [] },
      { id: "food-vlogger", name: "FoodVlogger Official", category: "Food", description: "Delicious recipes and food adventures", storefrontUrl: buildStorefrontUrl("foodvlogger-official"), products: [] },
      { id: "music-artist", name: "MusicArtist Official", category: "Music", description: "Original music and exclusive content", storefrontUrl: buildStorefrontUrl("musicartist-official"), products: [] },
    ];
  }
}

export const showcaseService = new ShowcaseService();
