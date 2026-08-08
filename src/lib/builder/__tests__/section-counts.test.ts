// ── Section Count Resolver — RCCF-IMPLEMENTATION-74 ─────────
// The sidebar's canonical count source: consumes the Website Aggregate only,
// never Builder slots/blocks. Zero extra queries, no duplicated counting.

import { describe, it, expect } from "vitest";
import { sectionCountResolver, STATIC_SECTION_BASES } from "@/lib/builder/section-counts";
import type { WebsiteAggregate } from "@/types/snapshot";

function aggregate(partial: Partial<WebsiteAggregate>): WebsiteAggregate {
  return {
    identity: { name: "T", tagline: "", bio: "", avatarUrl: null, bannerUrl: null, socialLinks: [] },
    hero: {} as WebsiteAggregate["hero"],
    seo: { title: "", description: "" },
    products: [], gallery: [], links: [], testimonials: [], faq: [],
    timeline: [], games: [], contentFeed: [], courses: [], services: [],
    ...partial,
  };
}

describe("SectionCountResolver", () => {
  it("resolves counts from canonical aggregate collections", () => {
    const agg = aggregate({
      products: [{ id: "p", name: "n", description: null, price: 1, imageUrl: null, images: [], slug: "", isFeatured: false, isActive: true }] as WebsiteAggregate["products"],
      gallery: [{ id: "g", title: "", description: null, imageUrl: "u", mediaType: "image", videoUrl: null, altText: null, isFeatured: false }] as WebsiteAggregate["gallery"],
    });
    expect(sectionCountResolver.countForModule("products.grid", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("gallery.grid", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("timeline.default", agg)).toBe(0);
  });

  it("maps every repeatable section to its collection", () => {
    const agg = aggregate({
      products: [{ id: "1", name: "n", description: null, price: 1, imageUrl: null, images: [], slug: "", isFeatured: false, isActive: true }] as WebsiteAggregate["products"],
      gallery: [{ id: "2", title: "", description: null, imageUrl: "u", mediaType: "image", videoUrl: null, altText: null, isFeatured: false }] as WebsiteAggregate["gallery"],
      timeline: [{ id: "3", year: "2020", title: "t", description: "", imageUrl: null, stats: null }] as WebsiteAggregate["timeline"],
      testimonials: [{ id: "4", author: "a", role: null, content: "c", avatarUrl: null, rating: 5, featured: false, category: "g" }] as WebsiteAggregate["testimonials"],
      faq: [{ id: "5", question: "q", answer: "a", category: "g" }] as WebsiteAggregate["faq"],
      games: [{ id: "6", name: "g", logoUrl: null, description: null, genre: null }] as WebsiteAggregate["games"],
      contentFeed: [{ id: "7", platform: "youtube", mediaType: "video", url: "u", thumbnailUrl: null, caption: null, permalink: null }] as WebsiteAggregate["contentFeed"],
      courses: [{ id: "8", title: "c", description: null, price: 1, imageUrl: null, category: null }] as WebsiteAggregate["courses"],
      services: [{ id: "9", title: "s", description: null, price: 1, duration: null }] as WebsiteAggregate["services"],
      links: [{ id: "10", title: "l", url: "u", imageUrl: null }] as WebsiteAggregate["links"],
    });
    expect(sectionCountResolver.countForModule("products.grid", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("gallery.grid", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("timeline.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("testimonials.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("faq.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("games.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("contentFeed.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("content_feed.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("courses.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("services.default", agg)).toBe(1);
    expect(sectionCountResolver.countForModule("links.default", agg)).toBe(1);
  });

  it("milestones map to the timeline collection (admin route /admin/milestones)", () => {
    const agg = aggregate({ timeline: [{ id: "1", year: "2020", title: "t", description: "", imageUrl: null, stats: null }] as WebsiteAggregate["timeline"] });
    expect(sectionCountResolver.countForBase("milestones", agg)).toBe(1);
  });

  it("returns null when the aggregate is unavailable (no badge, no crash)", () => {
    expect(sectionCountResolver.countForModule("products.grid", null)).toBeNull();
    expect(sectionCountResolver.countForModule("products.grid", undefined)).toBeNull();
  });

  it("returns 0 for an empty collection (sidebar hides the badge)", () => {
    const agg = aggregate({});
    expect(sectionCountResolver.countForModule("products.grid", agg)).toBe(0);
  });
});

describe("static + uncountable sections (Phase 3)", () => {
  it("hero/about/navigation/footer/contact are static and show no count", () => {
    for (const base of Array.from(STATIC_SECTION_BASES)) {
      expect(sectionCountResolver.isStatic(`${base}.default`)).toBe(true);
      expect(sectionCountResolver.hasCount(`${base}.default`)).toBe(false);
    }
    const agg = aggregate({});
    expect(sectionCountResolver.countForModule("hero.default", agg)).toBeNull();
    expect(sectionCountResolver.countForModule("footer.default", agg)).toBeNull();
    expect(sectionCountResolver.countForModule("contact.default", agg)).toBeNull();
  });

  it("uncounted modules (newsletter, embed, social, bookings, downloads, resources, community) resolve to null", () => {
    const agg = aggregate({});
    for (const id of ["newsletter.default", "embed.spotify", "social.discord", "bookings.default", "downloads.default", "resources.default", "community.default"]) {
      expect(sectionCountResolver.countForModule(id, agg)).toBeNull();
    }
  });
});
