import { describe, it, expect } from "vitest";
import { isValidHttpUrl, MAX_URL_LENGTH } from "@/lib/validation/url";
import { buildProvisioningInput, buildContentSource } from "@/lib/generation/integration/provision-pipeline";
import type { PipelineResult } from "@/lib/generation/integration/types";
import { SocialGraph } from "@/lib/generation/intelligence/social-graph";
import type { ContentSource } from "@/lib/generation/intelligence/types";

function makePipelineResult(socialLinks: Array<{ platform: string; url: string; handle?: string }>): PipelineResult {
  const kg: any = {
    creator: { name: "KAUSHAL G BHAT", bio: "Full-stack...", username: "kaushal", followers: 0 },
    socialLinks,
    brand: { name: "KAUSHAL G BHAT", colors: [] },
    audience: {},
    products: [],
    content: {},
    seo: { title: "", description: "" },
    theme: { primary: "#6366F1" },
    sections: [],
    businessModel: {},
    confidence: 0.85,
  };
  const blueprint: any = {
    website: { title: "KAUSHAL G BHAT", tagline: "", domain: "kaushal.test" },
    seo: { title: "KAUSHAL G BHAT", description: "", keywords: [] },
    metadata: { version: 1 },
  };
  return {
    generationResult: undefined as never,
    knowledgeGraph: kg,
    blueprint,
    artifacts: [{ manifest: { type: "storefront_json", version: 1 }, data: { sections: [], navigation: [], theme: {}, metadata: {} } } as any],
    provisioned: true,
    snapshotId: null,
    storefrontUrl: null,
    version: 1,
  };
}

const RAW_RESUME = `KAUSHAL G BHAT
Full-Stack Software Engineer | Architecture & AI Specialist
Pune, India | +91 8668767875 | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal
PROFILE
Full-stack software engineer specializing in TypeScript...
WORK EXPERIENCE
Operations Head — Money Craft Trader
Jul 2025 – Present
● Manage end-to-end operations`;

const RAW_MULTILINE = `KAUSHAL G BHAT
WORK EXPERIENCE
TECHNICAL SKILLS
PROJECTS
PROFILE
EDUCATION
Advanced Program in Interactive Design & Games — Maya Academy of Advanced Cinematics (2020 – 2023)`;

describe("RCCF-PRELAUNCH-03D — strict URL validator", () => {
  it("rejects raw Kaushal resume text", () => {
    expect(isValidHttpUrl(RAW_RESUME)).toBe(false);
  });
  it("rejects raw multiline resume", () => {
    expect(isValidHttpUrl(RAW_MULTILINE)).toBe(false);
  });
  it("rejects resume text beginning with https plus prose", () => {
    const polluted = `https://manual.com/robots.txt)
● Help Indian Football — Civic advocacy petition platform
WORK EXPERIENCE
Operations Head — Money Craft Trader`;
    expect(isValidHttpUrl(polluted)).toBe(false);
  });
  it("rejects URL plus newline", () => {
    expect(isValidHttpUrl("https://example.com/page\nmore")).toBe(false);
    expect(isValidHttpUrl("https://example.com/page\r\n")).toBe(false);
  });
  it("rejects URL plus closing punctuation/prose", () => {
    expect(isValidHttpUrl("https://manual.com/robots.txt)\n● Help")).toBe(false);
    expect(isValidHttpUrl("https://example.com/path) extra")).toBe(false);
    expect(isValidHttpUrl("https://example.com/robots.txt) ")).toBe(false);
  });
  it("rejects URL with internal spaces", () => {
    expect(isValidHttpUrl("https://example.com/foo bar")).toBe(false);
    expect(isValidHttpUrl("https://example.com/foo\tbar")).toBe(false);
  });
  it("accepts valid GitHub URL", () => {
    expect(isValidHttpUrl("https://github.com/kaushalbhat0-personal")).toBe(true);
  });
  it("accepts valid LinkedIn URL", () => {
    expect(isValidHttpUrl("https://linkedin.com/in/example")).toBe(true);
  });
  it("accepts valid YouTube URL", () => {
    expect(isValidHttpUrl("https://youtube.com/@example")).toBe(true);
  });
  it("accepts valid Instagram URL", () => {
    expect(isValidHttpUrl("https://instagram.com/example")).toBe(true);
  });
  it("accepts http URL", () => {
    expect(isValidHttpUrl("http://example.com/page")).toBe(true);
  });
  it("rejects ftp/javascript/data", () => {
    expect(isValidHttpUrl("ftp://example.com/file")).toBe(false);
    expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
    expect(isValidHttpUrl("data:text/plain,hello")).toBe(false);
    expect(isValidHttpUrl("file:///etc/passwd")).toBe(false);
  });
  it("rejects relative URL", () => {
    expect(isValidHttpUrl("/relative/path")).toBe(false);
    expect(isValidHttpUrl("relative/path")).toBe(false);
    expect(isValidHttpUrl("//example.com/path")).toBe(false);
  });
  it("rejects >2048 chars", () => {
    const long = "https://example.com/" + "a".repeat(2048);
    expect(long.length).toBeGreaterThan(2048);
    expect(isValidHttpUrl(long)).toBe(false);
    const ok = "https://example.com/" + "a".repeat(2000);
    expect(isValidHttpUrl(ok)).toBe(true);
  });
  it("rejects leading/trailing whitespace", () => {
    expect(isValidHttpUrl(" https://example.com")).toBe(false);
    expect(isValidHttpUrl("https://example.com ")).toBe(false);
    expect(isValidHttpUrl("\nhttps://example.com")).toBe(false);
  });
  it("rejects email/phone", () => {
    expect(isValidHttpUrl("kaushalbhat0@gmail.com")).toBe(false);
    expect(isValidHttpUrl("+91 8668767875")).toBe(false);
  });
  it("rejects control characters", () => {
    expect(isValidHttpUrl("https://example.com/\x01test")).toBe(false);
  });
});

describe("RCCF-PRELAUNCH-03D — sameAs/links never receive raw resume", () => {
  it("sameAs via provisioning: raw resume not promoted to socialLinks", () => {
    const rawBio = RAW_RESUME;
    const pipelineResult = makePipelineResult([{ platform: "resume", url: rawBio }]);
    const input = buildProvisioningInput({
      runId: "test-run",
      authenticatedUserId: "user",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: rawBio,
      sourcePlatform: "resume",
      planCode: "creator_launch",
      pipelineResult,
    });
    expect(input.socialLinks).toEqual([]);
    expect(JSON.stringify(input.socialLinks)).not.toContain("KAUSHAL G BHAT");
    expect(JSON.stringify(input.socialLinks)).not.toContain("WORK EXPERIENCE");
  });

  it("links.default via SocialGraph: raw resume not extracted as URL", () => {
    const source: ContentSource = {
      platform: "manual",
      username: "kaushal",
      displayName: "KAUSHAL G BHAT",
      bio: RAW_RESUME,
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [RAW_RESUME],
    };
    const sg = new SocialGraph();
    const links = sg.build(source);
    // primary link is manual.com/kaushal, not raw bio
    const urls = links.map((l) => l.url);
    expect(urls).not.toContain(RAW_RESUME);
    expect(urls.join(" ")).not.toContain("WORK EXPERIENCE");
    // all urls must be valid
    for (const u of urls) expect(isValidHttpUrl(u)).toBe(true);
  });

  it("existing valid social links remain unchanged", () => {
    const pipelineResult = makePipelineResult([
      { platform: "github", url: "https://github.com/kaushalbhat0-personal" },
      { platform: "linkedin", url: "https://linkedin.com/in/example" },
      { platform: "youtube", url: "https://youtube.com/@example" },
      { platform: "instagram", url: "https://instagram.com/example" },
    ]);
    const input = buildProvisioningInput({
      runId: "test-run",
      authenticatedUserId: "user",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: "https://linkedin.com/in/example",
      sourcePlatform: "linkedin",
      planCode: "creator_launch",
      pipelineResult,
    });
    const urls = input.socialLinks.map((l: any) => l.url);
    expect(urls).toContain("https://github.com/kaushalbhat0-personal");
    expect(urls).toContain("https://linkedin.com/in/example");
    expect(urls).toContain("https://youtube.com/@example");
    expect(urls).toContain("https://instagram.com/example");
  });

  it("buildContentSource: resume bio treated as freeText, links empty", () => {
    const cs = buildContentSource(RAW_RESUME, "manual", "KAUSHAL G BHAT");
    expect(cs.links).toEqual([]);
    expect(cs.bio).toBe(RAW_RESUME);
    expect(cs.username).toBe("kaushalgbhat");
    // valid URL remains link
    const cs2 = buildContentSource("https://github.com/kaushalbhat0-personal", "manual", "KAUSHAL");
    expect(cs2.links).toEqual(["https://github.com/kaushalbhat0-personal"]);
    expect(cs2.bio).toBe("");
  });

  it("normal manual creation links preserved", () => {
    const cs = buildContentSource("https://example.com", "manual", "Creator");
    expect(cs.links).toEqual(["https://example.com"]);
    // provisioning pipeline preserves kg socialLinks (sourceUrl handling is in provisioning-service)
    const pipelineResult = makePipelineResult([{ platform: "manual", url: "https://example.com" }]);
    const input = buildProvisioningInput({
      runId: "run",
      authenticatedUserId: "user",
      creatorName: "Creator",
      sourceUrl: "https://example.com",
      sourcePlatform: "manual",
      planCode: "creator_launch",
      pipelineResult,
    });
    expect(input.socialLinks.map((l: any) => l.url)).toContain("https://example.com");
  });
});
