import { describe, it, expect } from "vitest";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { composeStorefront } from "@/lib/generation/intelligence/composition/engine";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { bindSection } from "@/lib/generation/intelligence/composition/binder";
import { SECTION_MAP } from "@/lib/generation/intelligence/composition/config";
import { componentRegistry } from "@/lib/registry/components/registry";
import { registerBuiltinComponents } from "@/lib/registry/components/builtins";
import { buildRuntimeSnapshot } from "@/lib/storefront/build-snapshot";
import { layoutEngine } from "@/lib/storefront/layout-engine";

try { registerBuiltinComponents(); } catch {}

function makeEvidence(source: import("@/lib/generation/intelligence/types").ContentSource) {
  const resumeTexts: string[] = source.resume ? [
    source.resume.summary,
    ...source.resume.skills,
    ...source.resume.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`),
    ...source.resume.projects.map((p) => `${p.name} ${p.description}`),
    ...source.resume.education.map((e) => `${e.degree} ${e.institution ?? ""}`),
  ].filter(Boolean) : [];
  const allTexts = [...(source.content?.map((c) => c.text) ?? []), ...(source.keywords ?? []), ...(source.hashtags ?? []), ...resumeTexts];
  const intel = buildEvidenceIntelligence({
    sourceText: source.bio ?? "",
    sourceContentTexts: allTexts,
    followers: source.followers ?? 0,
    acquisitionCompleteness: 0.7,
    graphNiche: null,
    graphConfidence: 0.5,
    resume: source.resume ?? null,
  });
  const platformHint = source.platform;
  const rel = buildRelationshipGraph(source.bio ?? "", [platformHint, ...allTexts]);
  return { intel, rel };
}

function creatorABase(): import("@/lib/generation/intelligence/types").ContentSource {
  return {
    platform: "youtube",
    username: "creatorA",
    displayName: "Creator A",
    bio: "Gaming creator and lifestyle vlogger. Follow my channel!",
    avatarUrl: "",
    followers: 50000,
    following: 100,
    posts: 10,
    engagement: 0.05,
    content: [
      { id: "c1", type: "video", text: "New gaming highlights", hashtags: [], mentions: [], likes: 100, comments: 10, shares: 5, createdAt: new Date().toISOString(), url: "https://youtube.com/watch?v=abc123" },
    ],
    categories: [],
    links: [
      "https://youtube.com/@creatorA",
      "https://instagram.com/creatorA",
      "https://twitch.tv/creatorA",
      "https://spotify.com/artist/creatorA",
      "https://discord.com/invite/creatorA",
    ],
    socialLinks: [
      "https://youtube.com/@creatorA",
      "https://instagram.com/creatorA",
      "https://twitch.tv/creatorA",
      "https://spotify.com/artist/creatorA",
      "https://discord.com/invite/creatorA",
    ],
  };
}

function creatorBWithProducts(): import("@/lib/generation/intelligence/types").ContentSource {
  const base = creatorABase();
  return {
    ...base,
    username: "creatorB",
    displayName: "Creator B",
    products: [
      { id: "prod_1", name: "Creator Hoodie", description: "Limited edition hoodie", price: 2499, imageUrl: "https://cdn.example.com/hoodie.jpg", category: "Apparel", slug: "creator-hoodie" },
      { id: "prod_2", name: "Signed Poster", description: "Signed poster", price: 599, imageUrl: "https://cdn.example.com/poster.jpg", category: "Art", slug: "signed-poster" },
    ],
  };
}

function creatorCWithGallery(): import("@/lib/generation/intelligence/types").ContentSource {
  const base = creatorABase();
  return {
    ...base,
    username: "creatorC",
    displayName: "Creator C",
    gallery: [
      { id: "g1", title: "Shoot 1", description: "behind scenes", imageUrl: "https://cdn.example.com/g1.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 1" },
      { id: "g2", title: "Shoot 2", description: "behind scenes 2", imageUrl: "https://cdn.example.com/g2.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 2" },
      { id: "g3", title: "Shoot 3", description: "behind scenes 3", imageUrl: "https://cdn.example.com/g3.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 3" },
      { id: "g4", title: "Shoot 4", description: "behind scenes 4", imageUrl: "https://cdn.example.com/g4.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 4" },
      { id: "g5", title: "Shoot 5", description: "behind scenes 5", imageUrl: "https://cdn.example.com/g5.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 5" },
      { id: "g6", title: "Shoot 6", description: "behind scenes 6", imageUrl: "https://cdn.example.com/g6.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 6" },
      { id: "g7", title: "Shoot 7", description: "behind scenes 7", imageUrl: "https://cdn.example.com/g7.jpg", mediaType: "image", videoUrl: null, altText: "Shoot 7" },
    ],
  };
}

function localBusinessA(): import("@/lib/generation/intelligence/types").ContentSource {
  return {
    platform: "manual",
    username: "tastybits",
    displayName: "Tasty Bites",
    bio: "Family restaurant in Pune — authentic flavors",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://maps.google.com/maps?q=Tasty+Bites+Pune"],
    socialLinks: ["https://instagram.com/tastybites"],
    location: "MG Road, Pune, India",
    googleMapsUrl: "https://maps.google.com/maps?q=Tasty+Bites+Pune",
    hours: "Mon-Sun 9am - 10pm",
    reservationUrl: "https://tastybites.com/reserve",
    menuItems: [
      { name: "Biryani", description: "Hyderabadi biryani", price: 350, imageUrl: "https://cdn.example.com/biryani.jpg", category: "Main" },
      { name: "Paneer Tikka", description: "Cottage cheese tikka", price: 280, category: "Starter", imageUrl: "https://cdn.example.com/paneer.jpg" },
      { name: "Gulab Jamun", description: "Sweet dessert", price: 120, category: "Dessert" },
    ],
    testimonials: [
      { author: "Aarav S", content: "Best biryani in Pune!", rating: 5, role: "Foodie" },
      { author: "Neha K", content: "Great ambiance and service", rating: 4, role: "Customer" },
    ],
    gallery: [
      { id: "gal1", title: "Dining Area", description: "Cozy dining", imageUrl: "https://cdn.example.com/dining.jpg", mediaType: "image", videoUrl: null, altText: "Dining" },
    ],
  };
}

function localBusinessBHealthcareInProject(): import("@/lib/generation/intelligence/types").ContentSource {
  return {
    platform: "manual",
    username: "tastybits2",
    displayName: "Tasty Bites",
    bio: "Authentic restaurant in Pune — serving smiles",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: ["https://maps.google.com/maps?q=Tasty+Bites+Pune"],
    socialLinks: ["https://instagram.com/tastybites"],
    location: "MG Road, Pune",
    googleMapsUrl: "https://maps.google.com/maps?q=Tasty+Bites+Pune",
    menuItems: [
      { name: "Biryani", description: "Delicious", price: 300 },
    ],
    hours: "Open 10am - 10pm",
    reservationUrl: "https://tastybites.com/reserve",
    resume: {
      rawText: "Projects: Healthcare dashboard for clinic management. Skills: cooking, service",
      summary: "Restaurant with focus on dining",
      experience: [],
      skills: ["cooking"],
      projects: [{ name: "Healthcare dashboard", description: "Clinic patient management app for a hospital", raw: "Healthcare dashboard..." }],
      education: [],
      certifications: [],
      socialLinks: [],
      location: "Pune",
    },
  };
}

describe("RCCF-PRELAUNCH-15B — Creator + Local Business Content Binding", () => {
  it("Creator A: youtube+instagram+twitch+spotify+discord, no products → creator, media/community visible, no Products/Testimonials", () => {
    const source = creatorABase();
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(arch.archetype).toBe("creator");
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch, source,
    });
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    // archetype creator
    expect(bp.evidence.archetype).toBe("creator");
    // media should be visible (youtube/instagram/twitch/spotify)
    const media = comp.sections.find((s) => s.id === "media");
    expect(media).toBeDefined();
    expect(media!.decision).not.toBe("hidden");
    const mediaFeed = (media!.props as any).feed as unknown[];
    expect(mediaFeed.length).toBeGreaterThan(0);
    // community should be visible (discord)
    const community = comp.sections.find((s) => s.id === "community");
    expect(community).toBeDefined();
    expect(community!.decision).not.toBe("hidden");
    const commItems = (community!.props as any).items as Array<{ url: string }>;
    expect(commItems.some((i) => i.url.toLowerCase().includes("discord"))).toBe(true);
    // links should be visible
    const links = comp.sections.find((s) => s.id === "links");
    if (links) expect(links.decision).not.toBe("hidden");
    // Products must remain hidden (no structured products, do not invent)
    const products = comp.sections.find((s) => s.id === "products");
    expect(products).toBeDefined();
    expect(products!.decision).toBe("hidden");
    // Testimonials without review evidence → hidden, not fabricated from creator/social
    const testimonials = comp.sections.find((s) => s.id === "testimonials");
    expect(testimonials).toBeDefined();
    expect(testimonials!.decision).toBe("hidden");
    // Binder directly: products hidden, community only community urls
    const pBind = bindSection("products", source, "creator", "Products");
    expect(pBind.hasData).toBe(false);
    const commBind = bindSection("community", source, "creator", "Community");
    expect(commBind.hasData).toBe(true);
    expect((commBind.props as any).items.some((i: any) => i.url.includes("discord.com"))).toBe(true);
    // Should not contain youtube in community (only discord/telegram/whatsapp)
    expect((commBind.props as any).items.every((i: any) => !i.url.toLowerCase().includes("youtube"))).toBe(true);
    const testBind = bindSection("testimonials", source, "creator", "Testimonials");
    expect(testBind.hasData).toBe(false);
  });

  it("Creator B: Creator A + real structured product data → Products visible with actual data, no fake", () => {
    const source = creatorBWithProducts();
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({
      evidence: intel, relationships: rel,
      identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username },
      archetype: arch, source,
    });
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    expect(arch.archetype).toBe("creator");
    const products = comp.sections.find((s) => s.id === "products");
    expect(products).toBeDefined();
    expect(products!.decision).not.toBe("hidden");
    const prods = (products!.props as any).products as Array<{ name: string; price: number; imageUrl: string }>;
    expect(prods.length).toBe(2);
    expect(prods.some((p) => p.name === "Creator Hoodie")).toBe(true);
    expect(prods.some((p) => p.name === "Signed Poster")).toBe(true);
    // Must preserve actual details and not dummy url
    expect(prods.every((p) => typeof p.name === "string" && p.name.length > 0)).toBe(true);
    // No invented products beyond source
    expect(prods.length).toBe(source.products!.length);
    // gallery/media remains correct (media still visible)
    const media = comp.sections.find((s) => s.id === "media");
    expect(media!.decision).not.toBe("hidden");
    // Binder directly
    const pBind = bindSection("products", source, "creator", "Products");
    expect(pBind.hasData).toBe(true);
    expect(pBind.itemCount).toBe(2);
    expect(((pBind.props as any).products as Array<any>).some((p) => p.name === "Creator Hoodie")).toBe(true);
  });

  it("Creator C: real media assets → gallery uses appropriate variant, bento only when justified", () => {
    const sourceNoAssets = creatorABase();
    const { intel: intel1, rel: rel1 } = makeEvidence(sourceNoAssets);
    const arch1 = archetypeResolver.resolve({ evidence: intel1, relationships: rel1, source: sourceNoAssets, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp1 = buildWebsiteBlueprint({ evidence: intel1, relationships: rel1, identity: { entityType: null, primaryNiche: intel1.primaryNiche, businessModel: null, audience: [], name: sourceNoAssets.displayName, username: sourceNoAssets.username, subdomain: sourceNoAssets.username }, archetype: arch1, source: sourceNoAssets });
    const comp1 = composeStorefront({ blueprint: bp1, identity: { entityType: null, name: sourceNoAssets.displayName, username: sourceNoAssets.username, bio: sourceNoAssets.bio, tagline: null, avatarUrl: sourceNoAssets.avatarUrl, socialLinks: sourceNoAssets.socialLinks ?? [], subdomain: sourceNoAssets.username }, evidence: intel1, relationships: rel1, source: sourceNoAssets });
    const gal1 = comp1.sections.find((s) => s.id === "gallery");
    // Without real gallery assets, gallery should be hidden (no fabrication)
    expect(gal1!.decision).toBe("hidden");

    const sourceWithAssets = creatorCWithGallery();
    const { intel, rel } = makeEvidence(sourceWithAssets);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source: sourceWithAssets, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: sourceWithAssets.displayName, username: sourceWithAssets.username, subdomain: sourceWithAssets.username }, archetype: arch, source: sourceWithAssets });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: sourceWithAssets.displayName, username: sourceWithAssets.username, bio: sourceWithAssets.bio, tagline: null, avatarUrl: sourceWithAssets.avatarUrl, socialLinks: sourceWithAssets.socialLinks ?? [], subdomain: sourceWithAssets.username }, evidence: intel, relationships: rel, source: sourceWithAssets });
    const gal = comp.sections.find((s) => s.id === "gallery");
    expect(gal).toBeDefined();
    expect(gal!.decision).not.toBe("hidden");
    // 7 real assets → should use bento (threshold 6 and hasRealAssets true)
    expect(gal!.moduleId).toBe("gallery.bento");
    const images = (gal!.props as any).images as Array<any>;
    expect(images.length).toBe(7);
    expect(images.every((im) => im.imageUrl && im.imageUrl.length > 0)).toBe(true);

    // Also verify binder hasRealAssets detection
    const galBind = bindSection("gallery", sourceWithAssets, "creator", "Gallery");
    expect(galBind.hasData).toBe(true);
    expect(galBind.itemCount).toBe(7);
  });

  it("Local Business A: restaurant with menu/location/maps/hours/reservations/reviews → all bound, menu not links with #", () => {
    const source = localBusinessA();
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    expect(arch.archetype).toBe("local_business");
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({
      blueprint: bp,
      identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username },
      evidence: intel, relationships: rel, source,
    });
    expect(bp.visibleSections).toContain("menu");
    expect(bp.visibleSections).toContain("location");
    expect(bp.visibleSections).toContain("hours");
    expect(bp.visibleSections).toContain("reservations");
    expect(bp.visibleSections).toContain("testimonials");

    const menu = comp.sections.find((s) => s.id === "menu");
    expect(menu).toBeDefined();
    expect(menu!.decision).not.toBe("hidden");
    // Menu must be products.* renderer, not links.default
    expect(SECTION_MAP["menu"].moduleId).toBe("products.grid");
    expect(menu!.moduleId.startsWith("products.")).toBe(true);
    expect(menu!.type).toBe("products");
    const menuProds = (menu!.props as any).products as Array<{ name: string; price: number }>;
    expect(menuProds.length).toBe(3);
    expect(menuProds.some((p) => p.name === "Biryani")).toBe(true);
    expect(menuProds.some((p) => p.name === "Paneer Tikka")).toBe(true);
    // No dummy URLs
    const hasDummy = JSON.stringify(menu!.props).includes('"url":"#"') || JSON.stringify(menu!.props).includes('"url": "#"');
    expect(hasDummy).toBe(false);
    // Ensure menu props do not contain links.default shape with url "#"
    expect((menu!.props as any).items).toBeUndefined();
    expect(Array.isArray((menu!.props as any).products)).toBe(true);

    const location = comp.sections.find((s) => s.id === "location");
    expect(location!.decision).not.toBe("hidden");
    expect((location!.props as any).address).toBe("MG Road, Pune, India");
    expect((location!.props as any).googleMapsUrl).toBe("https://maps.google.com/maps?q=Tasty+Bites+Pune");

    const hours = comp.sections.find((s) => s.id === "hours");
    expect(hours!.decision).not.toBe("hidden");

    const reservations = comp.sections.find((s) => s.id === "reservations");
    expect(reservations!.decision).not.toBe("hidden");
    expect((reservations!.props as any).reservationUrl).toBe("https://tastybites.com/reserve");

    const testimonials = comp.sections.find((s) => s.id === "testimonials");
    expect(testimonials!.decision).not.toBe("hidden");
    const tItems = (testimonials!.props as any).items as Array<{ author: string; content: string }>;
    expect(tItems.length).toBe(2);
    expect(tItems.some((t) => t.author === "Aarav S")).toBe(true);
    // No fabricated ratings
    expect(tItems.every((t) => typeof t.content === "string" && t.content.length > 5)).toBe(true);

    // BuilderDraft preserves menu data
    const draft = comp.builder;
    const menuSlot = draft.pages[0].sections.find((s) => s.id === "section_menu");
    expect(menuSlot).toBeDefined();
    expect((menuSlot!.slots[0].config as any).products.length).toBe(3);

    // Snapshot → Storefront parity: build snapshot with binder-derived aggregate?
    // Build aggregate that mirrors binder products for parity
    const aggregate: any = {
      identity: { name: source.displayName, tagline: "", bio: source.bio, avatarUrl: null, bannerUrl: null, socialLinks: [] },
      hero: { title: source.displayName, subtitle: "", description: source.bio, tagline: "", bio: source.bio, socialLinks: [] },
      products: [], // empty to test fallback to config
      gallery: source.gallery!.map((g) => ({ id: g.id, title: g.title, description: g.description, imageUrl: g.imageUrl, mediaType: "image", videoUrl: null, altText: g.title, isFeatured: false })),
      links: [],
      seo: { title: "", description: "" },
      testimonials: source.testimonials!.map((t) => ({ id: t.author, author: t.author, role: t.role, content: t.content, avatarUrl: null, rating: t.rating, featured: false, category: "general" })),
      faq: [{ id: "h1", question: "Hours", answer: source.hours!, category: "hours" }],
      timeline: [],
      games: [],
      contentFeed: [],
      courses: [],
      services: [],
      siteSocialLinks: [],
      footer: { description: null, copyright: null, columns: [] },
      declaredFacts: {},
    };
    const snap = buildRuntimeSnapshot({
      websiteId: "test-wid",
      correlationId: "test-15b-localA",
      builderPages: draft.pages as any,
      aggregate,
      navItems: [],
      themePackageId: comp.theme.themeId,
      themeColors: {},
      themeFonts: {},
      themeConfig: {},
      experience: {} as any,
    });
    const doc = layoutEngine.resolve(snap as any);
    const menuSection = doc.pages[0].sections.find((s) => s.moduleId.startsWith("products."));
    expect(menuSection).toBeDefined();
    const resolved = (menuSection!.config as any).resolvedData as Array<{ name: string }>;
    expect(resolved.some((r) => r.name === "Biryani")).toBe(true);
  });

  it("Local Business B: healthcare words only inside project → local_business not professional_resume", () => {
    const source = localBusinessBHealthcareInProject();
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    // Should be local_business because restaurant signals + menu, not doctor
    expect(arch.archetype).toBe("local_business");
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    expect(arch.archetype).not.toBe("professional_resume");
    expect(bp.visibleSections).toContain("menu");
  });

  it("Binder: menu does not create dummy URLs and uses products shape", () => {
    const source = localBusinessA();
    const res = bindSection("menu", source, "local_business", "Menu");
    expect(res.hasData).toBe(true);
    const prods = (res.props as any).products as Array<Record<string, unknown>>;
    expect(prods.length).toBe(3);
    for (const p of prods) {
      expect((p as any).url ?? (p as any).mapsUrl ?? (p as any).googleMapsUrl).not.toBe("#");
      expect(JSON.stringify(p)).not.toContain('"#"');
    }
    // Ensure not links shape
    expect((res.props as any).items).toBeUndefined();
  });

  it("Binder: community does not convert arbitrary social URLs, testimonials not from creator", () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "test",
      displayName: "Test",
      bio: "Creator bio",
      avatarUrl: "",
      followers: 1000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@test", "https://instagram.com/test"],
      socialLinks: ["https://youtube.com/@test", "https://instagram.com/test"],
    };
    const comm = bindSection("community", source, "creator", "Community");
    expect(comm.hasData).toBe(false);
    const test = bindSection("testimonials", source, "creator", "Testimonials");
    expect(test.hasData).toBe(false);
  });

  it("Binder: products without keyword still hidden, with structured data visible (no keyword hallucination)", () => {
    const base: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "noprod",
      displayName: "NoProd",
      bio: "I love my audience and create daily vlogs",
      avatarUrl: "",
      followers: 1000,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: ["https://youtube.com/@noprod"],
      socialLinks: ["https://youtube.com/@noprod"],
    };
    // Without products, even with bio containing no shop keyword, should hide
    const without = bindSection("products", base, "creator", "Products");
    expect(without.hasData).toBe(false);
    // With structured products but bio has no shop keyword, should show (keyword not required)
    const withProd = { ...base, products: [{ id: "p1", name: "My Ebook", description: "Learn", price: 299, imageUrl: "https://cdn.example.com/ebook.jpg" }] } as import("@/lib/generation/intelligence/types").ContentSource;
    const withRes = bindSection("products", withProd, "creator", "Products");
    expect(withRes.hasData).toBe(true);
    expect(((withRes.props as any).products as Array<any>)[0].name).toBe("My Ebook");
  });

  it("Multi-instance: section.id unique, moduleId renderer identity preserved, no Affiliate Picks fake heading", () => {
    const source = creatorBWithProducts();
    const { intel, rel } = makeEvidence(source);
    const arch = archetypeResolver.resolve({ evidence: intel, relationships: rel, source, acquisition: { completeness: 0.7, populatedFields: [], missingFields: [] } });
    const bp = buildWebsiteBlueprint({ evidence: intel, relationships: rel, identity: { entityType: null, primaryNiche: intel.primaryNiche, businessModel: null, audience: [], name: source.displayName, username: source.username, subdomain: source.username }, archetype: arch, source });
    const comp = composeStorefront({ blueprint: bp, identity: { entityType: null, name: source.displayName, username: source.username, bio: source.bio, tagline: null, avatarUrl: source.avatarUrl, socialLinks: source.socialLinks ?? [], subdomain: source.username }, evidence: intel, relationships: rel, source });
    // All visible section ids must be unique
    const ids = comp.sections.filter((s) => s.decision !== "hidden").map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    // moduleId reflects renderer, should be existing registry
    for (const sec of comp.sections.filter((s) => s.decision !== "hidden")) {
      expect(componentRegistry.get(sec.moduleId)).toBeDefined();
    }
    // No second product section with affiliate heading
    const productSections = comp.sections.filter((s) => s.type === "products" && s.decision !== "hidden");
    // Should be exactly 1 product section (or 0 if no data) but never 2 with affiliate picks
    expect(productSections.length).toBe(1);
    expect(productSections[0].id).toBe("products");
    // Ensure heading registry does not contain Affiliate Picks
    for (const sec of comp.sections) {
      expect((sec.props as any).title).not.toBe("Affiliate Picks");
    }
  });

  it("Location does not create Google Maps links from prose mentions", () => {
    const source: import("@/lib/generation/intelligence/types").ContentSource = {
      platform: "manual",
      username: "nolocation",
      displayName: "No Loc",
      bio: "I love Google Maps integration in my app project",
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
    const loc = bindSection("location", source, "local_business", "Location");
    expect(loc.hasData).toBe(false);
    const withReal = { ...source, location: "Pune", googleMapsUrl: "https://maps.google.com/maps?q=test" } as import("@/lib/generation/intelligence/types").ContentSource;
    const loc2 = bindSection("location", withReal, "local_business", "Location");
    expect(loc2.hasData).toBe(true);
    expect((loc2.props as any).googleMapsUrl).toBe("https://maps.google.com/maps?q=test");
  });
});
