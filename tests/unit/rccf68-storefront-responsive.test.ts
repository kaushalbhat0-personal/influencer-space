import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-68.3.2 — Stitch Storefront Responsive Foundation & Preview Isolation.
// Static/architecture assertions (node env). Interactive behavior lives in
// src/lib/registry/components/__tests__/rccf68-storefront-renderers.test.tsx.

const RENDERERS = "src/lib/registry/components/renderers.tsx";
const source = readFileSync(RENDERERS, "utf8");

describe("RCCF-68.3.2 — responsive grids (no mobile cramming)", () => {
  it("GalleryRenderer uses a container-aware responsive grid class", () => {
    // The gallery grid must reference the shared container-query helper, not an
    // inline repeat(columns,1fr) that renders 3-6 columns inside 375px.
    const gallery = source.slice(source.indexOf("export function GalleryRenderer"), source.indexOf("export function ProductsRenderer"));
    expect(gallery).toContain("responsiveGridClass(columns)");
    expect(gallery).not.toContain("gridTemplateColumns");
    expect(gallery).not.toContain("repeat(");
  });

  it("ProductsRenderer uses a container-aware responsive grid class", () => {
    const products = source.slice(source.indexOf("export function ProductsRenderer"), source.indexOf("export function TimelineRenderer"));
    expect(products).toContain("responsiveGridClass(columns)");
    expect(products).not.toContain("gridTemplateColumns");
    expect(products).not.toContain("repeat(");
  });

  it("TestimonialsRenderer uses a container-aware responsive grid class", () => {
    const testimonials = source.slice(source.indexOf("export function TestimonialsRenderer"), source.indexOf("export function FaqRenderer"));
    expect(testimonials).toContain("responsiveGridClass(Math.min(columns, items.length))");
    expect(testimonials).not.toContain("gridTemplateColumns");
    expect(testimonials).not.toContain("repeat(");
  });

  it("existing desktop column configuration remains authoritative (1-6 preserved)", () => {
    // The helper must adapt DOWN from the configured count: mobile 1 col,
    // small container 2 cols, large container = configured density (3+ only,
    // since 1-2 configured columns never need an lg override).
    expect(source).toContain("RESPONSIVE_GRID[count]");
    for (const n of [3, 4, 5, 6]) {
      expect(source).toContain(`@lg/main:grid-cols-${n}`);
    }
    // Mobile base is always 1 column in every configured case.
    expect(source).toContain(`1: "grid grid-cols-1 gap-4"`);
  });

  it("no repeat(columns,1fr) mobile-cramping implementation remains in the renderer file", () => {
    expect(source).not.toMatch(/repeat\(\s*columns\s*,/);
    expect(source).not.toMatch(/repeat\(\$\{columns\}/);
  });

  it("container-query variant is used, not a second responsive system", () => {
    // The storefront already uses the named @container/main strategy via
    // @sm/main: / @lg/main:. The helper reuses those variants.
    expect(source).toContain("@sm/main:grid-cols-2");
    expect(source).toContain("@lg/main:grid-cols-");
    // No Tailwind screen-only override sneaks in for these grids.
    expect(source).not.toMatch(/sm:grid-cols-2\b/);
  });
});

describe("RCCF-68.3.2 — preview isolation wiring (renderer signatures)", () => {
  it("ContactRenderer accepts previewMode", () => {
    expect(source).toMatch(/export function ContactRenderer\(\{ props, previewMode \}: RendererProps\)/);
    expect(source).toContain("if (previewMode)");
  });

  it("NewsletterRenderer accepts previewMode", () => {
    expect(source).toMatch(/export function NewsletterRenderer\(\{ props, previewMode \}: RendererProps\)/);
    expect(source).toContain("if (previewMode)");
  });

  it("ServicesRenderer accepts previewMode and threads it into ServiceBookingCta", () => {
    expect(source).toMatch(/export function ServicesRenderer\(\{ props, previewMode \}: RendererProps\)/);
    expect(source).toContain("<ServiceBookingCta service={service as Record<string, unknown>} previewMode={previewMode} />");
  });

  it("ServiceBookingCta is preview-inert (disabled button, informational availability)", () => {
    expect(source).toContain("if (previewMode)");
    expect(source).toContain("title=\"Booking available on your live website\"");
  });

  it("BookingsRenderer accepts previewMode and threads it into BookingCard", () => {
    expect(source).toMatch(/export function BookingsRenderer\(\{ props, previewMode \}: RendererProps\)/);
    expect(source).toContain("<BookingCard key={i} slot={slot as Record<string, unknown>} previewMode={previewMode} />");
  });

  it("BookingCard is preview-inert (disabled button, no submit form)", () => {
    expect(source).toContain("title=\"Booking available on your live website\"");
  });

  it("Products + Affiliate preview isolation is preserved", () => {
    expect(source).toContain("export function ProductsRenderer({ props, previewMode }: RendererProps)");
    expect(source).toContain("<AffiliateGrid affiliates={affiliates} previewMode={previewMode} />");
    expect(source).toContain("previewMode ? (");
  });
});

describe("RCCF-68.3.2 — architecture preservation", () => {
  it("no new server action imports added to the renderer file", () => {
    // Only the canonical public actions the storefront already used.
    const actionsImports = source.match(/from "@\/actions\/[\w.-]+"/g) ?? [];
    const allowed = [
      "@/actions/storefront.actions",
      "@/actions/storefront-bookings.actions",
      "@/actions/affiliate.actions",
    ];
    for (const imp of actionsImports) {
      const clean = imp.replace('from "', "").replace('"', "");
      expect(allowed, `unexpected action import ${clean}`).toContain(clean);
    }
  });

  it("no new data source is fetched from the renderer file", () => {
    expect(source).not.toContain("prisma.");
    expect(source).not.toContain("findUnique");
    expect(source).not.toContain("findMany");
  });

  it("no new registry ID is introduced", () => {
    // The helper + preview branches must not register new component ids.
    const builtins = readFileSync("src/lib/registry/components/builtins.ts", "utf8");
    const before = (builtins.match(/id: "/g) ?? []).length;
    expect(before).toBeGreaterThan(0);
    // renderers.tsx defines no component registrations.
    expect(source).not.toContain("register(");
  });

  it("no schema / capability change is present in this RCCF's source", () => {
    // Renderer file only — no prisma client, no capability engine import.
    expect(source).not.toContain("@/lib/capabilities");
    expect(source).not.toContain("@/generated/prisma");
  });
});
