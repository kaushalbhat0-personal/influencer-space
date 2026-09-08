/**
 * Variant Hint Resolver — RCCF-PRELAUNCH-12C
 * Deterministic, config-driven, uses only existing registered variants.
 * No new variants, no renderer persona if/else.
 */
import type { Archetype } from "@/lib/generation/blueprint/config";
import { SECTION_MAP } from "./config";

export interface VariantDecision {
  moduleId: string;
  reason: string;
}

// Thresholds for bento/masonry etc.
const GALLERY_BENTO_THRESHOLD = 6; // gallery with ≥6 images → bento
const PRODUCTS_BENTO_THRESHOLD = 4; // products with ≥4 → bento
const TESTIMONIALS_BENTO_THRESHOLD = 3;
const SERVICES_BENTO_THRESHOLD = 5;
const TIMELINE_MASONRY_THRESHOLD = 3; // experience with ≥3 entries → masonry

function isRegistered(moduleId: string): boolean {
  // Check against SECTION_MAP moduleIds and known hero variants
  const allModuleIds = new Set(Object.values(SECTION_MAP).map((m) => m.moduleId));
  // Hero variants
  allModuleIds.add("hero.default");
  allModuleIds.add("hero.split");
  allModuleIds.add("hero.gaming");
  allModuleIds.add("hero.fitness");
  allModuleIds.add("hero.education");
  // Timeline variants
  allModuleIds.add("timeline.masonry");
  allModuleIds.add("timeline.default");
  // Gallery variants
  allModuleIds.add("gallery.bento");
  allModuleIds.add("gallery.grid");
  // Products variants
  allModuleIds.add("products.bento");
  allModuleIds.add("products.grid");
  // Services variants
  allModuleIds.add("services.bento");
  allModuleIds.add("services.default");
  // Testimonials variants
  allModuleIds.add("testimonials.bento");
  allModuleIds.add("testimonials.default");
  return allModuleIds.has(moduleId);
}

export function resolveVariant(
  archetype: Archetype | string | null | undefined,
  sectionId: string,
  baseModuleId: string,
  itemCount: number,
  _evidence?: unknown
): VariantDecision {
  const arch = (archetype as string) ?? "default";

  // Professional
  if (arch === "professional_resume") {
    if (sectionId === "experience" || sectionId === "timeline" || sectionId === "education" || sectionId === "achievements") {
      if (itemCount >= TIMELINE_MASONRY_THRESHOLD) {
        const m = "timeline.masonry";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `professional timeline masonry for ${itemCount} items` };
      }
      return { moduleId: baseModuleId, reason: "professional timeline default" };
    }
    if (sectionId === "projects" || sectionId === "portfolio" || sectionId === "gallery" || sectionId === "transformations") {
      if (itemCount >= GALLERY_BENTO_THRESHOLD) {
        const m = "gallery.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `gallery bento for ${itemCount} images` };
      }
      return { moduleId: baseModuleId, reason: "gallery grid" };
    }
    if (sectionId === "hero") {
      const m = "hero.split";
      return { moduleId: isRegistered(m) ? m : baseModuleId, reason: "professional hero split" };
    }
    if (sectionId === "skills" || sectionId === "services") {
      if (itemCount >= SERVICES_BENTO_THRESHOLD) {
        const m = "services.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `services bento for ${itemCount} items` };
      }
      return { moduleId: baseModuleId, reason: "services default" };
    }
  }

  // Creator
  if (arch === "creator") {
    if (sectionId === "gallery" || sectionId === "portfolio" || sectionId === "transformations" || sectionId === "projects") {
      if (itemCount >= GALLERY_BENTO_THRESHOLD) {
        const m = "gallery.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `creator gallery bento for ${itemCount}` };
      }
      return { moduleId: baseModuleId, reason: "creator gallery grid" };
    }
    if (sectionId === "products" || sectionId === "merchandise") {
      if (itemCount >= PRODUCTS_BENTO_THRESHOLD) {
        const m = "products.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `creator products bento for ${itemCount}` };
      }
      return { moduleId: baseModuleId, reason: "creator products grid" };
    }
    if (sectionId === "testimonials") {
      if (itemCount >= TESTIMONIALS_BENTO_THRESHOLD) {
        const m = "testimonials.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `testimonials bento for ${itemCount}` };
      }
      return { moduleId: baseModuleId, reason: "testimonials default" };
    }
  }

  // Local business
  if (arch === "local_business") {
    if (sectionId === "gallery" || sectionId === "portfolio" || sectionId === "transformations") {
      if (itemCount >= GALLERY_BENTO_THRESHOLD) {
        const m = "gallery.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `local gallery bento for ${itemCount}` };
      }
      return { moduleId: baseModuleId, reason: "local gallery grid" };
    }
    if (sectionId === "menu" || sectionId === "products" || sectionId === "merchandise") {
      if (itemCount >= 4) {
        const m = "products.bento";
        return { moduleId: isRegistered(m) ? m : baseModuleId, reason: `menu bento for ${itemCount}` };
      }
      return { moduleId: baseModuleId, reason: "menu default" };
    }
  }

  // Fallback: keep base
  return { moduleId: baseModuleId, reason: "fallback base variant" };
}
