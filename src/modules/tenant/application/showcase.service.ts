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
  /**
   * RCCF-MKT-10 P3-C: /showcase claims "Every site is a real, published
   * creator storefront" — so this service returns ONLY real published sites.
   * The previous fabricated demo fallback rendered invented brand names and
   * dead URLs as if they were customer sites; it is removed. With zero
   * published sites the page renders an honest empty state.
   */
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
    if (filters?.category) sites = sites.filter((s) => s.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      sites = sites.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return sites;
  }

  async getCategories(): Promise<string[]> {
    // RCCF-MKT-10 P3-C: with no published sites there are no categories to
    // offer — returning [] avoids rendering filter pills that can only lead
    // to an empty result set.
    const published = await websiteRepository.listPublished();
    if (published.length === 0) return [];
    const used = new Set(published.map((ps) => this.inferCategory(ps.brand?.name || "")));
    return CATEGORIES.filter((c) => used.has(c));
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
}

export const showcaseService = new ShowcaseService();
