import { prisma } from "@/lib/prisma";
import type { IntegrationData } from "./types";

const INTEGRATION_DEFS = [
  { platform: "youtube", name: "YouTube", description: "Import videos, analytics, and content", icon: "youtube" },
  { platform: "instagram", name: "Instagram", description: "Sync posts, reels, and stories", icon: "instagram" },
  { platform: "google_analytics", name: "Google Analytics", description: "Track visitor analytics", icon: "ga" },
  { platform: "meta_pixel", name: "Meta Pixel", description: "Track conversions from Facebook/Instagram ads", icon: "meta" },
];

export const integrationService = {
  async list(tenantId: string): Promise<IntegrationData[]> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { youtubeApiKey: true, youtubeChannelId: true, instagramAccessToken: true },
    });

    return INTEGRATION_DEFS.map((def) => ({
      ...def,
      connected: this.isConnected(def.platform, tenant),
      config: this.getConfig(def.platform, tenant),
      scopes: this.getScopes(def.platform),
    }));
  },

  isConnected(platform: string, tenant: Record<string, unknown> | null): boolean {
    if (!tenant) return false;
    switch (platform) {
      case "youtube": return !!(tenant.youtubeApiKey || tenant.youtubeChannelId);
      case "instagram": return !!tenant.instagramAccessToken;
      default: return false;
    }
  },

  getConfig(platform: string, tenant: Record<string, unknown> | null): Record<string, string | boolean> {
    if (!tenant) return {};
    switch (platform) {
      case "youtube": return { hasApiKey: !!tenant.youtubeApiKey, hasChannel: !!tenant.youtubeChannelId };
      case "instagram": return { connected: !!tenant.instagramAccessToken };
      default: return {};
    }
  },

  getScopes(platform: string): string[] {
    switch (platform) {
      case "youtube": return ["videos:read", "analytics:read", "channel:read"];
      case "instagram": return ["media:read", "insights:read"];
      case "google_analytics": return ["analytics:read"];
      case "meta_pixel": return ["ads:read", "conversions:read"];
      default: return [];
    }
  },
};
