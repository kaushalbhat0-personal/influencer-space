import type { ThemeDefinition } from "./types";

export interface ThemePackage {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  previewImage?: string;
  tags: string[];
  tokens: ThemeDefinition;
  compatibility: {
    minBuilderVersion: string;
    maxBuilderVersion?: string;
  };
  license?: string;
  homepage?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, unknown>;
}

export interface ThemePresetEntry {
  package: ThemePackage;
  installedAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
  source: "local" | "marketplace" | "imported";
}

export interface ThemePresetQuery {
  search?: string;
  tags?: string[];
  source?: ThemePresetEntry["source"];
  active?: boolean;
}

export interface PackageValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface MarketplaceHook {
  name: string;
  description: string;
  handler: (pkg: ThemePackage) => Promise<void>;
}

export interface MarketplaceHooks {
  onInstall: MarketplaceHook[];
  onUpdate: MarketplaceHook[];
  onRemove: MarketplaceHook[];
  onPreview: MarketplaceHook[];
}
