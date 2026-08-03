import { describe, it, expect } from "vitest";
import {
  normalizeText,
  normalizeHandle,
  extractLinks,
  extractWebsiteHostname,
  classifyLink,
  extractHashtags,
  extractKeywords,
  detectLanguage,
  applyEnrichment,
} from "@/lib/generation/acquisition/enrichment";
import type { ContentSource } from "@/lib/generation/intelligence/types";

describe("normalizeText", () => {
  it("strips zero-width chars and collapses whitespace", () => {
    expect(normalizeText("  Hi\u200B   there\uFEFF  ")).toBe("Hi there");
  });
});

describe("normalizeHandle", () => {
  it("strips scheme, host, @ and path", () => {
    expect(normalizeHandle("https://www.youtube.com/@cristiano")).toBe("cristiano");
    expect(normalizeHandle("@cristiano")).toBe("cristiano");
    expect(normalizeHandle("instagram.com/cristiano")).toBe("cristiano");
    expect(normalizeHandle("cristiano?tab=reels")).toBe("cristiano");
  });
});

describe("extractLinks / hostname / classification", () => {
  it("extracts unique URLs from text", () => {
    expect(extractLinks("Check https://a.com and http://b.co and https://a.com")).toEqual([
      "https://a.com",
      "http://b.co",
    ]);
  });

  it("derives the hostname without www", () => {
    expect(extractWebsiteHostname("https://www.mybrand.com/hello")).toBe("mybrand.com");
    expect(extractWebsiteHostname("not a url")).toBeNull();
  });

  it("classifies links deterministically", () => {
    expect(classifyLink("https://www.instagram.com/x")).toBe("social");
    expect(classifyLink("https://mybrand.com")).toBe("website");
    expect(classifyLink("https://shop.mybrand.com")).toBe("store");
  });
});

describe("extractHashtags", () => {
  it("extracts normalized unique hashtags", () => {
    expect(extractHashtags("#Gaming #gaming #Music")).toEqual(["gaming", "music"]);
  });
});

describe("extractKeywords", () => {
  it("tokenizes, drops stopwords, dedupes, keeps meaningful tokens", () => {
    const kw = extractKeywords("I love gaming and football and gaming with friends");
    expect(kw).toContain("gaming");
    expect(kw).toContain("football");
    expect(kw).not.toContain("and");
    expect(kw.filter((k) => k === "gaming")).toHaveLength(1);
  });
});

describe("detectLanguage", () => {
  it("detects script-based languages deterministically", () => {
    expect(detectLanguage("привет мир")).toEqual(["cyrillic"]);
    expect(detectLanguage("नमस्ते दुनिया")).toEqual(["devanagari"]);
  });

  it("detects English via stopword hits", () => {
    expect(detectLanguage("Welcome to my channel where you can learn and explore")).toContain("english");
  });

  it("returns null for empty or ambiguous text (never guesses)", () => {
    expect(detectLanguage("")).toBeNull();
    expect(detectLanguage("zzz qqq")).toBeNull();
  });
});

describe("applyEnrichment", () => {
  function base(overrides: Partial<ContentSource> = {}): ContentSource {
    return {
      platform: "youtube",
      username: "creator",
      displayName: "Creator",
      bio: "",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@creator"],
      ...overrides,
    };
  }

  it("does not fabricate signals for an empty source", () => {
    const { source, signals } = applyEnrichment(base());
    expect(source.website).toBeUndefined();
    expect(source.keywords).toBeUndefined();
    expect(source.languages).toBeUndefined();
    expect(source.hashtags).toBeUndefined();
    // No invented website/keyword/language/media signals — only the real
    // youtube URL is classified as a social link.
    expect(signals.filter((s) => !s.startsWith("social_links:"))).toHaveLength(0);
  });

  it("derives website, keywords, hashtags and language from the bio", () => {
    const { source, signals } = applyEnrichment(
      base({ bio: "Gaming channel 🎮 https://mybrand.com #gaming #esports" }),
    );
    expect(source.website).toBe("mybrand.com");
    expect(source.keywords).toContain("gaming");
    expect(source.hashtags).toEqual(expect.arrayContaining(["gaming", "esports"]));
    expect(signals).toContain("website:detected");
    expect(signals.some((s) => s.startsWith("keywords:"))).toBe(true);
    expect(signals.some((s) => s.startsWith("hashtags:"))).toBe(true);
  });

  it("merges bio-discovered links into the canonical link set", () => {
    const { source, signals } = applyEnrichment(base({ bio: "Site: https://store.example.com" }));
    expect(source.links).toContain("https://store.example.com");
    expect(signals.some((s) => s.startsWith("links:"))).toBe(true);
  });
  it("reports media present only when media actually exists", () => {
    const { source, signals } = applyEnrichment(base({ avatarUrl: "https://img/a.png" }));
    expect(source.media).toEqual({ count: 1, types: ["avatar"] });
    expect(signals).toContain("media:present");
  });

  it("normalizes bio whitespace without changing meaning", () => {
    const { source } = applyEnrichment(base({ bio: "  Hello\u200B  world  " }));
    expect(source.bio).toBe("Hello world");
  });
});
