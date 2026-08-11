import { prisma } from "@/lib/prisma";
import type { IntegrationData, IntegrationStatus } from "./types";

const INTEGRATION_DEFS = [
  { platform: "youtube", name: "YouTube", description: "Connect your YouTube channel to sync stats and content.", icon: "youtube" },
  { platform: "instagram", name: "Instagram", description: "Connect Instagram to keep your storefront content up to date.", icon: "instagram" },
  { platform: "google_analytics", name: "Google Analytics", description: "Track your storefront visitors and performance.", icon: "ga" },
  { platform: "meta_pixel", name: "Meta Pixel", description: "Measure conversions from Facebook and Instagram ads.", icon: "meta" },
];

export const integrationService = {
  async list(tenantId: string): Promise<IntegrationData[]> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: {
        youtubeApiKey: true,
        youtubeChannelId: true,
        instagramApiKey: true,
        instagramAccessToken: true,
      },
    });

    return INTEGRATION_DEFS.map((def) => ({
      ...def,
      connected: this.isConnected(def.platform, tenant),
      status: this.getStatus(def.platform, tenant),
      config: this.getConfig(def.platform, tenant),
      scopes: this.getScopes(def.platform),
    }));
  },

  isConnected(platform: string, tenant: Record<string, unknown> | null): boolean {
    if (!tenant) return false;
    switch (platform) {
      case "youtube": return !!(tenant.youtubeApiKey && tenant.youtubeChannelId);
      case "instagram": return !!tenant.instagramApiKey;
      default: return false;
    }
  },

  getStatus(platform: string, tenant: Record<string, unknown> | null): IntegrationStatus {
    if (!tenant) return "not_connected";
    switch (platform) {
      case "youtube": {
        const hasKey = !!tenant.youtubeApiKey;
        const hasChannel = !!tenant.youtubeChannelId;
        if (hasKey && hasChannel) return "connected";
        if (hasKey || hasChannel) return "incomplete";
        return "not_connected";
      }
      case "instagram":
        return tenant.instagramApiKey ? "configured" : "not_connected";
      default:
        return "coming_soon";
    }
  },

  getConfig(platform: string, tenant: Record<string, unknown> | null): Record<string, string | boolean> {
    if (!tenant) return {};
    switch (platform) {
      case "youtube": return {
        hasApiKey: !!tenant.youtubeApiKey,
        hasChannel: !!tenant.youtubeChannelId,
        channelId: (tenant.youtubeChannelId as string | null) || "",
      };
      case "instagram": return { configured: !!tenant.instagramApiKey };
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
