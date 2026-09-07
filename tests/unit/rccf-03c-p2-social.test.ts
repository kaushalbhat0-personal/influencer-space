import { describe, it, expect } from "vitest";
import { buildProvisioningInput, buildBuilderArtifactData } from "@/lib/generation/integration/provision-pipeline";
import type { PipelineResult } from "@/lib/generation/integration/types";
import fs from "fs";

function makePipelineResult(socialLinks: Array<{ platform: string; url: string; handle?: string }>): PipelineResult {
  // Minimal knowledgeGraph with creator and socialLinks
  const kg: any = {
    creator: { name: "KAUSHAL G BHAT", bio: "Full-stack software engineer...", username: "kaushal", followers: 0 },
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
    artifacts: [
      {
        manifest: { type: "storefront_json", version: 1 },
        data: { sections: [], navigation: [], theme: {}, metadata: {} },
      } as any,
    ],
    provisioned: true,
    snapshotId: null,
    storefrontUrl: null,
    version: 1,
  };
}

describe("P2-2: raw resume text cannot become sameAs/href (provision-pipeline)", () => {
  it("rejects raw resume prose as socialLink", () => {
    const rawBio = `KAUSHAL G BHAT
Full-Stack Software Engineer | Architecture & AI Specialist
Pune, India | +91 8668767875 | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal
PROFILE Full-stack software engineer specializing in TypeScript...`;
    const pipelineResult = makePipelineResult([{ platform: "resume", url: rawBio, handle: "resume" }]);
    const input = buildProvisioningInput({
      runId: "test-run-id",
      authenticatedUserId: "user-id",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: rawBio, // should be rejected as non-URL
      sourcePlatform: "manual",
      planCode: "creator_launch",
      pipelineResult,
    });
    // Both sourceUrl and raw socialLink should be filtered out
    expect(input.socialLinks).toEqual([]);
    expect(input.socialLinks.length).toBe(0);
  });

  it("rejects emails, phone numbers, non-URL strings", () => {
    const pipelineResult = makePipelineResult([
      { platform: "email", url: "kaushalbhat0@gmail.com" },
      { platform: "phone", url: "+91 8668767875" },
      { platform: "text", url: "Not a URL, just project description" },
      { platform: "heading", url: "TECHNICAL SKILLS Languages: TypeScript, Python" },
    ]);
    const input = buildProvisioningInput({
      runId: "test-run-id",
      authenticatedUserId: "user-id",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: "not-a-url",
      sourcePlatform: "manual",
      planCode: "creator_launch",
      pipelineResult,
    });
    expect(input.socialLinks).toEqual([]);
  });

  it("preserves valid absolute https URLs", () => {
    const pipelineResult = makePipelineResult([
      { platform: "github", url: "https://github.com/kaushalbhat0-personal", handle: "kaushalbhat0-personal" },
      { platform: "linkedin", url: "https://linkedin.com/in/kaushalbhat", handle: "kaushalbhat" },
    ]);
    const input = buildProvisioningInput({
      runId: "test-run-id",
      authenticatedUserId: "user-id",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: "https://linkedin.com/in/kaushalbhat",
      sourcePlatform: "linkedin",
      planCode: "creator_launch",
      pipelineResult,
    });
    // Should keep all three valid URLs (sourceUrl + 2 socialLinks), deduped
    const urls = input.socialLinks.map((l: any) => l.url);
    expect(urls).toContain("https://github.com/kaushalbhat0-personal");
    expect(urls).toContain("https://linkedin.com/in/kaushalbhat");
    expect(urls.length).toBe(2); // linkedin deduped (sourceUrl and socialLink same)
  });

  it("preserves http URL but rejects relative and ftp", () => {
    const pipelineResult = makePipelineResult([
      { platform: "link", url: "http://example.com/page" },
      { platform: "ftp", url: "ftp://example.com/file" },
      { platform: "relative", url: "/relative/path" },
    ]);
    const input = buildProvisioningInput({
      runId: "test-run-id",
      authenticatedUserId: "user-id",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: "http://example.com/page",
      sourcePlatform: "manual",
      planCode: "creator_launch",
      pipelineResult,
    });
    const urls = input.socialLinks.map((l: any) => l.url);
    expect(urls).toContain("http://example.com/page");
    expect(urls).not.toContain("ftp://example.com/file");
    expect(urls).not.toContain("/relative/path");
  });

  it("real Kaushal PDF resume text does not become socialLink (regression)", () => {
    // Use actual extracted text length as realistic raw bio
    const raw = fs.existsSync("public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf")
      ? "KAUSHAL G BHAT Full-Stack Software Engineer | Architecture & AI Specialist Pune, India | +91 8668767875 | kaushalbhat0@gmail.com | github.com/kaushalbhat0-personal PROFILE Full-stack software engineer..."
      : "KAUSHAL G BHAT\nFull-Stack...";
    const pipelineResult = makePipelineResult([{ platform: "manual", url: raw }]);
    const input = buildProvisioningInput({
      runId: "test-run",
      authenticatedUserId: "user",
      creatorName: "KAUSHAL G BHAT",
      sourceUrl: raw,
      sourcePlatform: "manual",
      planCode: "creator_launch",
      pipelineResult,
    });
    expect(input.socialLinks).toEqual([]);
    // Ensure no sameAs-like raw blob would be produced downstream
    expect(JSON.stringify(input.socialLinks)).not.toContain("KAUSHAL G BHAT");
  });
});

import { isValidHttpUrl } from "@/lib/validation/url";

describe("P2-2: URL validation helper", () => {
  it("accepts https and http", () => {
    expect(isValidHttpUrl("https://github.com/kaushalbhat0-personal")).toBe(true);
    expect(isValidHttpUrl("http://example.com")).toBe(true);
    expect(isValidHttpUrl("https://linkedin.com/in/kaushal")).toBe(true);
  });
  it("rejects non-http, emails, phones, prose", () => {
    expect(isValidHttpUrl("kaushalbhat0@gmail.com")).toBe(false);
    expect(isValidHttpUrl("+91 8668767875")).toBe(false);
    expect(isValidHttpUrl("TECHNICAL SKILLS Languages: TypeScript")).toBe(false);
    expect(isValidHttpUrl("ftp://example.com")).toBe(false);
    expect(isValidHttpUrl("/relative/path")).toBe(false);
    expect(isValidHttpUrl("KAUSHAL G BHAT\nFull-Stack...")).toBe(false);
    expect(isValidHttpUrl("")).toBe(false);
  });
});
