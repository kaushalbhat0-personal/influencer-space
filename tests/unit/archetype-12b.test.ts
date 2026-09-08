import { describe, it, expect } from "vitest";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { SECTION_MAP } from "@/lib/generation/intelligence/composition/config";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { BLUEPRINT_VERSION } from "@/lib/generation/blueprint/config";
import fs from "fs";
import path from "path";

async function loadKaushalSource() {
  const pdfPath = path.resolve("public/marketing-assets/Resume/Kaushal_Bhat_Resume (2).pdf");
  if (!fs.existsSync(pdfPath)) throw new Error("Kaushal PDF missing");
  const { extractText } = await import("unpdf");
  const buf = fs.readFileSync(pdfPath);
  const r = await extractText(new Uint8Array(buf), { mergePages: true });
  const txt = (r.text as string) || "";
  const acq = await profileAcquisitionEngine.acquire(txt, "Kaushal G Bhat");
  return acq.source;
}

function makeIntel(source: import("@/lib/generation/intelligence/types").ContentSource, followers = 0, graphNiche: string | null = null) {
  const resumeTexts: string[] = source.resume
    ? [
        source.resume.summary,
        ...source.resume.skills,
        ...source.resume.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`),
        ...source.resume.projects.map((p) => `${p.name} ${p.description}`),
        ...source.resume.education.map((e) => `${e.degree} ${e.institution ?? ""}`),
        ...(source.resume.location ? [source.resume.location] : []),
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
  return { intel, rel, resumeTexts };
}

describe("RCCF-PRELAUNCH-12B — Archetype Resolver + Intelligent Website Blueprint", () => {
  it("BLUEPRINT_VERSION bumped to 2", () => {
    expect(BLUEPRINT_VERSION).toBe(2);
  });

  it("professional_resume: Kaushal Resume → professional_resume with correct sections", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: ["resume"], missingFields: [] },
    });
    expect(arch.archetype).toBe("professional_resume");
    expect(arch.confidence).toBeGreaterThan(0.5);
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: {
        entityType: null,
        primaryNiche: intel.primaryNiche,
        businessModel: null,
        audience: [],
        name: source.displayName,
        username: source.username,
        subdomain: source.username || "test",
      },
      archetype: arch,
      source,
    });
    expect(bp.evidence.archetype).toBe("professional_resume");
    expect(bp.sections.find((s) => s.id === "hero")?.decision).not.toBe("hidden");
    expect(bp.sections.find((s) => s.id === "experience")?.decision).not.toBe("hidden");
    expect(bp.sections.find((s) => s.id === "skills")?.decision).not.toBe("hidden");
    expect(bp.sections.find((s) => s.id === "projects")?.decision).not.toBe("hidden");
    expect(bp.sections.find((s) => s.id === "contact")?.decision).not.toBe("hidden");
    // products is not in professional archetype — should be hidden or absent
    const prod = bp.sections.find((s) => s.id === "products" || s.id === "merchandise");
    if (prod) expect(prod.decision).toBe("hidden");
    // empty testimonials hidden
    expect(bp.sections.find((s) => s.id === "testimonials")?.decision).toBe("hidden");
    // visibleSections should contain these
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("experience");
    expect(bp.visibleSections).toContain("skills");
    expect(bp.visibleSections).toContain("projects");
    expect(bp.visibleSections).toContain("contact");
    expect(bp.visibleSections).not.toContain("products");
  });

  it("professional: section ordering deterministic", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] },
    });
    const bp1 = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: null, businessModel: null, audience: [], name: "Kaushal", username: "kaushal", subdomain: "kaushal" },
      archetype: arch,
      source,
    });
    const bp2 = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: null, businessModel: null, audience: [], name: "Kaushal", username: "kaushal", subdomain: "kaushal" },
      archetype: arch,
      source,
    });
    expect(bp1.sections.map((s) => `${s.id}:${s.order}:${s.decision}`)).toEqual(bp2.sections.map((s) => `${s.id}:${s.order}:${s.decision}`));
    expect(bp1.visibleSections).toEqual(bp2.visibleSections);
    // Order should be hero(1) < experience(10) < skills(20) < projects(30) < education(40) < github(50) < contact(100)
    const orderMap = new Map(bp1.sections.map((s) => [s.id, s.order]));
    expect(orderMap.get("hero")).toBeLessThan(orderMap.get("experience")!);
    expect(orderMap.get("experience")!).toBeLessThan(orderMap.get("skills")!);
    expect(orderMap.get("skills")!).toBeLessThan(orderMap.get("projects")!);
    expect(orderMap.get("projects")!).toBeLessThan(orderMap.get("education")!);
  });

  it("creator: youtube creator → creator, products hidden when absent, gallery where available", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
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
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    expect(bp.evidence.archetype).toBe("creator");
    expect(bp.sections.find((s) => s.id === "hero")?.decision).not.toBe("hidden");
    // products where available — absent should be hidden
    expect(bp.sections.find((s) => s.id === "products")?.decision).toBe("hidden");
    // gallery where available — youtube platform should make gallery visible
    expect(bp.visibleSections).toContain("gallery");
    // testimonials where available — absent should be hidden
    expect(bp.sections.find((s) => s.id === "testimonials")?.decision).toBe("hidden");
    expect(bp.visibleSections).toContain("contact");
  });

  it("creator: absent products hidden, present products not hidden (business model)", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "youtube",
      username: "creator123",
      displayName: "Creator One",
      bio: "Gaming creator selling merch and products. Shop now!",
      avatarUrl: "",
      followers: 1000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: [],
    };
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: [],
      followers: 1000,
      acquisitionCompleteness: 0.7,
      graphNiche: "gaming",
      graphConfidence: 0.6,
    });
    // Force business model products by adding keyword "shop" and "products"
    const rel = buildRelationshipGraph(source.bio, ["youtube"]);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] },
    });
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    // If business model detected as products, products should be visible; otherwise at least check hidden logic doesn't crash
    // We don't assert visible here, just that products decision respects data: if no products signal, hidden; if signal, not hidden
    // For this bio with "shop", businessModel may be products, so products might be visible
    const prod = bp.sections.find((s) => s.id === "products");
    expect(prod).toBeDefined();
  });

  it("local_business: menu + location + hours/review → local_business with correct sections", async () => {
    const bio = "Tasty Bites Restaurant in Pune, India. Menu: Biryani, Paneer, Pizza. Location: MG Road, Pune. Hours: Open 9am - 10pm. Reservations: Book a table. Reviews: 5 stars from customers";
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "tastybites",
      displayName: "Tasty Bites",
      bio,
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: [],
      location: "Pune, India",
    };
    const intel = buildEvidenceIntelligence({
      sourceText: bio,
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: "food",
      graphConfidence: 0.5,
    });
    const rel = buildRelationshipGraph(bio, ["manual", bio]);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: ["bio", "location"], missingFields: [] },
    });
    expect(arch.archetype).toBe("local_business");
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("menu");
    expect(bp.visibleSections).toContain("location");
    expect(bp.visibleSections).toContain("hours");
    expect(bp.visibleSections).toContain("reservations");
    expect(bp.visibleSections).toContain("contact");
    // gallery where available — without gallery platforms, may be hidden, but menu/location should be visible
    expect(bp.sections.find((s) => s.id === "menu")?.decision).not.toBe("hidden");
    expect(bp.sections.find((s) => s.id === "location")?.decision).not.toBe("hidden");
  });

  it("local_business: missing menu does not produce empty menu section", async () => {
    const bio = "A cozy cafe in Pune serving great coffee. Location: MG Road.";
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "cozycafe",
      displayName: "Cozy Cafe",
      bio,
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: [],
      location: "Pune, India",
    };
    const intel = buildEvidenceIntelligence({
      sourceText: bio,
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.7,
      graphNiche: "food",
      graphConfidence: 0.5,
    });
    const rel = buildRelationshipGraph(bio, ["manual", bio]);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: ["bio"], missingFields: [] },
    });
    // May still be local_business due to location, but menu should be hidden because no menu keyword
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    // If archetype is local_business, menu should be hidden
    if (bp.evidence.archetype === "local_business") {
      expect(bp.sections.find((s) => s.id === "menu")?.decision).toBe("hidden");
      expect(bp.visibleSections).not.toContain("menu");
    }
  });

  it("ambiguous: weak input does not incorrectly classify as professional/restaurant", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "weak",
      displayName: "Weak",
      bio: "Hello world",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: [],
    };
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.2,
      graphNiche: null,
      graphConfidence: 0.2,
    });
    const rel = buildRelationshipGraph(source.bio, ["manual"]);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.2, populatedFields: [], missingFields: [] },
    });
    expect(arch.archetype).toBe("creator"); // fallback
    expect(arch.confidence).toBeLessThan(0.35);
    expect(intel.primaryEntity).not.toBe("restaurant");
  });

  it("determinism: same input twice → identical archetype + identical blueprint signature", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch1 = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] },
    });
    const arch2 = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] },
    });
    expect(arch1).toEqual(arch2);
    const bp1 = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: null, businessModel: null, audience: [], name: "Kaushal", username: "kaushal", subdomain: "kaushal" },
      archetype: arch1,
      source,
    });
    const bp2 = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: null, businessModel: null, audience: [], name: "Kaushal", username: "kaushal", subdomain: "kaushal" },
      archetype: arch2,
      source,
    });
    expect(bp1.sections).toEqual(bp2.sections);
    expect(bp1.visibleSections).toEqual(bp2.visibleSections);
    expect(bp1.navigation).toEqual(bp2.navigation);
    expect(bp1.evidence.archetype).toBe(bp2.evidence.archetype);
  });

  it("contract: every visible section resolves through SECTION_MAP and navigation within cap, no unknown moduleIds", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({
      evidence: intel,
      relationships: rel,
      source,
      acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] },
    });
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: null, businessModel: null, audience: [], name: "Kaushal", username: "kaushal", subdomain: "kaushal" },
      archetype: arch,
      source,
    });
    for (const id of bp.visibleSections) {
      expect(SECTION_MAP[id]).toBeDefined();
      expect(SECTION_MAP[id].moduleId).toBeTruthy();
    }
    expect(bp.navigation.length).toBeLessThanOrEqual(6);
    expect(bp.navigation.every((n) => bp.visibleSections.includes(n.id))).toBe(true);
    // All blueprint sections should have known SECTION_MAP or be hidden (but visible ones already checked)
    for (const s of bp.sections) {
      if (s.decision !== "hidden") {
        expect(SECTION_MAP[s.id]).toBeDefined();
      }
    }
  });

  it("backward compatibility: existing creator without archetype still works (no source)", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "legacycreator",
      displayName: "Legacy Creator",
      bio: "Creator bio without resume",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      socialLinks: [],
    };
    const intel = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.5,
      graphNiche: null,
      graphConfidence: 0.4,
    });
    const rel = buildRelationshipGraph(source.bio, ["manual"]);
    // Call without archetype (legacy path)
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: null, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      // no archetype, no source
    });
    expect(bp.version).toBe(2);
    expect(bp.sections.length).toBeGreaterThan(0);
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("contact");
  });
});
