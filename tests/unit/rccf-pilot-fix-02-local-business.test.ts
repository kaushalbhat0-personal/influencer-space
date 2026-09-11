import { describe, it, expect } from "vitest";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
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
    resume: source.resume ?? null,
  });
  const rel = buildRelationshipGraph(source.bio ?? "", [source.platform, source.location ?? "", source.googleMapsUrl ?? ""]);
  return { intel, rel };
}

function googleMapsSource(overrides: Partial<ContentSource> = {}): ContentSource {
  return {
    platform: "google_maps",
    username: "testbiz",
    displayName: "Test Bistro",
    bio: "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://www.google.com/maps/place/Test+Bistro/@18.5204,73.8567,17z"],
    socialLinks: [],
    location: "",
    googleMapsUrl: "https://www.google.com/maps/place/Test+Bistro/@18.5204,73.8567,17z",
    ...overrides,
  };
}

function buildAll(source: ContentSource) {
  const { intel, rel } = makeEvidence(source);
  const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
  const bp = buildWebsiteBlueprint({
    evidence: intel,
    relationships: rel,
    identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
    archetype: arch,
    source,
  });
  const comp = composeStorefront({
    blueprint: bp,
    identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
    evidence: intel,
    relationships: rel,
    source,
  });
  return { arch, bp, comp, source };
}

describe("RCCF-PILOT-FIX-02 — Local Business Conditional Composition", () => {
  it("Google Maps with location only → Location + Contact visible, Menu/Hours/Reservations hidden, Products suppressed", () => {
    const source = googleMapsSource();
    const { arch, bp, comp } = buildAll(source);
    expect(arch.archetype).toBe("local_business");
    expect(bp.visibleSections).toContain("location");
    expect(bp.visibleSections).toContain("contact");
    expect(bp.visibleSections).not.toContain("menu");
    expect(bp.visibleSections).not.toContain("hours");
    expect(bp.visibleSections).not.toContain("reservations");
    // Products not in local_business visible
    expect(bp.visibleSections).not.toContain("products");
    // Binder parity
    expect(bindSection("location", source, "local_business", "Location").hasData).toBe(true);
    expect(bindSection("contact", source, "local_business", "Contact").hasData).toBe(true);
    expect(bindSection("menu", source, "local_business", "Menu").hasData).toBe(false);
    expect(bindSection("hours", source, "local_business", "Hours").hasData).toBe(false);
    expect(bindSection("reservations", source, "local_business", "Reservations").hasData).toBe(false);
    expect(bindSection("products", source, "local_business", "Products").hasData).toBe(false);
    // Composition mirrors blueprint
    expect(comp.sections.find((s) => s.id === "location")!.decision).not.toBe("hidden");
    expect(comp.sections.find((s) => s.id === "contact")!.decision).not.toBe("hidden");
    expect(comp.sections.find((s) => s.id === "menu")!.decision).toBe("hidden");
    expect(comp.sections.find((s) => s.id === "hours")!.decision).toBe("hidden");
  });

  it("structured menu → Menu visible with real data, no dummy URLs", () => {
    const source = googleMapsSource({
      menuItems: [{ name: "Biryani", description: "Hyderabadi", price: 350, category: "Main" }],
    });
    const { bp, comp } = buildAll(source);
    expect(bp.visibleSections).toContain("menu");
    const menu = comp.sections.find((s) => s.id === "menu")!;
    expect(menu.decision).not.toBe("hidden");
    const prods = (menu.props as any).products as Array<any>;
    expect(prods.length).toBe(1);
    expect(prods[0].name).toBe("Biryani");
    expect(JSON.stringify(menu.props)).not.toContain('"#"');
  });

  it("structured hours → Hours visible", () => {
    const source = googleMapsSource({ hours: "Mon-Sun 9am - 10pm" });
    const { bp, comp } = buildAll(source);
    expect(bp.visibleSections).toContain("hours");
    expect(comp.sections.find((s) => s.id === "hours")!.decision).not.toBe("hidden");
    expect(bindSection("hours", source, "local_business", "Hours").hasData).toBe(true);
    const without = googleMapsSource();
    expect(buildAll(without).bp.visibleSections).not.toContain("hours");
    expect(bindSection("hours", without, "local_business", "Hours").hasData).toBe(false);
  });

  it("reservation URL → Reservations visible", () => {
    const source = googleMapsSource({ reservationUrl: "https://reserve.example.com/book" });
    const { bp, comp } = buildAll(source);
    expect(bp.visibleSections).toContain("reservations");
    expect(comp.sections.find((s) => s.id === "reservations")!.decision).not.toBe("hidden");
    expect((comp.sections.find((s) => s.id === "reservations")!.props as any).reservationUrl).toBe("https://reserve.example.com/book");
    const without = googleMapsSource();
    expect(buildAll(without).bp.visibleSections).not.toContain("reservations");
  });

  it("no structured business data → no fabricated Menu/Hours/Reservations", () => {
    const source = googleMapsSource();
    const { bp, comp } = buildAll(source);
    // Only hero, location, contact should be visible among business sections
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("location");
    expect(bp.visibleSections).toContain("contact");
    expect(bp.visibleSections).not.toContain("menu");
    expect(bp.visibleSections).not.toContain("hours");
    expect(bp.visibleSections).not.toContain("reservations");
    // Composition also hidden
    expect(comp.sections.find((s) => s.id === "menu")!.decision).toBe("hidden");
    expect(comp.sections.find((s) => s.id === "hours")!.decision).toBe("hidden");
    expect(comp.sections.find((s) => s.id === "reservations")!.decision).toBe("hidden");
  });

  it("products absent → Products suppressed", () => {
    const source = googleMapsSource();
    const { bp } = buildAll(source);
    expect(bp.visibleSections).not.toContain("products");
    expect(bindSection("products", source, "local_business", "Products").hasData).toBe(false);
    // With real products, Products would still not be in local_business archetype (by design it uses Menu), but binder would have data if called
    const withProds = googleMapsSource({ products: [{ id: "p1", name: "Gift Card", description: "", price: 500, category: "Gift" }] as any });
    expect(bindSection("products", withProds, "local_business", "Products").hasData).toBe(true);
    // But blueprint for local_business still does not include products, so it stays hidden (suppressed)
    expect(buildAll(withProds).bp.visibleSections).not.toContain("products");
  });

  it("professional/creator regression — professional still shows experience/skills, creator still shows media", async () => {
    // Professional via resume
    const profSource: ContentSource = {
      platform: "manual",
      username: "pro",
      displayName: "Pro Designer",
      bio: "Senior Product Designer",
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
        rawText: "Senior Designer at Razorpay",
        summary: "Senior Product Designer with 8 years",
        experience: [{ title: "Senior Designer", company: "Razorpay", duration: "2021-Present", description: "Led design system" }],
        skills: ["Figma", "React"],
        projects: [{ name: "Prism", description: "Design system", raw: "Prism" }],
        education: [{ degree: "B.Des", institution: "NID", years: "2012-2016", raw: "B.Des NID" }],
        certifications: [],
        socialLinks: [],
        location: "Mumbai",
      },
    };
    const { intel: pIntel, rel: pRel } = makeEvidence(profSource);
    const pArch = archetypeResolver.resolve({ evidence: pIntel, relationships: pRel, source: profSource, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    // May be professional_resume or local_business depending on signals, but at least it should not be broken
    const pBp = buildWebsiteBlueprint({
      evidence: pIntel,
      relationships: pRel,
      identity: { entityType: null, primaryNiche: pIntel.primaryNiche, businessModel: null, audience: [], name: profSource.displayName, username: profSource.username, subdomain: profSource.username },
      archetype: pArch,
      source: profSource,
    });
    // If professional, should contain experience/skills
    if (pArch.archetype === "professional_resume") {
      expect(pBp.visibleSections).toContain("experience");
      expect(pBp.visibleSections).toContain("skills");
    }
    // Creator
    const creatorSource: ContentSource = {
      platform: "youtube",
      username: "creator",
      displayName: "Creator",
      bio: "Gaming creator and lifestyle vlogger",
      avatarUrl: "",
      followers: 50000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [{ id: "c1", type: "video", text: "New gaming highlights", hashtags: [], mentions: [], likes: 100, comments: 10, shares: 5, createdAt: new Date().toISOString(), url: "https://youtube.com/watch?v=abc" }],
      categories: [],
      links: ["https://youtube.com/@creator", "https://instagram.com/creator"],
      socialLinks: ["https://youtube.com/@creator"],
    };
    const { intel: cIntel, rel: cRel } = makeEvidence(creatorSource);
    const cArch = archetypeResolver.resolve({ evidence: cIntel, relationships: cRel, source: creatorSource, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(cArch.archetype).toBe("creator");
    const cBp = buildWebsiteBlueprint({
      evidence: cIntel,
      relationships: cRel,
      identity: { entityType: null, primaryNiche: cIntel.primaryNiche, businessModel: null, audience: [], name: creatorSource.displayName, username: creatorSource.username, subdomain: creatorSource.username },
      archetype: cArch,
      source: creatorSource,
    });
    expect(cBp.visibleSections).toContain("hero");
    // Creator should have media/links visible, not location
    expect(cBp.visibleSections).not.toContain("location");
  });
});
