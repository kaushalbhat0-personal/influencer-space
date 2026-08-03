/**
 * Platform adapter registry â€” IMPLEMENTATION-31.
 *
 * Maps a detected platform to its adapter. Future connectors (Instagram API,
 * TikTok, premium connectors) register here WITHOUT changing the pipeline.
 */
import { detectPlatform } from "@/lib/generation/integration/provision-pipeline";
import type { PlatformAdapter, PlatformId } from "../types";
import { YouTubeAdapter } from "./youtube";
import { ManualAdapter } from "./manual";

export const ADAPTERS: PlatformAdapter[] = [YouTubeAdapter, ManualAdapter];

export function getAdapterForUrl(url: string): { adapter: PlatformAdapter; platform: PlatformId } {
  const platform = (detectPlatform(url) || "manual") as PlatformId;
  const adapter = ADAPTERS.find((a) => a.platform === platform) ?? ManualAdapter;
  return { adapter, platform };
}

export { YouTubeAdapter, ManualAdapter };

