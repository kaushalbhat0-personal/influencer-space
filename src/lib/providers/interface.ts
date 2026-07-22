import type { CreatorProfile } from "@/lib/creators/types";

export interface ProviderConfig {
  [key: string]: string | undefined;
}

export interface FetchResult {
  profile: CreatorProfile;
  accountId?: string;
  cached: boolean;
  quotaUnits: number;
  latencyMs: number;
}

/**
 * Abstract provider interface for fetching normalized creator data.
 * Every provider (YouTube, Instagram, TikTok, etc.) implements this.
 */
export interface CreatorProvider {
  readonly name: string;
  canHandle(url: string): boolean;
  fetch(url: string): Promise<FetchResult>;
  refresh(accountId: string): Promise<FetchResult>;
}
