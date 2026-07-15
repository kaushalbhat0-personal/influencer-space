import { describe, it, expect, vi, beforeEach } from "vitest";
import { SocialApiService } from "@/services/social-api.service";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SocialApiService.getYouTubeStats", () => {
  it("parses subscriberCount from string to number", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            statistics: {
              subscriberCount: "5200000",
              viewCount: "150000000",
              videoCount: "320",
            },
          },
        ],
      }),
    });

    const stats = await SocialApiService.getYouTubeStats("UC-test-id");

    expect(stats).toEqual({
      subscriberCount: 5200000,
      viewCount: 150000000,
      videoCount: 320,
    });
  });

  it("returns null when API key is missing", async () => {
    delete process.env.YOUTUBE_API_KEY;

    const stats = await SocialApiService.getYouTubeStats("UC-test-id");
    expect(stats).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns null when API returns no items", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [] }),
    });

    const stats = await SocialApiService.getYouTubeStats("UC-test-id");
    expect(stats).toBeNull();
  });

  it("returns null on fetch failure", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";

    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    const stats = await SocialApiService.getYouTubeStats("UC-test-id");
    expect(stats).toBeNull();
  });

  it("defaults to 0 for missing stats fields", async () => {
    process.env.YOUTUBE_API_KEY = "test-key";

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        items: [
          {
            statistics: {
              subscriberCount: "abc",
              viewCount: "0",
              videoCount: "0",
            },
          },
        ],
      }),
    });

    const stats = await SocialApiService.getYouTubeStats("UC-test-id");
    expect(stats).toEqual({
      subscriberCount: 0,
      viewCount: 0,
      videoCount: 0,
    });
  });
});
