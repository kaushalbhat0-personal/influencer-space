import { describe, it, expect } from "vitest";
import { templateRegistry } from "@/lib/template/registry";
import { SECTION_REGISTRY } from "@/modules/website-blueprint/domain/section-registry";
import { BUSINESS_TEMPLATES } from "@/modules/business-intelligence/domain/templates";
import { resolveModuleId } from "@/lib/registry/resolve-module";

/**
 * Canonical registered component ids — the ComponentRegistry contract
 * (src/lib/registry/components/builtins.ts). Kept as the source-of-truth list
 * here so the pure-TS data sources can be validated without importing the
 * JSX renderers.
 */
const REGISTERED_IDS = [
  "hero.default", "hero.gaming", "hero.fitness", "hero.education",
  "gallery.grid", "products.grid", "timeline.default",
  "links.default", "footer.default", "testimonials.default", "faq.default",
  "contact.default", "newsletter.default", "pricing.default",
  "courses.default", "services.default", "embed.spotify", "embed.youtube",
  "social.discord", "social.instagram", "games.default", "contentFeed.default",
];

const isRegistered = (id: string): boolean => REGISTERED_IDS.includes(id);

describe("Component IDs — every origin emits only registered ids", () => {
  it("registered ids are unique", () => {
    expect(new Set(REGISTERED_IDS).size).toBe(REGISTERED_IDS.length);
  });

  it("every template block moduleId is registered", () => {
    const unknown: string[] = [];
    for (const template of templateRegistry.getAll()) {
      for (const page of template.pages) {
        for (const section of page.sections) {
          for (const block of section.blocks) {
            if (!isRegistered(block.moduleId)) unknown.push(block.moduleId);
          }
        }
      }
    }
    expect(unknown).toEqual([]);
  });

  it("every website-blueprint SECTION_REGISTRY type is registered", () => {
    const unknown = SECTION_REGISTRY.filter((s) => !isRegistered(s.type)).map((s) => s.type);
    expect(unknown).toEqual([]);
  });

  it("every business template moduleId is registered", () => {
    const unknown: string[] = [];
    for (const template of BUSINESS_TEMPLATES) {
      for (const section of template.sections) {
        if (!isRegistered(section.moduleId)) unknown.push(section.moduleId);
      }
    }
    expect(unknown).toEqual([]);
  });

  it("every resolveModuleId compat target resolves to a registered id", () => {
    const compatInputs = [
      "hero", "gallery", "products", "timeline", "links", "footer",
      "testimonials", "faq", "contact", "newsletter", "pricing", "courses",
      "games", "contentFeed", "content_feed", "services",
      "featured_products", "product_grid", "social_links", "contact_form",
    ];
    const unregistered = compatInputs.map(resolveModuleId).filter((id) => !isRegistered(id));
    expect(unregistered).toEqual([]);
  });

  it("legacy hero ids no longer exist in any data source (no hero.agency etc.)", () => {
    const legacy = ["hero.agency", "hero.music", "hero.restaurant", "hero.portfolio", "hero.creator", "hero.professional", "hero.corporate", "hero.minimal"];
    const allIds = [
      ...templateRegistry.getAll().flatMap((t) => t.pages.flatMap((p) => p.sections.flatMap((s) => s.blocks.map((b) => b.moduleId)))),
      ...SECTION_REGISTRY.map((s) => s.type),
      ...BUSINESS_TEMPLATES.flatMap((t) => t.sections.map((s) => s.moduleId)),
    ];
    for (const id of legacy) {
      expect(allIds).not.toContain(id);
    }
  });
});
