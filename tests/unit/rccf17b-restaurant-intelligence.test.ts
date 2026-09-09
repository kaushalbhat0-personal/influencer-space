import { describe, it, expect } from "vitest";
import { detectPlatform } from "@/lib/generation/integration/provision-pipeline";
import { getAdapterForUrl } from "@/lib/generation/acquisition/adapters";
import { GoogleMapsAdapter } from "@/lib/generation/acquisition/adapters/google-maps";
import { buildRelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import { archetypeResolver } from "@/lib/generation/archetype/resolver";
import { buildEvidenceIntelligence } from "@/lib/generation/intelligence/evidence/detect";
import { buildWebsiteBlueprint } from "@/lib/generation/blueprint/builder";
import { bindSection } from "@/lib/generation/intelligence/composition/binder";
import type { ContentSource } from "@/lib/generation/intelligence/types";

const THREE_ALL_DAY_URL =
  "https://www.google.com/maps/dir//3+All+Day,+FR8G%2BRPV,+Nana+Urf+Datatray+Bivabha,+Charwad+Rd,+Jadhav+Nagar,+Vadgaon+Budruk,+Pune,+Maharashtra+411041/@18.4687041,73.8295808,15z/data=!4m8!4m7!1m0!1m5!1m1!1s0x3bc2950041d4cc29:0xfa9228ee16473084!2m2!1d73.826801!2d18.4671232?entry=ttu";
const PLACE_URL = "https://www.google.com/maps/place/3+All+Day/@18.4671232,73.826801,15z";
const SEARCH_URL = "https://www.google.com/maps/search/3+All+Day+Pune/@18.467,73.826,15z";
const SHORT_URL = "https://maps.app.goo.gl/abc123";
const Q_URL = "https://www.google.com/maps?q=3+All+Day+Pune";

function makeSource(overrides: Partial<ContentSource> = {}): ContentSource {
  return {
    platform: "google_maps",
    username: "3allday",
    displayName: "3 All Day",
    bio: "",
    avatarUrl: "",
    followers: 0,
    following: 0,
    posts: 0,
    engagement: 0,
    content: [],
    categories: [],
    links: [THREE_ALL_DAY_URL],
    location: "Pune, Maharashtra",
    googleMapsUrl: THREE_ALL_DAY_URL,
    ...overrides,
  } as ContentSource;
}

describe("RCCF-17B Batch A — Google Maps evidence", () => {
  it("detectPlatform recognizes google.com/maps, maps.app.goo.gl, goo.gl/maps", () => {
    expect(detectPlatform(THREE_ALL_DAY_URL)).toBe("google_maps");
    expect(detectPlatform(PLACE_URL)).toBe("google_maps");
    expect(detectPlatform(SHORT_URL)).toBe("google_maps");
    expect(detectPlatform("https://goo.gl/maps/abc")).toBe("google_maps");
    expect(detectPlatform(Q_URL)).toBe("google_maps");
    expect(detectPlatform("https://youtube.com/@test")).toBe("youtube");
    expect(detectPlatform("https://example.com")).toBe("manual");
  });

  it("getAdapterForUrl wires GoogleMapsAdapter", () => {
    expect(getAdapterForUrl(THREE_ALL_DAY_URL).adapter.platform).toBe("google_maps");
    expect(getAdapterForUrl(SHORT_URL).adapter.platform).toBe("google_maps");
    expect(getAdapterForUrl(PLACE_URL).adapter.platform).toBe("google_maps");
  });

  it("GoogleMapsAdapter extracts name from /place/, /dir/, /search/, ?q=", async () => {
    const p1 = await GoogleMapsAdapter.acquire(PLACE_URL, { creatorName: "x", platform: "google_maps" });
    expect(p1.source.displayName).toBe("3 All Day");
    const p2 = await GoogleMapsAdapter.acquire(THREE_ALL_DAY_URL, { creatorName: "x", platform: "google_maps" });
    expect(p2.source.displayName).toBe("3 All Day");
    const p3 = await GoogleMapsAdapter.acquire(SEARCH_URL, { creatorName: "x", platform: "google_maps" });
    expect(p3.source.displayName).toBe("3 All Day Pune");
    const p4 = await GoogleMapsAdapter.acquire(Q_URL, { creatorName: "x", platform: "google_maps" });
    expect(p4.source.displayName).toBe("3 All Day Pune");
    const p5 = await GoogleMapsAdapter.acquire(SHORT_URL, { creatorName: "3 All Day", platform: "google_maps" });
    expect(p5.source.displayName).toBe("3 All Day");
  });

  it("3 All Day /dir/ URL parsing preserves original URL and extracts location", async () => {
    const res = await GoogleMapsAdapter.acquire(THREE_ALL_DAY_URL, { creatorName: "3 All Day", platform: "google_maps" });
    expect(res.source.googleMapsUrl).toBe(THREE_ALL_DAY_URL);
    expect(res.source.displayName).toBe("3 All Day");
    expect(res.source.location).toContain("Pune");
    expect(res.source.location).toContain("FR8G");
    // Do not fabricate phone/hours
    expect((res.source as unknown as { phone?: string }).phone).toBeUndefined();
  });

  it("pure 3 All Day Google Maps URL does not fabricate address/phone/hours", async () => {
    const res = await GoogleMapsAdapter.acquire(THREE_ALL_DAY_URL, { creatorName: "3 All Day", platform: "google_maps" });
    expect(res.source.googleMapsUrl).toBe(THREE_ALL_DAY_URL);
    // hours, phone etc must stay empty
    expect(res.source.hours).toBeUndefined();
    expect((res.source as unknown as { phone?: string }).phone).toBeUndefined();
  });

  it("maps.app.goo.gl is recognized even without name", async () => {
    const res = await GoogleMapsAdapter.acquire(SHORT_URL, { creatorName: "My Business", platform: "google_maps" });
    expect(res.source.googleMapsUrl).toBe(SHORT_URL);
    expect(res.source.displayName).toBe("My Business");
    expect(GoogleMapsAdapter.matches(SHORT_URL)).toBe(true);
  });
});

describe("RCCF-17B Batch A — RelationshipGraph & archetype", () => {
  it("pure 3 All Day Google Maps URL resolves local_business, not creator", () => {
    const source = makeSource();
    const graph = buildRelationshipGraph(source.bio ?? "", ["google_maps"]);
    expect(graph.platforms).toContain("google_maps");
    expect(graph.reinforcedEntities.some((e) => e.entity === "restaurant")).toBe(true);
    const intelligence = buildEvidenceIntelligence({
      sourceText: source.bio ?? "",
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.25,
      graphNiche: null,
      graphConfidence: 0.5,
      aiEntity: null,
      aiNiches: [],
      aiBusinessModel: null,
      aiUsed: false,
      resume: null,
    });
    const result = archetypeResolver.resolve({
      evidence: intelligence,
      relationships: graph,
      source: source as unknown as never,
      acquisition: { completeness: 0.25, populatedFields: ["googleMapsUrl", "location"], missingFields: [] },
      knowledgeGraph: { creator: { niche: null }, confidence: 0.5 } as never,
    });
    expect(result.archetype).toBe("local_business");
    expect(result.confidence).toBeGreaterThan(0.35);
  });

  it("maps.app.goo.gl also resolves local_business", () => {
    const graph = buildRelationshipGraph("", ["google_maps"]);
    expect(graph.platforms).toContain("google_maps");
    const intelligence = buildEvidenceIntelligence({
      sourceText: "",
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.25,
      graphNiche: null,
      graphConfidence: 0.5,
      aiEntity: null,
      aiNiches: [],
      aiBusinessModel: null,
      aiUsed: false,
      resume: null,
    });
    const result = archetypeResolver.resolve({
      evidence: intelligence,
      relationships: graph,
      source: { platform: "google_maps", bio: "", googleMapsUrl: SHORT_URL, location: "", links: [SHORT_URL], socialLinks: [] } as unknown as never,
      acquisition: { completeness: 0.25, populatedFields: ["googleMapsUrl"], missingFields: [] },
      knowledgeGraph: { creator: { niche: null }, confidence: 0.5 } as never,
    });
    expect(result.archetype).toBe("local_business");
  });

  it("Maps URL with location creates visible location section", () => {
    const source = makeSource();
    const graph = buildRelationshipGraph("", ["google_maps"]);
    const intelligence = buildEvidenceIntelligence({
      sourceText: "",
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.25,
      graphNiche: null,
      graphConfidence: 0.5,
      aiEntity: null,
      aiNiches: [],
      aiBusinessModel: null,
      aiUsed: false,
      resume: null,
    });
    const arch = archetypeResolver.resolve({
      evidence: intelligence,
      relationships: graph,
      source: source as unknown as never,
      acquisition: { completeness: 0.25, populatedFields: ["googleMapsUrl", "location"], missingFields: [] },
      knowledgeGraph: { creator: { niche: null }, confidence: 0.5 } as never,
    });
    const bp = buildWebsiteBlueprint({
      evidence: intelligence,
      relationships: graph,
      identity: { entityType: intelligence.primaryEntity, primaryNiche: null, businessModel: null, audience: [], name: "3 All Day", username: "3allday", subdomain: "3allday" },
      archetype: arch,
      source: source as never,
    });
    const loc = bp.sections.find((s) => s.id === "location")!;
    expect(loc.decision).not.toBe("hidden");
    expect(bp.visibleSections).toContain("location");
    expect(bp.visibleSections).toContain("hero");
    expect(bp.visibleSections).toContain("contact");
  });
});

describe("RCCF-17B Batch B — no fabricated menu/hours/reservation", () => {
  it("generic words menu, biryani, restaurant do not create menu without structured Menu:", () => {
    const source = {
      platform: "google_maps",
      username: "3allday",
      displayName: "3 All Day",
      bio: "We are a cozy restaurant in Pune serving delicious biryani and pizza. Our cuisine is amazing.",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "",
    } as unknown as ContentSource;
    const graph = buildRelationshipGraph(source.bio, ["google_maps"]);
    const intelligence = buildEvidenceIntelligence({
      sourceText: source.bio,
      sourceContentTexts: [],
      followers: 0,
      acquisitionCompleteness: 0.25,
      graphNiche: null,
      graphConfidence: 0.5,
      aiEntity: null,
      aiNiches: [],
      aiBusinessModel: null,
      aiUsed: false,
      resume: null,
    });
    const arch = archetypeResolver.resolve({
      evidence: intelligence,
      relationships: graph,
      source: source as never,
      acquisition: { completeness: 0.25, populatedFields: [], missingFields: [] },
      knowledgeGraph: { creator: { niche: null }, confidence: 0.5 } as never,
    });
    const bp = buildWebsiteBlueprint({
      evidence: intelligence,
      relationships: graph,
      identity: { entityType: intelligence.primaryEntity, primaryNiche: null, businessModel: null, audience: [], name: "3 All Day", username: "3allday", subdomain: "3allday" },
      archetype: arch,
      source: source as never,
    });
    expect(bp.sections.find((s) => s.id === "menu")?.decision).toBe("hidden");
    const binder = bindSection("menu", source, "local_business", "Menu");
    expect(binder.hasData).toBe(false);
  });

  it("explicit Menu: still works", () => {
    const source = {
      platform: "google_maps",
      username: "3allday",
      displayName: "3 All Day",
      bio: "Welcome to 3 All Day. Menu: Margherita Pizza, Veg Biryani, Cold Coffee | Location: Pune",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "Pune",
      googleMapsUrl: THREE_ALL_DAY_URL,
    } as unknown as ContentSource;
    const binder = bindSection("menu", source, "local_business", "Menu");
    expect(binder.hasData).toBe(true);
    expect(binder.props.products).toBeDefined();
    const prods = (binder.props.products as Array<{ name: string }>);
    expect(prods.length).toBeGreaterThan(0);
    expect(prods[0].name).toContain("Margherita");
  });

  it("structured menuItems wins over bio", () => {
    const source = {
      platform: "google_maps",
      username: "3allday",
      displayName: "3 All Day",
      bio: "Menu: Fake1, Fake2",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "",
      menuItems: [{ name: "Real Thali", description: "Authentic", price: 299, category: "Main" }],
    } as unknown as ContentSource;
    const binder = bindSection("menu", source, "local_business", "Menu");
    expect(binder.hasData).toBe(true);
    const prods = binder.props.products as Array<{ name: string }>;
    expect(prods[0].name).toBe("Real Thali");
    expect(prods[0].name).not.toBe("Fake1");
  });

  it("hours uses source.hours only, not bio.slice", () => {
    const source = {
      platform: "google_maps",
      username: "3allday",
      displayName: "3 All Day",
      bio: "We are open daily 10am to 10pm, welcome to our restaurant. Hours are flexible.",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "",
      hours: undefined,
    } as unknown as ContentSource;
    const binder = bindSection("hours", source, "local_business", "Hours");
    expect(binder.hasData).toBe(false);
    const withHours = bindSection("hours", { ...source, hours: "10am - 10pm" } as ContentSource, "local_business", "Hours");
    expect(withHours.hasData).toBe(true);
    expect((withHours.props as { hours: string }).hours).toBe("10am - 10pm");
  });

  it("reservations requires valid reservationUrl", () => {
    const source = {
      platform: "google_maps",
      username: "3allday",
      displayName: "3 All Day",
      bio: "Book a table now, reservation available",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "",
      reservationUrl: undefined,
    } as unknown as ContentSource;
    expect(bindSection("reservations", source, "local_business", "Reservations").hasData).toBe(false);
    expect(bindSection("booking", source, "local_business", "Booking").hasData).toBe(false);
    const withUrl = bindSection("reservations", { ...source, reservationUrl: "https://reserve.example.com/book" } as ContentSource, "local_business", "Reservations");
    expect(withUrl.hasData).toBe(true);
    expect((withUrl.props as { reservationUrl: string }).reservationUrl).toBe("https://reserve.example.com/book");
  });

  it("zero/unknown prices do not render ₹0 (binder price 0 is hidden by renderer check)", () => {
    const source = {
      platform: "google_maps",
      username: "3allday",
      displayName: "3 All Day",
      bio: "Menu: Veg Pizza, Biryani",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "",
    } as unknown as ContentSource;
    const binder = bindSection("menu", source, "local_business", "Menu");
    const prods = binder.props.products as Array<{ price: number }>;
    // price 0 should be treated as falsy by renderer (typeof price==='number' && price ? formatCurrency : "")
    for (const p of prods) {
      expect(p.price === 0 ? "" : "has price").toBe("");
    }
  });

  it("creator/professional regression: resume still produces professional", () => {
    const source = {
      platform: "manual",
      username: "kaushal",
      displayName: "Kaushal",
      bio: "Full-stack software engineer specializing in TypeScript. Resume: experience at XYZ.",
      avatarUrl: "",
      followers: 0,
      following: 0,
      posts: 0,
      engagement: 0,
      content: [],
      categories: [],
      links: [],
      location: "",
      resume: {
        rawText: "Summary: Engineer\nExperience: 3 roles\nSkills: TS, Python\n",
        summary: "Engineer summary",
        experience: [{ title: "Engineer", company: "A", duration: "2y", description: "Built", raw: "exp" }, { title: "Dev", company: "B", duration: "1y", description: "Did", raw: "exp2" }, { title: "Lead", company: "C", duration: "3y", description: "Led", raw: "exp3" }],
        skills: ["TypeScript", "Python", "React"],
        projects: [{ name: "P1", description: "D1", raw: "p1" }],
        education: [{ degree: "BCS", institution: "Uni", years: "2019", raw: "edu" }],
        certifications: [],
        socialLinks: [],
        location: null,
      },
    } as unknown as ContentSource;
    const graph = buildRelationshipGraph(source.bio ?? "", []);
    const intelligence = buildEvidenceIntelligence({
      sourceText: source.bio ?? "",
      sourceContentTexts: [source.resume!.summary],
      followers: 0,
      acquisitionCompleteness: 0.5,
      graphNiche: null,
      graphConfidence: 0.5,
      aiEntity: null,
      aiNiches: [],
      aiBusinessModel: null,
      aiUsed: false,
      resume: source.resume,
    });
    const result = archetypeResolver.resolve({
      evidence: intelligence,
      relationships: graph,
      source: source as unknown as never,
      acquisition: { completeness: 0.5, populatedFields: ["resume"], missingFields: [] },
      knowledgeGraph: { creator: { niche: null }, confidence: 0.5 } as never,
    });
    expect(result.archetype).toBe("professional_resume");
  });
});
