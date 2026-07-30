import { buildStorefrontUrl } from "@/lib/config/platform";
import { websiteRepository } from "@/modules/tenant/infrastructure/website-repository";

export interface ShowcaseSite {
  id: string;
  name: string;
  category: string;
  description: string;
  storefrontUrl: string;
  products?: { name: string; price: number }[];
  featured?: boolean;
}

const CATEGORIES = ["Gaming", "Fitness", "Music", "Food", "Education",
                    "Technology", "Lifestyle", "Fashion", "Art", "Business"];

export class ShowcaseService {
  async getPublished(filters?: { category?: string; search?: string }): Promise<ShowcaseSite[]> {
    const published = await websiteRepository.listPublished();
    let sites: ShowcaseSite[] = published.map((ps) => ({
      id: ps.tenant.subdomain,
      name: ps.brand?.name || ps.tenant.name,
      category: this.inferCategory(ps.brand?.name || ""),
      description: ps.brand?.bio || ps.brand?.tagline || "Creator storefront",
      storefrontUrl: buildStorefrontUrl(ps.tenant.subdomain),
      products: [],
    }));
    if (sites.length === 0) sites = this.getFallbackSites();
    if (filters?.category) sites = sites.filter((s) => s.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      sites = sites.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return sites;
  }

  async getCategories(): Promise<string[]> {
    const published = await websiteRepository.listPublished();
    const used = new Set(published.map((ps) => this.inferCategory(ps.brand?.name || "")));
    return CATEGORIES.filter((c) => used.has(c)).length > 0
      ? CATEGORIES.filter((c) => used.has(c))
      : CATEGORIES;
  }

  private inferCategory(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("game") || n.includes("stream")) return "Gaming";
    if (n.includes("fit") || n.includes("health") || n.includes("yoga")) return "Fitness";
    if (n.includes("music") || n.includes("podcast") || n.includes("dj")) return "Music";
    if (n.includes("food") || n.includes("chef") || n.includes("cook")) return "Food";
    if (n.includes("teach") || n.includes("coach") || n.includes("learn")) return "Education";
    if (n.includes("tech") || n.includes("dev") || n.includes("code")) return "Technology";
    if (n.includes("fashion") || n.includes("style") || n.includes("beauty")) return "Fashion";
    if (n.includes("art") || n.includes("photo") || n.includes("design")) return "Art";
    if (n.includes("business") || n.includes("consult") || n.includes("agency")) return "Business";
    return "Lifestyle";
  }

  private getFallbackSites(): ShowcaseSite[] {
    return [
      { id: "gamer-demo", name: "NexusGamer", category: "Gaming", description: "Pro gaming highlights and setup tours", storefrontUrl: "https://gamer-demo.creatos.com" },
      { id: "fitness-demo", name: "FitWithZara", category: "Fitness", description: "Workout programs and nutrition guides", storefrontUrl: "https://fitness-demo.creatos.com" },
      { id: "music-demo", name: "DJElectra", category: "Music", description: "Electronic music and live mixes", storefrontUrl: "https://music-demo.creatos.com" },
      { id: "food-demo", name: "Chef Marco", category: "Food", description: "Italian recipes and cooking classes", storefrontUrl: "https://food-demo.creatos.com" },
      { id: "art-demo", name: "ArtByMaya", category: "Art", description: "Digital art and commissioned portraits", storefrontUrl: "https://art-demo.creatos.com" },
    ];
  }
}

export const showcaseService = new ShowcaseService();
