import { vi, describe, it, expect, beforeEach } from "vitest";
import { profileAcquisitionEngine, listCapabilities } from "@/lib/generation/acquisition/engine";
import { getAdapterForUrl } from "@/lib/generation/acquisition/adapters";
import { buildContentSourceFromYouTube } from "@/lib/generation/integration/provision-pipeline";

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
    const { adapter } = getAdapterForUrl("https://random-site.example/profile");
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
  it("normalizes an unknown URL without inventing data", async () => {
    const result = await profileAcquisitionEngine.acquire("https://unknown/creator", "Creator");
    expect(result.diagnostics.platform).toBe("manual");
    expect(result.diagnostics.adapter).toBe("manual");
    expect(result.source.platform).toBe("manual");
    expect(result.source.bio).toBe("");
    expect(result.source.followers).toBe(0);
    expect(result.source.content).toEqual([]);
    expect(result.source.categories).toEqual([]);
    expect(result.source.links).toEqual(["https://unknown/creator"]);
  });

  it("leaves capability-supported but unavailable fields in missingFields", async () => {
    const result = await profileAcquisitionEngine.acquire("https://unknown/creator", "Creator");
    expect(result.diagnostics.missingFields).toContain("website");
    expect(result.diagnostics.missingFields).toContain("languages");
    expect(result.diagnostics.populatedFields).toContain("links");
    expect(result.diagnostics.populatedFields).not.toContain("bio");
  });
});

describe("RCCF-04 — dedicated social adapters (no fabrication)", () => {
  it("routes Instagram to the instagram adapter and normalizes the handle", async () => {
    const { adapter } = getAdapterForUrl("https://www.instagram.com/cristiano");
    expect(adapter.name).toBe("instagram-profile");
    expect(adapter.platform).toBe("instagram");
    expect(adapter.extractHandle("https://www.instagram.com/cristiano")).toBe("cristiano");

    const result = await profileAcquisitionEngine.acquire("https://www.instagram.com/cristiano", "Cristiano");
    expect(result.source.platform).toBe("instagram");
    expect(result.source.username).toBe("cristiano");
    expect(result.source.displayName).toBe("Cristiano");
    expect(result.source.links).toEqual(["https://www.instagram.com/cristiano"]);
    expect(result.source.bio).toBe("");
    expect(result.source.followers).toBe(0);
  });

  it("routes TikTok to the tiktok adapter and normalizes the handle", async () => {
    const { adapter } = getAdapterForUrl("https://www.tiktok.com/@someone");
    expect(adapter.name).toBe("tiktok-profile");
    expect(adapter.extractHandle("https://www.tiktok.com/@someone")).toBe("someone");

    const result = await profileAcquisitionEngine.acquire("https://www.tiktok.com/@someone", "Someone");
    expect(result.source.platform).toBe("tiktok");
    expect(result.source.username).toBe("someone");
    expect(result.source.displayName).toBe("Someone");
  });

  it("routes LinkedIn to the linkedin adapter and normalizes the slug", async () => {
    const { adapter } = getAdapterForUrl("https://www.linkedin.com/in/steve-jobs");
    expect(adapter.name).toBe("linkedin-profile");
    expect(adapter.extractHandle("https://www.linkedin.com/in/steve-jobs")).toBe("steve-jobs");

    const result = await profileAcquisitionEngine.acquire("https://www.linkedin.com/in/steve-jobs", "Steve");
    expect(result.source.platform).toBe("linkedin");
    expect(result.source.username).toBe("steve-jobs");
  });

  it("routes X/Twitter to the twitter adapter and normalizes the handle", async () => {
    const { adapter } = getAdapterForUrl("https://x.com/elonmusk");
    expect(adapter.name).toBe("x-profile");
    expect(adapter.extractHandle("https://x.com/elonmusk")).toBe("elonmusk");

    const result = await profileAcquisitionEngine.acquire("https://x.com/elonmusk", "Elon");
    expect(result.source.platform).toBe("twitter");
    expect(result.source.username).toBe("elonmusk");
    expect(result.source.links).toEqual(["https://x.com/elonmusk"]);
  });

  it("rejects non-profile Instagram routes by degrading to a manual source with a warning", async () => {
    const result = await profileAcquisitionEngine.acquire("https://www.instagram.com/p/ABC123/", "Creator");
    // A post URL is not a profile — the adapter still returns a source but flags
    // it as a degradation (never throws, never fabricates).
    expect(result.diagnostics.platform).toBe("instagram");
    expect(result.diagnostics.warnings.length).toBeGreaterThan(0);
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
