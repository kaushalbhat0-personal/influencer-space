/**
 * Unified Profile Acquisition — IMPLEMENTATION-31.
 *
 * Reusable adapter contract + capability model + diagnostics for acquiring and
 * NORMALIZING rich profile data from every supported platform into the existing
 * ContentSource. Adapters own validation/normalization/capabilities/fallbacks;
 * the pipeline (KnowledgeBuilder, PersonaEngine, ExperienceProfileBuilder)
 * is untouched. No LLM, no invented values, no duplicate profile models.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";

export type PlatformId =
  | "youtube"
  | "instagram"
  | "tiktok"
  | "linkedin"
  | "twitter"
  | "twitch"
  | "website"
  | "manual";

/**
 * What an adapter can legitimately provide. Consumers must NOT assume every
 * platform has followers/categories/recent content — they read capabilities
 * instead, so richer connectors (or premium integrations) can be added later
 * without changing the pipeline.
 */
export interface AdapterCapabilities {
  supportsDisplayName: boolean;
  supportsBio: boolean;
  supportsFollowers: boolean;
  supportsFollowing: boolean;
  supportsPostCount: boolean;
  supportsVerification: boolean;
  supportsWebsite: boolean;
  supportsRecentContent: boolean;
  /** Avatar/banner media URLs. */
  supportsMedia: boolean;
  supportsCategories: boolean;
  supportsLanguages: boolean;
  supportsLocation: boolean;
  supportsExternalLinks: boolean;
}

export interface AcquireOptions {
  creatorName?: string;
  /** Detected platform (detectPlatform). Adapters normalize into this. */
  platform?: PlatformId;
}

export interface AdapterResult {
  /** The canonical ContentSource — always returned by adapters. */
  source: ContentSource;
  /** Optional adapter-specific metadata (e.g. raw YouTube channel meta). */
  meta?: unknown;
  /** Adapter-level warnings (e.g. degraded fetch) surfaced into diagnostics. */
  warnings?: string[];
}

/**
 * A platform adapter. Owns validation, normalization, capability reporting,
 * error handling and platform-specific parsing. Returns the EXISTING
 * ContentSource — never a new profile model.
 */
export interface PlatformAdapter {
  readonly platform: PlatformId;
  readonly name: string;
  readonly capabilities: AdapterCapabilities;
  matches(url: string): boolean;
  /**
   * Acquire + normalize. Must NEVER throw for data gaps — missing fields stay
   * empty/null and errors degrade to diagnostics warnings.
   */
  acquire(url: string, options: AcquireOptions): Promise<AdapterResult>;
  /** Deterministic canonical handle/username from a URL. */
  extractHandle(url: string): string;
}

export interface AcquisitionDiagnostics {
  platform: PlatformId;
  adapter: string;
  /** Advertised capabilities, as keys the consumer can query. */
  capabilities: string[];
  /** ContentSource fields that ended up populated. */
  populatedFields: string[];
  /** Capability-supported fields that came back empty (honest gaps). */
  missingFields: string[];
  warnings: string[];
  /** Deterministic enrichment signals applied (no LLM). */
  enrichedSignals: string[];
  durationMs: number;
}

export interface AcquireResult {
  source: ContentSource;
  diagnostics: AcquisitionDiagnostics;
  /** Adapter-specific metadata threaded through (e.g. YouTube channel meta). */
  meta?: unknown;
}
