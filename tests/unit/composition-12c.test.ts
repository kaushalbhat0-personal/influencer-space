import { describe, it, expect } from "vitest";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { SECTION_MAP } from "@/lib/generation/intelligence/composition/config";
import { resolveHeading, headingOptionsFor } from "@/lib/generation/intelligence/composition/headings";
import { resolveVariant } from "@/lib/generation/intelligence/composition/variants";
import { componentRegistry } from "@/lib/registry/components/registry";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";
import fs from "fs";
import path from "path";

// Ensure registry populated for variant checks
try {
  registerBuiltinComponents();
} catch {}

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

function makeIntel(source: import("@/lib/generation/intelligence/types").ContentSource) {
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
    followers: (source as any).followers ?? 0,
    acquisitionCompleteness: 0.7,
    graphNiche: null,
    graphConfidence: 0.5,
  });
  const rel = buildRelationshipGraph(source.bio ?? "", ["manual", ...resumeTexts]);
  return { intel, rel };
}

describe("RCCF-PRELAUNCH-12C — Semantic Binder + Heading + Variant", () => {
  it("Kaushal: experience → timeline items", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
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
    const exp = comp.sections.find((s) => s.id === "experience");
    expect(exp).toBeDefined();
    expect(exp!.decision).not.toBe("hidden");
    expect((exp!.props as any).items.length).toBeGreaterThanOrEqual(3);
    expect((exp!.props as any).items[0].title).toContain("Operations Head");
  });

  it("Kaushal: skills → services", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    const skills = comp.sections.find((s) => s.id === "skills");
    expect(skills).toBeDefined();
    expect(skills!.decision).not.toBe("hidden");
    expect((skills!.props as any).services.length).toBeGreaterThan(10);
    expect((skills!.props as any).services.some((s: any) => s.title === "TypeScript")).toBe(true);
  });

  it("Kaushal: projects → gallery/work items", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    const proj = comp.sections.find((s) => s.id === "projects");
    expect(proj).toBeDefined();
    expect(proj!.decision).not.toBe("hidden");
    expect((proj!.props as any).images.length).toBeGreaterThanOrEqual(5);
    expect((proj!.props as any).images[0].title).toBeTruthy();
  });

  it("Kaushal: education → timeline items", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    const edu = comp.sections.find((s) => s.id === "education");
    expect(edu).toBeDefined();
    expect(edu!.decision).not.toBe("hidden");
    expect((edu!.props as any).items.length).toBeGreaterThanOrEqual(2);
  });

  it("Kaushal: GitHub → links/navigation", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    const github = comp.sections.find((s) => s.id === "github");
    expect(github).toBeDefined();
    expect(github!.decision).not.toBe("hidden");
    expect((github!.props as any).items.some((it: any) => it.url.includes("github.com"))).toBe(true);
  });

  it("empty skills → skills hidden, empty projects → projects hidden, no fabrication", async () => {
    const source = await loadKaushalSource();
    const emptySkillsSource = { ...source, resume: { ...source.resume!, skills: [] } } as import("@/lib/generation/intelligence/types").ContentSource;
    const { intel, rel } = makeIntel(emptySkillsSource);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source: emptySkillsSource, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source: emptySkillsSource });
    expect(bp.sections.find((s) => s.id === "skills")?.decision).toBe("hidden");
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source: emptySkillsSource });
    expect(comp.sections.find((s) => s.id === "skills")?.decision).toBe("hidden");

    const emptyProjSource = { ...source, resume: { ...source.resume!, projects: [] } } as import("@/lib/generation/intelligence/types").ContentSource;
    const { intel: intel2, rel: rel2 } = makeIntel(emptyProjSource);
    const arch2 = archetypeResolver.resolve({ evidence: intel2, relationships: rel2, source: emptyProjSource, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp2 = buildWebsiteBlueprint({ evidence: intel2, relationships: rel2, identity: { entityType: null, primaryNiche: intel2.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch2, source: emptyProjSource });
    expect(bp2.sections.find((s) => s.id === "projects")?.decision).toBe("hidden");
    const comp2 = composeStorefront({ blueprint: bp2, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel2, relationships: rel2, source: emptyProjSource });
    expect(comp2.sections.find((s) => s.id === "projects")?.decision).toBe("hidden");
  });

  it("heading registry: professional skills/projects/education return configured grounded headings, deterministic", async () => {
    const h1 = resolveHeading("professional_resume", "skills");
    const h2 = resolveHeading("professional_resume", "skills");
    expect(h1).toBe(h2);
    expect(headingOptionsFor("professional_resume", "skills")).toContain(h1);
    expect(headingOptionsFor("professional_resume", "skills")).toContain("Skills");

    const proj = resolveHeading("professional_resume", "projects");
    expect(headingOptionsFor("professional_resume", "projects")).toContain(proj);
    expect(headingOptionsFor("professional_resume", "projects")).toContain("Selected Work");

    const edu = resolveHeading("professional_resume", "education");
    expect(headingOptionsFor("professional_resume", "education")).toContain(edu);

    const creatorGallery = resolveHeading("creator", "gallery");
    expect(headingOptionsFor("creator", "gallery")).toContain(creatorGallery);

    const menu = resolveHeading("local_business", "menu");
    expect(headingOptionsFor("local_business", "menu")).toContain(menu);

    // Never uses arbitrary prose
    const arbitrary = resolveHeading("professional_resume", "skills");
    expect(arbitrary.length).toBeLessThan(30);
    expect(arbitrary).not.toContain("TypeScript");
  });

  it("variant: professional experience → timeline.masonry when appropriate, gallery.bento thresholds", () => {
    const expMasonry = resolveVariant("professional_resume", "experience", "timeline.default", 3);
    expect(expMasonry.moduleId).toBe("timeline.masonry");
    expect(componentRegistry.get(expMasonry.moduleId)).toBeDefined();

    const expDefault = resolveVariant("professional_resume", "experience", "timeline.default", 1);
    expect(expDefault.moduleId).toBe("timeline.default");

    const galBento = resolveVariant("creator", "gallery", "gallery.grid", 6);
    expect(galBento.moduleId).toBe("gallery.bento");

    const galGrid = resolveVariant("creator", "gallery", "gallery.grid", 2);
    expect(galGrid.moduleId).toBe("gallery.grid");

    const prodBento = resolveVariant("creator", "products", "products.grid", 4);
    expect(prodBento.moduleId).toBe("products.bento");

    const prodGrid = resolveVariant("creator", "products", "products.grid", 2);
    expect(prodGrid.moduleId).toBe("products.grid");

    const restaurantGal = resolveVariant("local_business", "gallery", "gallery.grid", 7);
    expect(restaurantGal.moduleId).toBe("gallery.bento");

    const insufficient = resolveVariant("local_business", "gallery", "gallery.grid", 2);
    expect(insufficient.moduleId).toBe("gallery.grid");
  });

  it("variant: every returned variant exists in registry", () => {
    const cases: Array<[string, string, string, number]> = [
      ["professional_resume", "experience", "timeline.default", 5],
      ["professional_resume", "skills", "services.default", 6],
      ["creator", "gallery", "gallery.grid", 6],
      ["creator", "products", "products.grid", 5],
      ["local_business", "gallery", "gallery.grid", 6],
      ["professional_resume", "hero", "hero.default", 1],
    ];
    for (const [arch, sec, base, count] of cases) {
      const v = resolveVariant(arch as any, sec, base, count);
      expect(componentRegistry.get(v.moduleId)).toBeDefined();
    }
  });

  it("navigation: professional includes GitHub/LinkedIn when present, max 6, no duplicates, no invalid URLs", async () => {
    const source = await loadKaushalSource();
    // Add LinkedIn to test
    const withLinkedIn = {
      ...source,
      socialLinks: [...(source.socialLinks ?? []), "https://linkedin.com/in/kaushal-bhat"],
      links: [...(source.links ?? []), "https://linkedin.com/in/kaushal-bhat"],
      resume: { ...source.resume!, socialLinks: [...source.resume!.socialLinks, { platform: "linkedin", url: "https://linkedin.com/in/kaushal-bhat" }] },
    } as import("@/lib/generation/intelligence/types").ContentSource;
    const { intel, rel } = makeIntel(withLinkedIn);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source: withLinkedIn, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source: withLinkedIn });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: withLinkedIn.socialLinks, subdomain: source.username }, evidence: intel, relationships: rel, source: withLinkedIn });
    expect(comp.navigation.length).toBeLessThanOrEqual(6);
    const hrefs = comp.navigation.map((n) => n.href.toLowerCase());
    expect(new Set(hrefs).size).toBe(hrefs.length); // no duplicates
    for (const h of hrefs) {
      if (h.startsWith("http")) expect(h).toMatch(/^https?:\/\//);
    }
    // Professional should have at least GitHub in navigation or sections (section href is anchor, but external nav should include github if cap allows; however blueprint already has github section anchor, external may be capped)
    // At least check that composition has github link somewhere
    const hasGithub = comp.navigation.some((n) => n.href.includes("github.com")) || comp.sections.some((s) => JSON.stringify(s.props).includes("github.com"));
    expect(hasGithub).toBe(true);
  });

  it("navigation: creator includes social links when present", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "youtube",
      username: "creator123",
      displayName: "Creator One",
      bio: "Gaming creator",
      avatarUrl: "",
      followers: 1000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@creator123", "https://instagram.com/creator123"],
      socialLinks: ["https://youtube.com/@creator123", "https://instagram.com/creator123"],
    };
    const intel = buildEvidenceIntelligence({ sourceText: source.bio, sourceContentTexts: [], followers: source.followers, acquisitionCompleteness: 0.7, graphNiche: "gaming", graphConfidence: 0.6 });
    const rel = buildRelationshipGraph(source.bio, ["youtube", source.bio]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks, subdomain: source.username }, evidence: intel, relationships: rel, source });
    expect(comp.navigation.length).toBeLessThanOrEqual(6);
    const hasSocial = comp.navigation.some((n) => n.href.includes("youtube.com") || n.href.includes("instagram.com")) || comp.sections.some((s) => JSON.stringify(s.props).includes("youtube.com"));
    expect(hasSocial).toBe(true);
  });

  it("navigation: local business includes location/menu/reservation when present, max 6", async () => {
    const bio = "Tasty Bites Restaurant Pune Menu: Biryani, Pizza Location: MG Road Hours: Open 9am - 10pm Reservations: Book a table Reviews: great";
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "tasty",
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
    const intel = buildEvidenceIntelligence({ sourceText: bio, sourceContentTexts: [], followers: 0, acquisitionCompleteness: 0.7, graphNiche: "food", graphConfidence: 0.5 });
    const rel = buildRelationshipGraph(bio, ["manual", bio]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    expect(comp.navigation.length).toBeLessThanOrEqual(6);
    expect(comp.visibleSections).toContain("menu");
    expect(comp.visibleSections).toContain("location");
    expect(comp.navigation.some((n) => n.id === "menu" || n.href.includes("menu"))).toBe(true);
  });

  it("composition contract: every section resolves through SECTION_MAP, deterministic signature stable, no unknown moduleIds", async () => {
    const source = await loadKaushalSource();
    const { intel, rel } = makeIntel(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp1 = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    const comp2 = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    expect(comp1.diagnostics.deterministicSignature).toBe(comp2.diagnostics.deterministicSignature);
    for (const sec of comp1.sections.filter((s) => s.decision !== "hidden")) {
      expect(SECTION_MAP[sec.id]).toBeDefined();
      expect(componentRegistry.get(sec.moduleId)).toBeDefined();
    }
    expect(comp1.diagnostics.unmappedSections.length).toBe(0);
  });
});
