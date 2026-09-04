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
  // RCCF-VISUAL-03B: Spower Gaming is NOT a canonical showcase reference.
  // Canonical references are Mystic Minutes and North Star. Spower is excluded
  // from the active showcase experience even if published.
  private static readonly BLOCKED_SUBDOMAINS = new Set(["spower-gaming", "spower_gaming"]);
  private static readonly BLOCKED_NAME_FRAGMENT = "spower";

  private isBlocked(site: { id: string; name: string }): boolean {
    if (ShowcaseService.BLOCKED_SUBDOMAINS.has(site.id.toLowerCase())) return true;
    if (site.name.toLowerCase().includes(ShowcaseService.BLOCKED_NAME_FRAGMENT)) return true;
    return false;
  }
  /**
   * RCCF-MKT-10 P3-C: /showcase claims "Every site is a real, published
   * creator storefront" — so this service returns ONLY real published sites.
   * The previous fabricated demo fallback rendered invented brand names and
   * dead URLs as if they were customer sites; it is removed. With zero
   * published sites the page renders an honest empty state.
   * RCCF-VISUAL-03B: single DB round-trip; categories derived from same data
   * to avoid the ~2s double-query bottleneck. Spower Gaming filtered out.
   */
  async getPublished(filters?: { category?: string; search?: string }): Promise<ShowcaseSite[]> {
    const published = await websiteRepository.listPublished();
    let sites: ShowcaseSite[] = published
      .map((ps) => ({
        id: ps.tenant.subdomain,
        name: ps.brand?.name || ps.tenant.name,
        category: this.inferCategory(ps.brand?.name || ""),
        description: ps.brand?.bio || ps.brand?.tagline || "Creator storefront",
        storefrontUrl: buildStorefrontUrl(ps.tenant.subdomain),
        products: [],
      }))
      .filter((s) => !this.isBlocked(s));
    if (filters?.category) sites = sites.filter((s) => s.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      sites = sites.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return sites;
  }

  /**
   * RCCF-VISUAL-03B: optimized single-query path — fetch once, derive categories.
   * Used by the showcase page to avoid the previous double listPublished() (~2s).
   */
  async getPublishedWithCategories(filters?: { category?: string; search?: string }): Promise<{ sites: ShowcaseSite[]; categories: string[] }> {
    const published = await websiteRepository.listPublished();
    const allSites: ShowcaseSite[] = published
      .map((ps) => ({
        id: ps.tenant.subdomain,
        name: ps.brand?.name || ps.tenant.name,
        category: this.inferCategory(ps.brand?.name || ""),
        description: ps.brand?.bio || ps.brand?.tagline || "Creator storefront",
        storefrontUrl: buildStorefrontUrl(ps.tenant.subdomain),
        products: [],
      }))
      .filter((s) => !this.isBlocked(s));

    const categories = allSites.length === 0 ? [] : CATEGORIES.filter((c) => new Set(allSites.map((s) => s.category)).has(c));

    let sites = allSites;
    if (filters?.category) sites = sites.filter((s) => s.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      sites = sites.filter((s) => s.name.toLowerCase().includes(q) || s.description.toLowerCase().includes(q));
    }
    return { sites, categories };
  }

  async getCategories(): Promise<string[]> {
    // RCCF-MKT-10 P3-C: with no published sites there are no categories to
    // offer — returning [] avoids rendering filter pills that can only lead
    // to an empty result set.
    // RCCF-VISUAL-03B: delegates to single-query path for consistency.
    const { categories } = await this.getPublishedWithCategories();
    return categories;
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
