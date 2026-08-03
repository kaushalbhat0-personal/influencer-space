import { vi, describe, it, expect, beforeEach } from "vitest";
import { profileAcquisitionEngine, listCapabilities } from "@/lib/generation/acquisition/engine";
import { getAdapterForUrl } from "@/lib/generation/acquisition/adapters";
import { buildContentSourceFromYouTube, buildContentSource } from "@/lib/generation/integration/provision-pipeline";

const h = vi.hoisted(() => ({
  fetchWithResult: vi.fn(),
}));

vi.mock("@/services/youtube-scraper.service", () => ({
  YouTubeScraperService: { fetchWithResult: h.fetchWithResult },
}));

const CHANNEL = {
  id: "UC123",
  title: "Test Channel",
  description: "Football and fitness content with a link to https://testbrand.com #soccer",
  thumbnailUrl: "https://yt3/test.jpg",
  customUrl: "@testchannel",
  subscriberCount: 250000,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("capability model", () => {
  it("reports YouTube capabilities honestly", () => {
    const { adapter } = getAdapterForUrl("https://youtube.com/@test");
    expect(adapter.capabilities.supportsFollowers).toBe(true);
    expect(adapter.capabilities.supportsRecentContent).toBe(false);
    expect(adapter.capabilities.supportsVerification).toBe(false);
    expect(listCapabilities(adapter.capabilities)).toContain("followers");
    expect(listCapabilities(adapter.capabilities)).not.toContain("recentcontent");
  });

  it("reports no rich capabilities for the manual fallback", () => {
    const { adapter } = getAdapterForUrl("https://instagram.com/cristiano");
    expect(adapter.name).toBe("manual");
    expect(adapter.capabilities.supportsFollowers).toBe(false);
    expect(adapter.capabilities.supportsBio).toBe(false);
    expect(listCapabilities(adapter.capabilities)).not.toContain("bio");
  });
});

describe("YouTube adapter — regression: identical base ContentSource", () => {
  beforeEach(() => {
    h.fetchWithResult.mockResolvedValue({ success: true, data: CHANNEL });
  });

  it("matches only YouTube URLs and extracts the handle deterministically", () => {
    const { adapter } = getAdapterForUrl("https://www.youtube.com/@cristiano");
    expect(adapter.platform).toBe("youtube");
    expect(adapter.matches("https://youtu.be/abc")).toBe(true);
    expect(adapter.matches("https://instagram.com/x")).toBe(false);
    expect(adapter.extractHandle("https://www.youtube.com/@cristiano")).toBe("cristiano");
  });

  it("produces the SAME base ContentSource as the existing buildContentSourceFromYouTube", async () => {
    const { source } = await profileAcquisitionEngine.acquire("https://youtube.com/@testchannel", "Test Channel");
    const expected = buildContentSourceFromYouTube("https://youtube.com/@testchannel", CHANNEL);
    for (const key of ["platform", "username", "displayName", "bio", "avatarUrl", "followers"] as const) {
      expect(source[key]).toBe(expected[key]);
    }
    // Base links preserved (enrichment only ADDS the bio-discovered website).
    expect(expected.links.every((l) => source.links.includes(l))).toBe(true);
    // Enrichment is ADDITIVE: website/keywords/hashtags/language derived from the real bio.
    expect(source.website).toBe("testbrand.com");
    expect(source.keywords).toContain("football");
    expect(source.hashtags).toContain("soccer");
  });

  it("threads channel meta through the result", async () => {
    const result = await profileAcquisitionEngine.acquire("https://youtube.com/@testchannel", "Test Channel");
    expect(result.meta).toEqual(CHANNEL);
  });

  it("gracefully degrades on fetch failure with a warning (never throws)", async () => {
    h.fetchWithResult.mockResolvedValue({ success: false, error: "rate_limit", message: "slow down" });
    const result = await profileAcquisitionEngine.acquire("https://youtube.com/@testchannel", "Test Channel");
    expect(result.source.followers).toBe(0);
    expect(result.source.bio).toBe("");
    expect(result.diagnostics.warnings.some((w) => w.includes("rate_limit"))).toBe(true);
  });
});

describe("Manual fallback — no fabrication", () => {
  it("normalizes an Instagram URL without inventing data", async () => {
    const result = await profileAcquisitionEngine.acquire("https://instagram.com/cristiano", "Cristiano");
    expect(result.diagnostics.platform).toBe("instagram");
    expect(result.diagnostics.adapter).toBe("manual");
    expect(result.source.platform).toBe("instagram");
    expect(result.source.username).toBe("cristiano");
    expect(result.source.bio).toBe("");
    expect(result.source.followers).toBe(0);
    expect(result.source.content).toEqual([]);
    expect(result.source.categories).toEqual([]);
    expect(result.source.links).toEqual(["https://instagram.com/cristiano"]);
  });

  it("leaves capability-supported but unavailable fields in missingFields", async () => {
    const result = await profileAcquisitionEngine.acquire("https://instagram.com/cristiano", "Cristiano");
    expect(result.diagnostics.missingFields).toContain("website");
    expect(result.diagnostics.missingFields).toContain("languages");
    expect(result.diagnostics.populatedFields).toContain("links");
    expect(result.diagnostics.populatedFields).not.toContain("bio");
  });

  it("reports the platform as the detected one (not 'manual')", async () => {
    const result = await profileAcquisitionEngine.acquire("https://tiktok.com/@someone", "Someone");
    expect(result.source.platform).toBe("tiktok");
    expect(result.diagnostics.platform).toBe("tiktok");
  });
});

describe("diagnostics", () => {
  beforeEach(() => {
    h.fetchWithResult.mockResolvedValue({ success: true, data: CHANNEL });
  });

  it("reports populated fields, capabilities and adapter for YouTube", async () => {
    const result = await profileAcquisitionEngine.acquire("https://youtube.com/@testchannel", "Test Channel");
    expect(result.diagnostics.platform).toBe("youtube");
    expect(result.diagnostics.adapter).toBe("youtube-data-api");
    expect(result.diagnostics.populatedFields).toEqual(
      expect.arrayContaining(["displayName", "bio", "avatarUrl", "followers", "links", "website", "keywords", "hashtags"]),
    );
    expect(result.diagnostics.capabilities).toContain("followers");
    expect(result.diagnostics.enrichedSignals.some((s) => s.startsWith("keywords:"))).toBe(true);
    expect(result.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("records no duplicate enrichment calls (normalize once)", async () => {
    await profileAcquisitionEngine.acquire("https://youtube.com/@testchannel", "Test Channel");
    await profileAcquisitionEngine.acquire("https://youtube.com/@testchannel", "Test Channel");
    expect(h.fetchWithResult).toHaveBeenCalledTimes(2); // one fetch per acquire, no extra calls
  });
});
