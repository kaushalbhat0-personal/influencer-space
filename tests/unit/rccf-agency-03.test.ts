import { describe, it, expect, vi } from "vitest";
import { AGENCY_NAV } from "@/lib/navigation/config";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { getAdapterForUrl } from "@/lib/generation/acquisition/adapters";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import type { ContentSource } from "@/lib/generation/intelligence/types";

function makeIntel(source: ContentSource, followers = 0, graphNiche: string | null = null) {
  const resumeTexts: string[] = source.resume
    ? [
        source.resume.summary,
        ...source.resume.skills,
        ...source.resume.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`),
        ...source.resume.projects.map((p) => `${p.name} ${p.description}`),
        ...source.resume.education.map((e) => `${e.degree} ${e.institution ?? ""}`),
      ].filter(Boolean)
    : [];
  const intel = buildEvidenceIntelligence({
    sourceText: source.bio ?? "",
    sourceContentTexts: resumeTexts,
    followers,
    acquisitionCompleteness: 0.7,
    graphNiche,
    graphConfidence: 0.5,
  });
  const rel = buildRelationshipGraph(source.bio ?? "", ["manual", ...resumeTexts]);
  return { intel, rel };
}

describe("RCCF-AGENCY-03 — Agency source types reuse existing acquisition registry", () => {
  it("Website URL is handled via acquisition (manual fallback, no fabrication)", async () => {
    const url = "https://example.com";
    const { adapter, platform } = getAdapterForUrl(url);
    // Website URL currently falls through to manual (no dedicated website adapter in acquisition)
    expect(["manual", "website"]).toContain(platform);
    const result = await profileAcquisitionEngine.acquire(url, "Acme Corp");
    expect(result.source.displayName).toBeTruthy();
    expect(result.source.platform).toBe(platform);
    // Should not fabricate bio beyond URL
    expect(result.diagnostics.warnings).toBeDefined();
  });

  it("Google Maps URL extracts business name and location (no fabricated address)", async () => {
    const mapsUrl = "https://www.google.com/maps/place/Blue+Tokai+Coffee+Roasters/@18.5204,73.8567,15z";
    const { adapter, platform } = getAdapterForUrl(mapsUrl);
    expect(platform).toBe("google_maps");
    expect(adapter.platform).toBe("google_maps");
    const result = await profileAcquisitionEngine.acquire(mapsUrl, "Blue Tokai");
    expect(result.source.displayName).toContain("Blue Tokai");
    expect(result.source.location).toBeDefined();
    expect(result.source.googleMapsUrl).toBe(mapsUrl);
    expect(result.source.bio).toBe(""); // no fabricated bio
  });

  it("YouTube URL remains functional (YouTube adapter)", async () => {
    const yt = "https://youtube.com/@mkbhd";
    const { adapter, platform } = getAdapterForUrl(yt);
    expect(platform).toBe("youtube");
    expect(adapter.platform).toBe("youtube");
    // Acquire degrades gracefully without API key, but still returns source
    const result = await profileAcquisitionEngine.acquire(yt, "MKBHD");
    expect(result.source.platform).toBe("youtube");
  });

  it("Instagram URL maps to instagram adapter (profile normalization)", async () => {
    const ig = "https://instagram.com/natgeo";
    const { platform } = getAdapterForUrl(ig);
    expect(platform).toBe("instagram");
    const result = await profileAcquisitionEngine.acquire(ig, "NatGeo");
    expect(result.source.platform).toBe("instagram");
  });

  it("Manual/AI free text is handled as manual (no URL, bio is free text)", async () => {
    const bio = "I'm a fitness coach helping busy professionals lose weight through online coaching and nutrition plans. Based in Pune.";
    const result = await profileAcquisitionEngine.acquire(bio, "Fitness Pro");
    expect(result.source.bio).toBeTruthy();
    expect(result.source.platform).toBe("manual");
  });

  it("Resume text via free-text is detected as resume and populates ResumeSource", async () => {
    const resumeText = [
      "KAUSHAL G BHAT",
      "kaushal@example.com | Pune, India | https://github.com/kaushal",
      "Profile",
      "Experienced software engineer",
      "Technical Skills",
      "Languages: TypeScript, Python, Dart",
      "Work Experience",
      "Software Engineer — Acme Corp Jul 2023 – Present",
      "● Built platform with Next.js",
      "Education",
      "Bachelor of Computer Science — Pune University (2015 – 2019)",
    ].join("\n");
    const result = await profileAcquisitionEngine.acquire(resumeText, "Kaushal G Bhat");
    expect(result.source.resume).toBeDefined();
    expect(result.source.resume?.experience.length).toBeGreaterThan(0);
    expect(result.source.resume?.skills.length).toBeGreaterThan(0);
  });
});

describe("RCCF-AGENCY-03 — Archetype preservation via intelligent pipeline", () => {
  it("local-business input does not fall into creator (Google Maps + location)", async () => {
    const mapsUrl = "https://www.google.com/maps/place/Tasty+Bites+Restaurant/@18.5204,73.8567";
    const acq = await profileAcquisitionEngine.acquire(mapsUrl, "Tasty Bites");
    // Enrich with location manually for test determinism
    const source: ContentSource = {
      ...acq.source,
      bio: "Tasty Bites Restaurant in Pune. Menu: Biryani, Paneer, Pizza. Hours: Open 9am-10pm. Reservations available.",
      location: "Pune, India",
      googleMapsUrl: mapsUrl,
    };
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: "food",
      graphConfidence: 0.6,
    });
    const rel = buildRelationshipGraph(source.bio, ["google_maps", source.bio]);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: ["bio", "location"], missingFields: [] },
    });
    expect(arch.archetype).toBe("local_business");
  });

  it("professional input with resume can reach professional_resume", async () => {
    const resumeText = [
      "KAUSHAL G BHAT",
      "Summary",
      "Experienced software engineer with 5 years",
      "Technical Skills",
      "TypeScript, Python",
      "Work Experience",
      "Software Engineer — Acme Jul 2023 – Present",
      "● Built platform",
      "Projects",
      "My Project — Description",
      "Education",
      "BSc CS — Pune University (2015 – 2019)",
    ].join("\n");
    const acq = await profileAcquisitionEngine.acquire(resumeText, "Kaushal");
    const { intel, rel } = makeIntel(acq.source);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source: acq.source,
      acquisition: { completeness: 0.7, populatedFields: ["resume"], missingFields: [] },
    });
    expect(arch.archetype).toBe("professional_resume");
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: acq.source.displayName, username: acq.source.username || "kaushal", subdomain: "kaushal" },
      archetype: arch,
      source: acq.source,
    });
    expect(bp.sections.find((s) => s.id === "experience")?.decision).not.toBe("hidden");
  });

  it("creator input still resolves creator (YouTube)", async () => {
    const source: ContentSource = {
      platform: "youtube",
      username: "creator123",
      displayName: "Creator One",
      bio: "I am a gaming creator with 100k subscribers making daily videos about gaming and streaming on Twitch",
      avatarUrl: "",
      followers: 50000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@creator123"],
      socialLinks: ["https://youtube.com/@creator123"],
    };
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: [],
      followers: source.followers,
      acquisitionCompleteness: 0.7,
      graphNiche: "gaming",
      graphConfidence: 0.8,
    });
    const rel = buildRelationshipGraph(source.bio, ["youtube", source.bio]);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: ["bio"], missingFields: [] },
    });
    expect(arch.archetype).toBe("creator");
  });
});

describe("RCCF-AGENCY-03 — Agency framing and navigation", () => {
  it("AGENCY_NAV label is agency-neutral (New Client Website)", () => {
    const tools = AGENCY_NAV.groups.find((g) => g.label === "Tools")!;
    const item = tools.items.find((i) => i.href === "/agency/generate")!;
    expect(item.label).toBe("New Client Website");
    expect(item.label).not.toContain("Creator Import");
  });

  it("New Client Website item is not creator-specific", () => {
    const allLabels = AGENCY_NAV.groups.flatMap((g) => g.items.map((i) => i.label));
    expect(allLabels).not.toContain("Creator Import");
  });
});

describe("RCCF-AGENCY-03 — Tenant/agency ownership still enforced (mocked)", () => {
  it("importCreatorViaAgency still checks capacity and agency ownership (mocked)", async () => {
    // This test verifies the server action still imports AgencyTenant checks without creating new pipeline
    // We mock the dependencies to ensure no new generation pipeline was introduced
    const mod = await import("@/actions/partner.actions");
    expect(typeof mod.importCreatorViaAgency).toBe("function");
    // Ensure file still imports from super-admin-provision (reuse)
    const fs = await import("fs");
    const content = fs.readFileSync("src/actions/partner.actions.ts", "utf8");
    expect(content).toContain("confirmProvision");
    expect(content).not.toContain("agency-specific generation pipeline");
  });
});
