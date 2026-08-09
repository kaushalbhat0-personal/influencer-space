// ── Homepage Curation — Featured + Limits Tests ───────────
// RCCF-IMPLEMENTATION-09B (Phase 3). The homepage aggregate curates repeatable
// collections: featured items first (capped), zero-featured fallback to all.

import { describe, it, expect } from "vitest";
import { featuredPick, DEFAULT_HOMEPAGE_LIMITS } from "@/modules/tenant/application/website-aggregate.service";

describe("featuredPick (Phase 3 homepage curation)", () => {
  const items = [
    { id: "1", name: "A", isFeatured: false },
    { id: "2", name: "B", isFeatured: true },
    { id: "3", name: "C", isFeatured: false },
    { id: "4", name: "D", isFeatured: true },
  ];

  it("returns featured items first when some are featured", () => {
    const picked = featuredPick(items, 10);
    expect(picked.map((i) => i.id)).toEqual(["2", "4"]);
  });

  it("caps at the limit, keeping featured first", () => {
    const picked = featuredPick(items, 1);
    expect(picked.map((i) => i.id)).toEqual(["2"]);
  });

  it("falls back to ALL items when none are featured (no empty section)", () => {
    const noneFeatured = items.map((i) => ({ ...i, isFeatured: false }));
    const picked = featuredPick(noneFeatured, 3);
    expect(picked.map((i) => i.id)).toEqual(["1", "2", "3"]);
  });

  it("handles the `featured` (metadata) flag too", () => {
    const meta = [
      { id: "x", featured: false },
      { id: "y", featured: true },
      { id: "z", featured: false },
    ];
    expect(featuredPick(meta, 10).map((i) => i.id)).toEqual(["y"]);
  });

  it("returns empty for an empty list", () => {
    expect(featuredPick([], 5)).toEqual([]);
  });

  it("caps non-featured collections (games/timeline) without a featured concept", () => {
    const plain = [{ id: "a" }, { id: "b" }, { id: "c" }];
    expect(featuredPick(plain, 2).map((i) => i.id)).toEqual(["a", "b"]);
  });
});

describe("DEFAULT_HOMEPAGE_LIMITS", () => {
  it("caps every repeatable collection on the homepage", () => {
    expect(DEFAULT_HOMEPAGE_LIMITS.products).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.gallery).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.courses).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.services).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.testimonials).toBe(6);
    expect(DEFAULT_HOMEPAGE_LIMITS.games).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.timeline).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.links).toBe(12);
    expect(DEFAULT_HOMEPAGE_LIMITS.contentFeed).toBe(12);
  });
});
