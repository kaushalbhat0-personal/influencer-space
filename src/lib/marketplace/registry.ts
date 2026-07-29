import type { MarketplacePackage, MarketplaceQuery, MarketplaceInstallRecord, MarketplaceStats, MarketplaceProviderInfo } from "./types";
import type { MarketplaceProvider } from "./provider";
import { capabilityService } from "@/lib/capabilities/service";
import { RegistryCache } from "@/lib/registry/cache";

export class MarketplaceRegistry {
  private providers: Map<string, MarketplaceProvider> = new Map();
  private installs: Map<string, MarketplaceInstallRecord> = new Map();
  private queryCache = new RegistryCache<MarketplacePackage[]>("marketplace:query");
  private changeHandlers: Array<(event: { type: "registered" | "removed" | "updated"; packageId: string }) => void> = [];

  /** Register a marketplace provider. Providers are indexed immediately. */
  registerProvider(provider: MarketplaceProvider): void {
    if (this.providers.has(provider.type)) {
      throw new Error(`Marketplace provider "${provider.type}" is already registered`);
    }
    provider.initialize();
    this.providers.set(provider.type, provider);
    this.queryCache.clear();
  }

  /** Remove a provider and all its packages. */
  removeProvider(type: string): boolean {
    const removed = this.providers.delete(type);
    if (removed) {
      this.queryCache.clear();
    }
    return removed;
  }

  /** Get info about all registered providers. */
  getProviders(): MarketplaceProviderInfo[] {
    return Array.from(this.providers).map(([type, provider]) => ({
      type,
      name: provider.name,
      packageCount: provider.getAll().length,
    }));
  }

  /** Collect all packages from all providers, optionally filtered. */
  getAll(query?: MarketplaceQuery): MarketplacePackage[] {
    const all = this.collectAll();

    if (!query) return all;

    let filtered = all;

    if (query.type) {
      filtered = filtered.filter((p) => p.type === query.type);
    }
    if (query.category) {
      filtered = filtered.filter((p) => p.category === query.category);
    }
    if (query.tags && query.tags.length > 0) {
      filtered = filtered.filter((p) => query.tags!.some((t) => p.tags.includes(t)));
    }
    if (query.free !== undefined) {
      filtered = filtered.filter((p) => p.pricing.free === query.free);
    }
    if (query.featured !== undefined) {
      filtered = filtered.filter((p) => p.featured === query.featured);
    }
    if (query.capabilities && query.capabilities.length > 0) {
      filtered = filtered.filter((p) =>
        p.requiredCapabilities.length === 0 ||
        query.capabilities!.some((c) => p.requiredCapabilities.includes(c))
      );
    }
    if (query.planCode) {
      filtered = filtered.filter((p) =>
        p.requiredCapabilities.length === 0 ||
        p.requiredCapabilities.every((cap) => capabilityService.can(query.planCode!, cap).allowed)
      );
    }
    if (query.compatibleWith) {
      const source = this.collectAll().find((p) => p.id === query.compatibleWith);
      if (source) {
        filtered = filtered.filter((p) =>
          p.id !== query.compatibleWith &&
          source.compatiblePackages.includes(p.id)
        );
      } else {
        filtered = [];
      }
    }
    if (query.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.tags.some((t) => t.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    // Sorting
    if (query.sort) {
      filtered = [...filtered].sort((a, b) => {
        switch (query.sort) {
          case "name": return a.name.localeCompare(b.name);
          case "rating": return (b.rating ?? 0) - (a.rating ?? 0);
          case "downloads": return (b.downloadCount ?? 0) - (a.downloadCount ?? 0);
          case "newest": return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          case "updated": return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          default: return 0;
        }
      });
    }

    // Pagination
    if (query.offset) {
      filtered = filtered.slice(query.offset);
    }
    if (query.limit) {
      filtered = filtered.slice(0, query.limit);
    }

    return filtered;
  }

  /** Look up a single package by its marketplace ID. */
  getById(id: string): MarketplacePackage | undefined {
    return this.collectAll().find((p) => p.id === id);
  }

  /** Get all packages of a given type. */
  getByType(type: string): MarketplacePackage[] {
    return this.getAll({ type: type as MarketplacePackage["type"] });
  }

  /** Get all unique categories across all packages, optionally filtered by type. */
  getCategories(type?: string): string[] {
    const all = type ? this.getByType(type) : this.collectAll();
    return Array.from(new Set(all.map((p) => p.category))).sort();
  }

  /** Simple text search. */
  search(query: string): MarketplacePackage[] {
    return this.getAll({ search: query });
  }

  /** Get featured packages. */
  getFeatured(type?: string): MarketplacePackage[] {
    return this.getAll({ featured: true, type: type as MarketplacePackage["type"] });
  }

  /** Get packages accessible to a given plan code (filters by capabilities). */
  getAccessible(planCode: string): MarketplacePackage[] {
    return this.getAll({ planCode });
  }

  /** Get packages that require capabilities (premium). */
  getPremium(): MarketplacePackage[] {
    return this.collectAll().filter((p) => p.requiredCapabilities.length > 0);
  }

  /** Get free packages. */
  getFree(): MarketplacePackage[] {
    return this.collectAll().filter((p) => p.pricing.free);
  }

  /** Get packages compatible with a given package ID. */
  getCompatible(packageId: string): MarketplacePackage[] {
    return this.getAll({ compatibleWith: packageId });
  }

  // ── Installation tracking ──

  /** Record that a package was installed. */
  recordInstall(packageId: string, metadata?: Record<string, unknown>): void {
    if (!this.getById(packageId)) return;
    this.installs.set(packageId, {
      packageId,
      installedAt: new Date().toISOString(),
      metadata,
    });
    this.emitChange({ type: "updated", packageId });
  }

  /** Get all installed packages. */
  getInstalled(): MarketplacePackage[] {
    const installedIds = Array.from(this.installs.keys());
    return this.collectAll().filter((p) => installedIds.includes(p.id));
  }

  /** Check if a package is installed. */
  isInstalled(packageId: string): boolean {
    return this.installs.has(packageId);
  }

  /** Get install record for a package. */
  getInstallRecord(packageId: string): MarketplaceInstallRecord | undefined {
    return this.installs.get(packageId);
  }

  // ── Events ──

  /** Subscribe to package changes (register, update, remove). */
  onPackageChange(handler: (event: { type: "registered" | "removed" | "updated"; packageId: string }) => void): () => void {
    this.changeHandlers.push(handler);
    return () => {
      this.changeHandlers = this.changeHandlers.filter((h) => h !== handler);
    };
  }

  // ── Stats ──

  /** Get marketplace statistics. */
  getStats(): MarketplaceStats {
    const all = this.collectAll();
    const byType = {} as Record<string, number>;
    const byCategory = {} as Record<string, number>;
    let featuredCount = 0;
    let premiumCount = 0;
    let freeCount = 0;

    for (const pkg of all) {
      byType[pkg.type] = (byType[pkg.type] ?? 0) + 1;
      byCategory[pkg.category] = (byCategory[pkg.category] ?? 0) + 1;
      if (pkg.featured) featuredCount++;
      if (pkg.requiredCapabilities.length > 0) premiumCount++;
      if (pkg.pricing.free) freeCount++;
    }

    return {
      totalPackages: all.length,
      byType: byType as MarketplaceStats["byType"],
      byCategory,
      providerCount: this.providers.size,
      providers: this.getProviders(),
      featuredCount,
      premiumCount,
      freeCount,
    };
  }

  // ── Internal ──

  private collectAll(): MarketplacePackage[] {
    const all: MarketplacePackage[] = [];
    this.providers.forEach((provider) => {
      all.push(...provider.getAll());
    });
    return all.map((pkg) => ({
      ...pkg,
      downloadCount: this.installs.has(pkg.id)
        ? Array.from(this.installs.values()).filter((i) => i.packageId === pkg.id).length
        : 0,
    }));
  }

  private emitChange(event: { type: "registered" | "removed" | "updated"; packageId: string }): void {
    this.changeHandlers.forEach((handler) => {
      try { handler(event); } catch { /* noop */ }
    });
  }
}

export const marketplaceRegistry = new MarketplaceRegistry();
