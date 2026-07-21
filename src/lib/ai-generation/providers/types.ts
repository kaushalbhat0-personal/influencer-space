/**
 * Provider Interfaces v1.0.0
 *
 * Abstracted provider contracts for profile and content extraction.
 * Each platform (YouTube, Instagram, TikTok, etc.) implements these interfaces.
 * The pipeline depends on interfaces, not concrete implementations.
 */

import type { CreatorProfile, CreatorContent } from "../types";
import type { ServiceResult } from "@/lib/application/types";
import type { ResolvedSource } from "../types";

export interface ProfileProvider {
  readonly platform: string;
  readonly name: string;

  extractProfile(source: ResolvedSource): Promise<ServiceResult<CreatorProfile>>;
  validateIdentifier(identifier: string): boolean;
  healthCheck(): Promise<{ available: boolean; latencyMs: number }>;
}

export interface ContentProvider {
  readonly platform: string;
  readonly name: string;

  extractContent(source: ResolvedSource, profile: CreatorProfile): Promise<ServiceResult<CreatorContent>>;
  healthCheck(): Promise<{ available: boolean; latencyMs: number }>;
}

export interface ProfileProviderFactory {
  getProvider(platform: string): ProfileProvider | null;
  supportedPlatforms(): string[];
}

export interface ContentProviderFactory {
  getProvider(platform: string): ContentProvider | null;
  supportedPlatforms(): string[];
}
