/**
 * Platform adapter registry â€” IMPLEMENTATION-31.
 *
 * Maps a detected platform to its adapter. RCCF-04 adds dedicated connectors
 * for Instagram, TikTok, LinkedIn and X/Twitter (profile normalization only,
 * no scraping) behind the SAME contract. Future richer connectors (official
 * APIs) register here WITHOUT changing the pipeline.
 */
import { detectPlatform } from "@/lib/generation/integration/provision-pipeline";
import type { PlatformAdapter, PlatformId } from "../types";
import { YouTubeAdapter } from "./youtube";
import { ManualAdapter } from "./manual";
import { InstagramAdapter } from "./instagram";
import { TikTokAdapter } from "./tiktok";
import { LinkedInAdapter } from "./linkedin";
import { TwitterAdapter } from "./twitter";

export const ADAPTERS: PlatformAdapter[] = [
  YouTubeAdapter,
  InstagramAdapter,
  TikTokAdapter,
  LinkedInAdapter,
  TwitterAdapter,
  ManualAdapter,
];

export function getAdapterForUrl(url: string): { adapter: PlatformAdapter; platform: PlatformId } {
  const platform = (detectPlatform(url) || "manual") as PlatformId;
  const adapter = ADAPTERS.find((a) => a.platform === platform) ?? ManualAdapter;
  return { adapter, platform };
}

export { YouTubeAdapter, ManualAdapter, InstagramAdapter, TikTokAdapter, LinkedInAdapter, TwitterAdapter };


