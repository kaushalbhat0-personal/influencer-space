import { describe, it, expect } from "vitest";
import { composeStorefront, sourceToCompositionIdentity, COMPOSITION_VERSION } from "@/lib/generation/intelligence/composition/engine";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { CompositionInput } from "@/lib/generation/intelligence/composition/engine";

function compose(bio: string, source: Partial<ContentSource> = {}): ReturnType<typeof composeStorefront> {
  const src: ContentSource = {
    platform: "youtube",
    username: "creator",
    displayName: "Creator",
    bio,
    avatarUrl: "https://img/avatar.jpg",
    followers: 1000,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://x.com/creator"],
    ...source,
  };
  const evidence = buildEvidenceIntelligence({
    sourceText: bio,
    sourceContentTexts: [src.platform],
    followers: src.followers,
    acquisitionCompleteness: 0.9,
    graphNiche: null,
    graphConfidence: 0.5,
    aiEntity: null,
    aiNiches: [],
    aiBusinessModel: null,
    aiUsed: false,
  });
  const relationships = buildRelationshipGraph(bio, [src.platform]);
  const blueprint = buildWebsiteBlueprint({
    evidence,
    relationships,
    identity: { entityType: null, primaryNiche: evidence.primaryNiche, businessModel: null, audience: [], name: src.displayName, username: src.username, subdomain: src.username },
  });
  const identity = sourceToCompositionIdentity(src);
  identity.entityType = blueprint.entity;
  const input: CompositionInput = { blueprint, identity, evidence, relationships };
  return composeStorefront(input);
}

describe("Storefront Composition — blueprint → Builder Aggregate", () => {
  it("composes a restaurant blueprint into builder configuration (theme/moduleIds/nav)", () => {
    const c = compose("Restaurant with a menu, table reservations and local dining.", { username: "seashell", displayName: "SeaShell" });
    expect(c.entity).toBe("restaurant");
    expect(c.theme.themeId).toBe("com.creatos.modern-restaurant");
    expect(c.layout).toBe("restaurant");
    // Every visible blueprint section maps to an existing component.
    const visible = c.sections.filter((s) => s.decision !== "hidden");
    for (const s of visible) expect(s.moduleId.length).toBeGreaterThan(0);
    expect(visible.some((s) => s.id === "menu" && s.moduleId === "links.default")).toBe(true);
    expect(visible.some((s) => s.id === "reservations" && s.moduleId === "contact.default")).toBe(true);
    expect(visible.some((s) => s.id === "hours" && s.moduleId === "faq.default")).toBe(true);
    // Navigation only from visible sections.
    expect(c.navigation.length).toBeGreaterThan(0);
    expect(c.navigation.every((n) => c.visibleSections.includes(n.id))).toBe(true);
    // No products page for a restaurant.
    expect(c.builder.pages.length).toBe(1);
    // Hero media resolved (no fabrication — placeholder since only an avatar).
    expect(["image", "background", "placeholder"]).toContain(c.media.hero.resolvedMedia);
  });

  it("composes a developer blueprint (dark-tech theme, github → links)", () => {
    const c = compose("Fullstack developer. GitHub and open source. TypeScript and React projects.");
    expect(c.theme.themeId).toBe("com.creatos.game-stream");
    expect(c.layout).toBe("portfolio");
    expect(c.sections.some((s) => s.id === "github" && s.moduleId === "links.default")).toBe(true);
    expect(c.sections.some((s) => s.id === "projects" && s.moduleId === "gallery.grid")).toBe(true);
  });

  it("composes an athlete blueprint (achievements → timeline, sponsors → links)", () => {
    const c = compose("Football athlete. FIFA, Champions League with Real Madrid. Nike sponsor.");
    expect(c.entity).toBe("athlete");
    expect(c.theme.themeId).toBe("com.creatos.cyber-arena");
    expect(c.sections.some((s) => s.id === "achievements" && s.moduleId === "timeline.default")).toBe(true);
    expect(c.sections.some((s) => s.id === "sponsors" && s.moduleId === "links.default")).toBe(true);
    // Content mapping populates the hero from identity (name + CTA).
    const hero = c.sections.find((s) => s.id === "hero");
    expect(hero?.props.name).toBe("Creator");
    expect((hero?.props as { cta: string }).cta).toBe("Shop Merch");
  });

  it("composes an educator blueprint (courses → courses module)", () => {
    const c = compose("Educator teaching courses with a community newsletter.");
    expect(c.theme.themeId).toBe("com.creatos.academy");
    expect(c.sections.some((s) => s.id === "courses" && s.moduleId === "courses.default")).toBe(true);
    expect(c.sections.some((s) => s.id === "newsletter" && s.moduleId === "newsletter.default")).toBe(true);
  });

  it("maps hero to the entity variant (fitness → hero.fitness)", () => {
    const c = compose("Fitness coach. Programs, pricing and nutrition coaching.");
    const hero = c.sections.find((s) => s.id === "hero");
    expect(hero?.moduleId).toBe("hero.fitness");
  });

  it("never fabricates content — empty arrays stay empty", () => {
    const c = compose("Restaurant with a menu.");
    // Restaurant hides products — not visible, content arrays empty.
    expect(c.visibleSections).not.toContain("products");
    const products = c.sections.find((s) => s.id === "products");
    if (products) expect(products.decision).toBe("hidden");
    const testimonials = c.sections.find((s) => s.id === "testimonials");
    if (testimonials) expect((testimonials.props as { items: unknown[] }).items).toEqual([]);
  });

  it("is deterministic, serializable and versioned", () => {
    const a = compose("Football athlete. FIFA. Nike sponsor.");
    const b = compose("Football athlete. FIFA. Nike sponsor.");
    expect(a.version).toBe(COMPOSITION_VERSION);
    expect(a.diagnostics.deterministicSignature).toBe(b.diagnostics.deterministicSignature);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(JSON.parse(JSON.stringify(a)).builder.pages.length).toBe(a.builder.pages.length);
  });

  it("produces a builder artifact the existing loader can consume (sections/navigation/theme/metadata)", () => {
    const c = compose("Football athlete. FIFA. Nike sponsor.");
    const artifact = c.builder.artifact;
    expect(artifact.sections.length).toBeGreaterThan(0);
    expect(artifact.navigation.length).toBeGreaterThan(0);
    expect(artifact.theme).toMatch(/^com\.creatos\./);
    expect(artifact.metadata.source).toBe("intelligence-blueprint");
    // Every artifact section has a supported type (resolveModuleId-compatible).
    for (const s of artifact.sections) expect(typeof s.type).toBe("string");
  });

  it("attaches real acquired social links to the links-mapped section (not fabricated)", () => {
    const c = compose("Football athlete with sponsors.", { links: ["https://x.com/cr", "https://youtube.com/@cr"] });
    const sponsors = c.sections.find((s) => s.id === "sponsors");
    expect(sponsors).toBeTruthy();
    expect(sponsors?.moduleId).toBe("links.default");
    expect((sponsors?.props as { items: unknown[] }).items.length).toBeGreaterThan(0);
  });
});
