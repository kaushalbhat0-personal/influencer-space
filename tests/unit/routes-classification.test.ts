import { describe, it, expect } from "vitest";
import { classifyRoute, RouteCategory } from "@/lib/platform/routes";

describe("classifyRoute — RCCF-25 storefront nested-route tenant context", () => {
  it("classifies /{slug} as a PublicStorefront with the tenant slug", () => {
    const r = classifyRoute("/owais");
    expect(r.category).toBe(RouteCategory.PublicStorefront);
    expect(r.slug).toBe("owais");
  });

  it("classifies /{slug}/{pageSlug} as a PublicStorefront carrying the tenant slug", () => {
    const r = classifyRoute("/owais/products");
    expect(r.category).toBe(RouteCategory.PublicStorefront);
    expect(r.slug).toBe("owais");
  });

  it("keeps reserved marketing paths as PublicMarketing even with a second segment", () => {
    expect(classifyRoute("/pricing/plans").category).toBe(RouteCategory.PublicMarketing);
    expect(classifyRoute("/blog/post").category).toBe(RouteCategory.PublicMarketing);
    expect(classifyRoute("/terms/x").category).toBe(RouteCategory.PublicMarketing);
  });

  it("keeps protected routes classified as protected regardless of depth", () => {
    expect(classifyRoute("/admin/x").category).toBe(RouteCategory.Admin);
    expect(classifyRoute("/builder/x").category).toBe(RouteCategory.Builder);
    expect(classifyRoute("/api/x/y").category).toBe(RouteCategory.Api);
  });
});