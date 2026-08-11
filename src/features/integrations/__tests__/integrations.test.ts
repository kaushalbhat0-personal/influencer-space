import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindUnique } = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: {
      findUnique: mockTenantFindUnique,
    },
  },
}));

import { integrationService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Integration service", () => {
  it("list returns all integration definitions", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: "key-123", youtubeChannelId: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    expect(result).toHaveLength(4);
  });

  it("marks youtube as connected when api key and channel exist", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: "key-123", youtubeChannelId: "channel-1", instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const youtube = result.find((i) => i.platform === "youtube");
    expect(youtube?.connected).toBe(true);
    expect(youtube?.status).toBe("connected");
    expect(youtube?.config.channelId).toBe("channel-1");
  });

  it("marks youtube as not connected when no api key or channel", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const youtube = result.find((i) => i.platform === "youtube");
    expect(youtube?.connected).toBe(false);
    expect(youtube?.status).toBe("not_connected");
  });

  it("marks youtube as needing attention when only api key exists", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: "key-123", youtubeChannelId: null, instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const youtube = result.find((i) => i.platform === "youtube");
    expect(youtube?.connected).toBe(false);
    expect(youtube?.status).toBe("incomplete");
  });

  it("marks youtube as needing attention when only channel id exists", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: "channel-1", instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const youtube = result.find((i) => i.platform === "youtube");
    expect(youtube?.connected).toBe(false);
    expect(youtube?.status).toBe("incomplete");
  });

  it("marks instagram as configured when api key exists", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramApiKey: "key-123", instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const instagram = result.find((i) => i.platform === "instagram");
    expect(instagram?.connected).toBe(true);
    expect(instagram?.status).toBe("configured");
    expect(instagram?.config.configured).toBe(true);
  });

  it("marks instagram as not connected without api key", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const instagram = result.find((i) => i.platform === "instagram");
    expect(instagram?.connected).toBe(false);
    expect(instagram?.status).toBe("not_connected");
  });

  it("marks google analytics and meta pixel as coming soon", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const ga = result.find((i) => i.platform === "google_analytics");
    const meta = result.find((i) => i.platform === "meta_pixel");
    expect(ga?.status).toBe("coming_soon");
    expect(meta?.status).toBe("coming_soon");
    expect(ga?.connected).toBe(false);
    expect(meta?.connected).toBe(false);
  });

  it("returns scopes for each integration", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramApiKey: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    for (const integration of result) {
      expect(integration.scopes.length).toBeGreaterThan(0);
    }
  });

  it("does not leak api key values in config", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: "secret-key-123", youtubeChannelId: "channel-1", instagramApiKey: "secret-ig-123", instagramAccessToken: "secret-token" });
    const result = await integrationService.list("t1");
    for (const integration of result) {
      expect(JSON.stringify(integration.config)).not.toContain("secret-key-123");
      expect(JSON.stringify(integration.config)).not.toContain("secret-ig-123");
    }
  });

  it("handles null tenant gracefully", async () => {
    mockTenantFindUnique.mockResolvedValue(null);
    const result = await integrationService.list("t1");
    expect(result).toHaveLength(4);
    for (const integration of result) {
      expect(integration.connected).toBe(false);
    }
  });
});