/**
 * Import Provider Registry — IMPLEMENTATION-55
 *
 * Canonical registry for creator import sources. UI renders providers
 * dynamically from this registry. No hardcoded provider buttons.
 *
 * Every provider outputs a canonical CreatorProfile that feeds into the
 * existing 13-stage Intelligence Pipeline unchanged.
 */

export interface CreatorProfile {
  platform: string;
  creatorName: string;
  bio?: string;
  avatarUrl?: string;
  followers?: number;
  website?: string;
  socialLinks?: Array<{ platform: string; url: string }>;
  category?: string;
  niche?: string;
  products?: Array<{ name: string; price?: number; description: string }>;
  brand?: { name: string; tagline?: string; colors?: { primary: string; secondary: string } };
  rawSource: string;
  metadata?: Record<string, unknown>;
}

export interface ImportProvider {
  id: string;
  label: string;
  description: string;
  icon: string;
  inputType: "url" | "text" | "none";
  placeholder: string;
  estimatedTime: string;
  capabilities: string[];
  available: boolean;
  /** Extracts a canonical CreatorProfile from the input. */
  acquire(input: string, options?: { name?: string }): Promise<CreatorProfile>;
  /** Validates whether the input matches this provider. */
  matches?(input: string): boolean;
}

const providers: Map<string, ImportProvider> = new Map();

export function registerImportProvider(provider: ImportProvider): void {
  if (providers.has(provider.id)) {
    console.warn(`Import provider '${provider.id}' is already registered. Overwriting.`);
  }
  providers.set(provider.id, provider);
}

export function getImportProvider(id: string): ImportProvider | undefined {
  return providers.get(id);
}

export function getAllImportProviders(): ImportProvider[] {
  return Array.from(providers.values());
}

export function getAvailableImportProviders(): ImportProvider[] {
  return getAllImportProviders().filter((p) => p.available);
}

export function detectProvider(input: string): ImportProvider | undefined {
  return getAllImportProviders().find((p) => p.matches?.(input));
}
