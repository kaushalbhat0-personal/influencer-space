import { describe, it, expect } from "vitest";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { bindSection } from "@/lib/generation/intelligence/composition/binder";
import type { ContentSource } from "@/lib/generation/intelligence/types";

function makeEvidence(source: ContentSource) {
  const intel = buildEvidenceIntelligence({
    sourceText: source.bio ?? "",
    sourceContentTexts: [],
    followers: source.followers ?? 0,
    acquisitionCompleteness: 0.7,
    graphNiche: null,
    graphConfidence: 0.5,
  });
  const rel = buildRelationshipGraph(source.bio ?? "", [source.platform, source.bio ?? ""]);
  return { intel, rel };
}

describe("RCCF-16B — Creator hardening", () => {
  it("hasSocial does NOT trigger for myyoutubestore.com", () => {
    const source: ContentSource = {
      platform: "manual",
      username: "test",
      displayName: "Test",
      bio: "Hello world",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://myyoutubestore.com/product1"],
      socialLinks: ["https://myyoutubestore.com/product1"],
    };
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    // With fixed hasSocial, youtube should not trigger for myyoutubestore.com
    // hasPlatform is also false for manual+Hello, so creator should be low
    const real: ContentSource = { ...source, links: ["https://youtube.com/@real"], socialLinks: ["https://youtube.com/@real"] };
    const { intel: intel2, rel: rel2 } = makeEvidence(real);
    const arch2 = archetypeResolver.resolve({ evidence: intel2, relationships: rel2, source: real, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(arch2.scores.creator).toBeGreaterThan(arch.scores.creator);
    expect(arch.scores.creator).toBeLessThan(3); // myyoutubestore should not give full youtube weight
  });

  it("hasSocial still triggers for real youtube.com", () => {
    const source: ContentSource = {
      platform: "youtube",
      username: "real",
      displayName: "Real",
      bio: "Gaming",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@real"],
      socialLinks: ["https://youtube.com/@real"],
    };
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(arch.scores.creator).toBeGreaterThanOrEqual(3);
  });

  it("gallery hidden for YouTube-only with no real gallery images", () => {
    const source: ContentSource = {
      platform: "youtube",
      username: "creator123",
      displayName: "Creator",
      bio: "Gaming creator",
      avatarUrl: "",
      followers: 1000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@creator123"],
      socialLinks: ["https://youtube.com/@creator123"],
      gallery: [],
      contentFeed: [],
    };
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch, source,
    });
    expect(bp.sections.find(s=>s.id==="gallery")?.decision).toBe("hidden");
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    expect(comp.sections.find(s=>s.id==="gallery")?.decision).toBe("hidden");
    // media should still be visible via youtube link
    expect(comp.sections.find(s=>s.id==="media")?.decision).not.toBe("hidden");
    const mediaBind = bindSection("media", source, "creator", "Media");
    expect(mediaBind.hasData).toBe(true);
  });

  it("gallery visible when real gallery assets exist", () => {
    const source: ContentSource = {
      platform: "youtube",
      username: "creator123",
      displayName: "Creator",
      bio: "Gaming creator",
      avatarUrl: "",
      followers: 1000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@creator123"],
      socialLinks: ["https://youtube.com/@creator123"],
      gallery: [{ id: "g1", title: "Shoot", imageUrl: "https://cdn.example.com/g1.jpg", mediaType: "image", videoUrl: null, altText: "Shoot" }],
      contentFeed: [],
    };
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch, source,
    });
    expect(bp.sections.find(s=>s.id==="gallery")?.decision).not.toBe("hidden");
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    expect(comp.sections.find(s=>s.id==="gallery")?.decision).not.toBe("hidden");
  });

  it("professional still gets gallery via resume projects", () => {
    const source: ContentSource = {
      platform: "manual",
      username: "prof",
      displayName: "Prof",
      bio: "Engineer",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: [],
      resume: {
        rawText: "Projects\nTest\nExperience\nTest",
        summary: "Summary",
        experience: [{ title: "Dev", description: "Did", raw: "Dev" }],
        skills: ["TS"],
        projects: [{ name: "Proj", description: "Desc", raw: "Proj" }],
        education: [],
        certifications: [],
        socialLinks: [],
        location: null,
      },
    };
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: ["Proj Desc"],
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: null,
      graphConfidence: 0.5,
      resume: source.resume,
    });
    const rel = buildRelationshipGraph(source.bio, ["manual", "Proj Desc"]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    // Force professional
    const profArch = { ...arch, archetype: "professional_resume" as const };
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: profArch as any, source,
    });
    expect(bp.sections.find(s=>s.id==="gallery")?.decision).not.toBe("hidden");
  });
});
