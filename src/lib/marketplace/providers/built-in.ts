import type { MarketplacePackage } from "../types";
import type { MarketplaceProvider } from "../provider";
import { themeRegistry } from "@/lib/theme/registry-new";
import type { ThemeDefinition } from "@/lib/theme/types-new";
import { blueprintRegistry } from "@/lib/blueprint/registry";

const PROVIDER_TYPE = "built-in";
const PACKAGE_PREFIXES: Record<string, string> = {
  theme: "theme:",
  blueprint: "blueprint:",
};

function themeToPackage(theme: ThemeDefinition): MarketplacePackage {
  const now = new Date().toISOString();
  const isPremium = theme.premium || (theme.requiredCapabilities?.includes("premium_themes") ?? false);

  const compatiblePackages: string[] = [
    ...(theme.supportedBlueprints ?? []).map((bp) => `${PACKAGE_PREFIXES.blueprint}${bp}`),
  ];

  const slug = theme.slug;
  const previewImages: string[] = [
    ...(theme.previewImage ? [theme.previewImage] : []),
    `/themes/${slug}/preview-desktop.png`,
    `/themes/${slug}/preview-tablet.png`,
    `/themes/${slug}/preview-mobile.png`,
  ];

  return {
    id: `${PACKAGE_PREFIXES.theme}${theme.id}`,
    type: "theme",
    name: theme.name,
    description: theme.description,
    version: theme.version,
    author: {
      name: theme.author.name,
      type: "platform",
      id: theme.author.name.toLowerCase().replace(/\s+/g, "-"),
      url: theme.author.url,
    },
    category: theme.category,
    tags: theme.tags,
    previewImages,
    thumbnail: theme.thumbnail,
    pricing: {
      free: !isPremium,
      price: isPremium ? 9.99 : undefined,
      currency: isPremium ? "USD" : undefined,
    },
    compatiblePackages,
    requiredCapabilities: isPremium ? ["premium_themes"] : [],
    source: "built-in",
    sourceId: theme.id,
    sourceRegistry: "theme",
    createdAt: theme.releaseDate ?? now,
    updatedAt: theme.updatedAt ?? now,
    featured: theme.featured ?? false,
    downloadCount: 0,
    rating: theme.rating,
  };
}

function blueprintToPackage(bp: {
  id: string; name: string; description: string; version: string;
  author: { name: string; url?: string }; category: string; tags: string[];
  thumbnail?: string; previewImage?: string;
  recommendedThemes: string[]; compatibleThemes: string[];
  requiredCapabilities: string[];
  createdAt?: string; updatedAt?: string;
}): MarketplacePackage {
  const now = new Date().toISOString();
  const compatiblePackages = [
    ...bp.recommendedThemes.map((t) => `${PACKAGE_PREFIXES.theme}${t}`),
    ...bp.compatibleThemes.map((t) => `${PACKAGE_PREFIXES.theme}${t}`),
  ];

  return {
    id: `${PACKAGE_PREFIXES.blueprint}${bp.id}`,
    type: "blueprint",
    name: bp.name,
    description: bp.description,
    version: bp.version,
    author: {
      name: bp.author.name,
      type: "platform",
      id: bp.author.name.toLowerCase().replace(/\s+/g, "-"),
      url: bp.author.url,
    },
    category: bp.category,
    tags: bp.tags,
    previewImages: bp.previewImage ? [bp.previewImage] : [],
    thumbnail: bp.thumbnail,
    pricing: { free: true },
    compatiblePackages,
    requiredCapabilities: bp.requiredCapabilities,
    source: "built-in",
    sourceId: bp.id,
    sourceRegistry: "blueprint",
    createdAt: bp.createdAt ?? now,
    updatedAt: bp.updatedAt ?? now,
    featured: bp.tags.includes("featured"),
    downloadCount: 0,
  };
}

export class BuiltInMarketplaceProvider implements MarketplaceProvider {
  readonly type = PROVIDER_TYPE;
  readonly name = "Built-in";
  private initialized = false;
  private themes: MarketplacePackage[] = [];
  private blueprints: MarketplacePackage[] = [];
  private all: MarketplacePackage[] = [];

  initialize(): void {
    if (this.initialized) return;
    this.refresh();
    this.initialized = true;
  }

  refresh(): void {
    this.themes = themeRegistry.getAll().map((theme) => themeToPackage(theme));
    this.blueprints = blueprintRegistry.getAll().map((bp) =>
      blueprintToPackage(bp as unknown as Parameters<typeof blueprintToPackage>[0]),
    );
    this.all = [...this.themes, ...this.blueprints];
  }

  getAll(): MarketplacePackage[] {
    if (!this.initialized) this.initialize();
    return this.all;
  }

  getById(id: string): MarketplacePackage | undefined {
    return this.getAll().find((p) => p.id === id);
  }

  getByType(type: string): MarketplacePackage[] {
    return this.getAll().filter((p) => p.type === type);
  }

  search(query: string): MarketplacePackage[] {
    const q = query.toLowerCase();
    return this.getAll().filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q),
    );
  }
}

export const builtInMarketplaceProvider = new BuiltInMarketplaceProvider();
