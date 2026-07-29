export type PackageType =
  | "theme"
  | "blueprint"
  | "component"
  | "section"
  | "ai-pack"
  | "agency-pack";

export type PackageAuthorType = "platform" | "agency" | "marketplace";

export interface MarketplacePackage {
  /** Globally unique ID within the marketplace (e.g. "theme:com.creatos.neon-dark") */
  id: string;

  /** Package type discriminator */
  type: PackageType;

  /** Human-readable name */
  name: string;

  /** Short description */
  description: string;

  /** SemVer */
  version: string;

  /** Author information */
  author: {
    name: string;
    type: PackageAuthorType;
    id: string;
    url?: string;
  };

  /** Normalized category (e.g. "dark", "minimal", "creator", "portfolio") */
  category: string;

  /** Searchable tags */
  tags: string[];

  /** Preview images / screenshots */
  previewImages: string[];

  /** Optional thumbnail (smaller than preview) */
  thumbnail?: string;

  /** Pricing metadata */
  pricing: {
    free: boolean;
    price?: number;
    currency?: string;
  };

  /** IDs of other marketplace packages this is compatible with */
  compatiblePackages: string[];

  /** Capability IDs required to use this package */
  requiredCapabilities: string[];

  /** The provider that sourced this package */
  source: string;

  /** Original ID in the source registry */
  sourceId: string;

  /** Source registry type */
  sourceRegistry: "theme" | "blueprint" | "component" | "external";

  /** When this package was installed */
  installedAt?: string;

  /** Arbitrary metadata set at install time */
  installMetadata?: Record<string, unknown>;

  /** Featured on marketplace home */
  featured?: boolean;

  /** Recommended for current user context */
  recommended?: boolean;

  /** Aggregate rating (0-5) */
  rating?: number;

  /** Download / install count */
  downloadCount?: number;

  /** ISO date when the package was first indexed */
  createdAt: string;

  /** ISO date when the package was last updated */
  updatedAt: string;
}

export interface MarketplaceQuery {
  type?: PackageType;
  category?: string;
  tags?: string[];
  search?: string;
  free?: boolean;
  capabilities?: string[];
  planCode?: string;
  compatibleWith?: string;
  featured?: boolean;
  sort?: "name" | "rating" | "downloads" | "newest" | "updated";
  limit?: number;
  offset?: number;
}

export interface MarketplaceInstallRecord {
  packageId: string;
  installedAt: string;
  metadata?: Record<string, unknown>;
}

export interface MarketplaceProviderInfo {
  type: string;
  name: string;
  packageCount: number;
}

export interface MarketplaceStats {
  totalPackages: number;
  byType: Record<PackageType, number>;
  byCategory: Record<string, number>;
  providerCount: number;
  providers: MarketplaceProviderInfo[];
  featuredCount: number;
  premiumCount: number;
  freeCount: number;
}
