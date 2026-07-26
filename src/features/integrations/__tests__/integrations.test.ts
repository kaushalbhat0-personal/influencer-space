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

  it("marks youtube as connected when api key exists", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: "key-123", youtubeChannelId: "channel-1", instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const youtube = result.find((i) => i.platform === "youtube");
    expect(youtube?.connected).toBe(true);
  });

  it("marks youtube as not connected when no api key", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    const youtube = result.find((i) => i.platform === "youtube");
    expect(youtube?.connected).toBe(false);
  });

  it("marks instagram as connected when access token exists", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramAccessToken: "token-123" });
    const result = await integrationService.list("t1");
    const instagram = result.find((i) => i.platform === "instagram");
    expect(instagram?.connected).toBe(true);
  });

  it("returns scopes for each integration", async () => {
    mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: null, youtubeChannelId: null, instagramAccessToken: null });
    const result = await integrationService.list("t1");
    for (const integration of result) {
      expect(integration.scopes.length).toBeGreaterThan(0);
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
