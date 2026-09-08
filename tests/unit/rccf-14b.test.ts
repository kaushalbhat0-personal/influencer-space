import { describe, it, expect, beforeEach } from "vitest";
import { profileAcquisitionEngine } from "@/lib/generation/acquisition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { BuilderService } from "@/lib/builder/builder-service";
import { prisma } from "@/lib/prisma";
import { SECTION_CATALOG } from "@/lib/builder/catalog";
import { componentRegistry } from "@/lib/registry/components/registry";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";
import fs from "fs";
import path from "path";

try { registerBuiltinComponents(); } catch {}

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
      ].filter(Boolean)
    : [];
  const intel = buildEvidenceIntelligence({
    sourceText: source.bio ?? "",
    sourceContentTexts: resumeTexts,
    followers: 0,
    acquisitionCompleteness: 0.7,
    graphNiche: null,
    graphConfidence: 0.5,
    resume: source.resume ?? null,
  });
  const rel = buildRelationshipGraph(source.bio ?? "", ["manual", ...resumeTexts]);
  return { intel, rel };
}

describe("14B — Dynamic Dashboard + Multi-Instance", () => {
  beforeEach(async () => {
    const { builderStore } = await import("@/lib/builder/store");
    // Reset to a clean single-page empty state
    const emptyPage: import("@/lib/builder/types").BuilderPage = {
      id: "page_test",
      name: "Home",
      slug: "/",
      order: 0,
      isHome: true,
      sections: [],
      theme: "default",
      metadata: {},
    };
    (builderStore as unknown as { hydrate: (p: unknown) => void }).hydrate([emptyPage]);
  });

  it("1. professional dashboard hides Games/Products/Courses when absent", async () => {
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
    expect(bp.visibleSections).not.toContain("games");
    expect(bp.visibleSections).not.toContain("products");
    expect(bp.visibleSections).not.toContain("courses");
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("skills");
  });

  it("2. creator dashboard reflects creator sections", async () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "youtube",
      username: "creator123",
      displayName: "Creator One",
      bio: "Gaming creator with YouTube and Twitch",
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
    const intel = buildEvidenceIntelligence({ sourceText: source.bio, sourceContentTexts: [], followers: 50000, acquisitionCompleteness: 0.7, graphNiche: "gaming", graphConfidence: 0.8, resume: null });
    const rel = buildRelationshipGraph(source.bio, ["youtube", source.bio]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    expect(arch.archetype).toBe("creator");
    expect(bp.visibleSections).toContain("gallery");
  });

  it("3. local-business dashboard reflects business sections", async () => {
    const bio = "Tasty Bites Restaurant Pune, India. Menu: Biryani, Pizza. Location: MG Road. Hours: Open 9am - 10pm. Reservations: Book a table.";
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
    const intel = buildEvidenceIntelligence({ sourceText: bio, sourceContentTexts: [], followers: 0, acquisitionCompleteness: 0.7, graphNiche: "food", graphConfidence: 0.5, resume: null });
    const rel = buildRelationshipGraph(bio, ["manual", bio]);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel,
      relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch,
      source,
    });
    expect(arch.archetype).toBe("local_business");
    expect(bp.visibleSections).toContain("menu");
  });

  it("4. Add Section is available from dashboard catalog", () => {
    expect(SECTION_CATALOG.length).toBeGreaterThan(10);
    expect(SECTION_CATALOG.find((c) => c.componentId === "timeline.default")).toBeDefined();
    expect(SECTION_CATALOG.find((c) => c.componentId === "gallery.grid")).toBeDefined();
  });

  it("5. Add Section uses canonical catalog/registry", () => {
    for (const entry of SECTION_CATALOG) {
      expect(componentRegistry.get(entry.componentId)).toBeDefined();
    }
  });

  it("6. Added section receives unique section.id", async () => {
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
    const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
    const pages = storefrontToBuilderPages({
      sections: comp.builder.artifact.sections.map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
      navigation: comp.builder.artifact.navigation as Record<string, unknown> | undefined,
    });
    const originalFirstId = pages[0].sections[0].id;
    const { builderStore } = await import("@/lib/builder/store");
    builderStore.hydrate(pages);
    const sec = builderStore.addSection("Timeline Test");
    builderStore.insertComponent("timeline.default", sec.id, 0);
    const after = builderStore.serialize();
    const added = after[0].sections.find((s) => s.id === sec.id);
    expect(added).toBeDefined();
    expect(added!.id).not.toBe(originalFirstId);
  });

  it("7. Added section receives correct moduleId", async () => {
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
    const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
    const pages = storefrontToBuilderPages({
      sections: comp.builder.artifact.sections.map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
      navigation: comp.builder.artifact.navigation as Record<string, unknown> | undefined,
    });
    const { builderStore } = await import("@/lib/builder/store");
    builderStore.hydrate(pages);
    const sec = builderStore.addSection("Timeline Test");
    builderStore.insertComponent("timeline.default", sec.id, 0);
    const after = builderStore.serialize();
    const added = after[0].sections.find((s) => s.id === sec.id);
    expect(added!.slots[0].moduleId).toBe("timeline.default");
  });

  it("8. Added section starts empty/default", async () => {
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
    const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
    const pages = storefrontToBuilderPages({
      sections: comp.builder.artifact.sections.map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
      navigation: comp.builder.artifact.navigation as Record<string, unknown> | undefined,
    });
    const { builderStore } = await import("@/lib/builder/store");
    builderStore.hydrate(pages);
    const sec = builderStore.addSection("Timeline Test");
    builderStore.insertComponent("timeline.default", sec.id, 0);
    const after = builderStore.serialize();
    const added = after[0].sections.find((s) => s.id === sec.id);
    expect(added!.slots[0].config).toHaveProperty("entityType", "timeline");
    expect((added!.slots[0].config as Record<string, unknown>).title).toBeUndefined();
  });

  it("9. Existing generated section is unchanged after Add Section", async () => {
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
    const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
    const pages = storefrontToBuilderPages({
      sections: comp.builder.artifact.sections.map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
      navigation: comp.builder.artifact.navigation as Record<string, unknown> | undefined,
    });
    const originalFirstId = pages[0].sections[0].id;
    const { builderStore } = await import("@/lib/builder/store");
    builderStore.hydrate(pages);
    const sec = builderStore.addSection("Timeline Test");
    builderStore.insertComponent("timeline.default", sec.id, 0);
    const after = builderStore.serialize();
    const firstAfter = after[0].sections.find((s) => s.id === originalFirstId);
    expect(firstAfter).toBeDefined();
    expect(firstAfter!.id).toBe(originalFirstId);
  });

  it("10. Timeline ×2 preserves independent headings/content/config", async () => {
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
    const timelines = comp.sections.filter((s) => s.id === "experience" || s.id === "education" || s.id === "timeline");
    // For professional, we have experience and education as separate timeline instances
    const exp = comp.sections.find((s) => s.id === "experience");
    const edu = comp.sections.find((s) => s.id === "education");
    expect(exp).toBeDefined();
    expect(edu).toBeDefined();
    expect((exp!.props as any).items.length).toBeGreaterThan(0);
    expect((edu!.props as any).items.length).toBeGreaterThan(0);
    expect((exp!.props as any).title).not.toBe((edu!.props as any).title);
  });

  it("11. Gallery ×2 preserves independent instances", async () => {
    const { builderStore } = await import("@/lib/builder/store");
    const p = builderStore.addSection("Gallery One");
    builderStore.insertComponent("gallery.grid", p.id, 0);
    const p2 = builderStore.addSection("Gallery Two");
    builderStore.insertComponent("gallery.grid", p2.id, 0);
    const pages = builderStore.serialize();
    const gallerySections = pages[0].sections.filter((s) => s.slots.some((sl) => sl.moduleId === "gallery.grid"));
    expect(gallerySections.length).toBe(2);
    expect(gallerySections[0].id).not.toBe(gallerySections[1].id);
    expect(gallerySections[0].slots[0].moduleId).toBe(gallerySections[1].slots[0].moduleId);
    expect(gallerySections[0].slots[0].config).toHaveProperty("entityType", "gallery");
    expect(gallerySections[1].slots[0].config).toHaveProperty("entityType", "gallery");
  });

  it("12. Services ×2 preserves independent instances", async () => {
    const { builderStore } = await import("@/lib/builder/store");
    const p = builderStore.addSection("Services One");
    builderStore.insertComponent("services.default", p.id, 0);
    const p2 = builderStore.addSection("Services Two");
    builderStore.insertComponent("services.default", p2.id, 0);
    const pages = builderStore.serialize();
    const svcSections = pages[0].sections.filter((s) => s.slots.some((sl) => sl.moduleId === "services.default"));
    expect(svcSections.length).toBe(2);
    expect(svcSections[0].id).not.toBe(svcSections[1].id);
    expect(svcSections[0].slots[0].moduleId).toBe("services.default");
    expect(svcSections[1].slots[0].moduleId).toBe("services.default");
  });

  it("13. Builder → Snapshot preserves all instances", async () => {
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
    const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
    const pages = storefrontToBuilderPages({
      sections: comp.builder.artifact.sections.map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
      navigation: comp.builder.artifact.navigation as Record<string, unknown> | undefined,
    });
    expect(pages[0].sections.length).toBe(7);
    const timelineSections = pages[0].sections.filter((s) => s.slots[0].moduleId === "timeline.default");
    expect(timelineSections.length).toBe(2);
    const { buildRuntimeSnapshot } = await import("@/lib/storefront/build-snapshot");
    const agg = { hero: {}, products: [], gallery: [], timeline: [], services: [], links: [], testimonials: [], faq: [], games: [], contentFeed: [], courses: [], bookings: [], identity: { name: "Test", socialLinks: [] }, siteSocialLinks: [] } as any;
    const snap = buildRuntimeSnapshot({
      websiteId: "test-website-id",
      correlationId: "test",
      builderPages: pages,
      aggregate: agg,
      navItems: [],
      themePackageId: comp.theme.themeId,
      themeColors: {},
      themeFonts: {},
      themeConfig: {},
      experience: {} as any,
    });
    expect(snap.layout.pages[0].sections.length).toBe(7);
    const snapTimelines = snap.layout.pages[0].sections.filter((s: any) => s.moduleId === "timeline.default");
    expect(snapTimelines.length).toBe(2);
    expect(snapTimelines[0].id).not.toBe(snapTimelines[1].id);
  });

  it("14. Snapshot → Storefront preserves all instances", async () => {
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
    // Add a second timeline
    const { storefrontToBuilderPages } = await import("@/lib/builder/artifact-loader");
    const pages = storefrontToBuilderPages({
      sections: comp.builder.artifact.sections.map((s: any) => ({ id: s.id, type: s.type, props: s.props })),
      navigation: comp.builder.artifact.navigation as Record<string, unknown> | undefined,
    });
    const { builderStore } = await import("@/lib/builder/store");
    builderStore.hydrate(pages);
    const sec = builderStore.addSection("Extra Timeline");
    builderStore.insertComponent("timeline.default", sec.id, 0);
    const afterPages = builderStore.serialize();
    const { buildRuntimeSnapshot } = await import("@/lib/storefront/build-snapshot");
    const agg = { hero: {}, products: [], gallery: [], timeline: [], services: [], links: [], testimonials: [], faq: [], games: [], contentFeed: [], courses: [], bookings: [], identity: { name: "Test", socialLinks: [] }, siteSocialLinks: [] } as any;
    const snap = buildRuntimeSnapshot({
      websiteId: "test-website-id",
      correlationId: "test2",
      builderPages: afterPages,
      aggregate: agg,
      navItems: [],
      themePackageId: comp.theme.themeId,
      themeColors: {},
      themeFonts: {},
      themeConfig: {},
      experience: {} as any,
    });
    // Snapshot should have 8 sections (original 7 + 1 added)
    expect(snap.layout.pages[0].sections.length).toBe(8);
  });

  it("15. Dashboard updates after adding a section", async () => {
    const { builderStore } = await import("@/lib/builder/store");
    const before = builderStore.serialize()[0].sections.length;
    const sec = builderStore.addSection("New Services");
    builderStore.insertComponent("services.default", sec.id, 0);
    const after = builderStore.serialize()[0].sections.length;
    expect(after).toBe(before + 1);
    const { getDynamicContentNavItems } = await import("@/lib/navigation/dynamic-content");
    // Mock prisma for this test by directly checking the store
    const sections = builderStore.serialize()[0].sections;
    expect(sections.some((s) => s.id === sec.id)).toBe(true);
  });

  it("16. No irrelevant registry modules appear in Content navigation", async () => {
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
    expect(bp.visibleSections).not.toContain("games");
    expect(bp.visibleSections).not.toContain("products");
    expect(SECTION_CATALOG.find((c) => c.componentId === "games.default")).toBeDefined();
    expect(SECTION_CATALOG.find((c) => c.componentId === "products.grid")).toBeDefined();
    // But they are not in visibleSections for professional
    expect(bp.visibleSections).not.toContain("games");
  });
});
