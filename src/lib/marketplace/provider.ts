import type { MarketplacePackage } from "./types";

export interface MarketplaceProvider {
  /** Unique provider type identifier (e.g. "built-in", "marketplace-website") */
  readonly type: string;

  /** Human-readable provider name */
  readonly name: string;

  /** Called once when the provider is registered with MarketplaceRegistry */
  initialize(): void | Promise<void>;

  /** Return all packages this provider knows about */
  getAll(): MarketplacePackage[];

  /** Look up a single package by its marketplace ID */
  getById(id: string): MarketplacePackage | undefined;

  /** Return all packages of a given type */
  getByType(type: string): MarketplacePackage[];

  /** Simple text search across name, description, tags */
  search(query: string): MarketplacePackage[];

  /** Called periodically or on demand to refresh package list */
  refresh?(): void | Promise<void>;
}
