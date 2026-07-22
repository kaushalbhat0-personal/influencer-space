import { prisma } from "@/lib/prisma";
import { DEMO_SEEDS } from "@/lib/demo/seeds";
import { getPlatformConfig } from "@/lib/config/platform";
import type { DemoSeed } from "@/lib/demo/types";

export interface ShowcaseSite {
  id: string;
  name: string;
  industry: string;
  category: string;
  description: string;
  products: { name: string; price: number }[];
  storefrontUrl: string;
  featured: boolean;
}

const CATEGORY_MAP: Record<string, string> = {
  "Health & Wellness": "Health & Wellness",
  "Creative": "Creative",
  "Business Services": "Business Services",
  "Education & Finance": "Education & Finance",
  "Food & Hospitality": "Food & Hospitality",
  "Healthcare": "Healthcare",
  "Lifestyle": "Lifestyle",
  "Retail": "Retail",
  "Technology": "Technology",
  "Non-Profit": "Non-Profit",
  "Creator Economy": "Creator Economy",
};

function seedCategory(seed: DemoSeed | undefined): string {
  if (!seed) return "General";
  return CATEGORY_MAP[seed.industry] || seed.industry || "General";
}

function seedFeatured(seed: DemoSeed | undefined, index: number): boolean {
  if (!seed) return index < 3;
  return index < 3;
}

export class ShowcaseService {
  async getPublished(filters?: { category?: string; search?: string; featured?: boolean }): Promise<ShowcaseSite[]> {
    const seeds = DEMO_SEEDS;
    const demoSettings = await prisma.setting.findMany({
      where: { key: "demo_metadata" },
      select: { tenantId: true, value: true },
    });

    const publishedTenants = demoSettings
      .filter((s) => {
        const val = s.value as Record<string, unknown>;
        return val.published === true;
      })
      .map((s) => s.tenantId);

    let sites: ShowcaseSite[] = [];

    if (publishedTenants.length > 0) {
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: publishedTenants } },
        select: { id: true, name: true, subdomain: true },
      });

      sites = tenants.map((t) => {
        const setting = demoSettings.find((s) => s.tenantId === t.id);
        const val = setting?.value as Record<string, unknown> | undefined;
        const seedId = val?.seedId as string | undefined;
        const seed = seeds.find((s) => s.id === seedId);
        return {
          id: t.id,
          name: t.name,
          industry: seed?.industry || "Creator",
          category: seedCategory(seed),
          description: seed?.content.bio || `${t.subdomain}.${getPlatformConfig().baseDomain}`,
          products: seed?.products.slice(0, 3).map((p) => ({ name: p.name, price: p.price })) || [],
          storefrontUrl: `${t.subdomain}.${getPlatformConfig().baseDomain}`,
          featured: seedFeatured(seed, seeds.indexOf(seed!)),
        };
      });
    }

    if (sites.length === 0) {
      sites = seeds.slice(0, 6).map((seed, i) => ({
        id: seed.id,
        name: seed.brand.name,
        industry: seed.industry,
        category: seedCategory(seed),
        description: seed.content.bio,
        products: seed.products.slice(0, 3).map((p) => ({ name: p.name, price: p.price })),
        storefrontUrl: `${seed.id}.${getPlatformConfig().baseDomain}`,
        featured: i < 3,
      }));
    }

    sites.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

    if (filters?.category) sites = sites.filter((s) => s.category === filters.category);
    if (filters?.search) {
      const q = filters.search.toLowerCase();
      sites = sites.filter((s) => s.name.toLowerCase().includes(q) || s.industry.toLowerCase().includes(q));
    }
    if (filters?.featured) sites = sites.filter((s) => s.featured);

    return sites;
  }

  async getCategories(): Promise<string[]> {
    const sites = await this.getPublished();
    const catMap: Record<string, true> = {};
    sites.forEach((s) => catMap[s.category] = true);
    return Object.keys(catMap).sort();
  }

  async getFeatured(): Promise<ShowcaseSite[]> {
    return this.getPublished({ featured: true });
  }
}

export const showcaseService = new ShowcaseService();
