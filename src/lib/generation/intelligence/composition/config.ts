/**
 * Storefront Composition configuration — IMPLEMENTATION-38.
 *
 * Maps the intelligence Website Blueprint's section ids to EXISTING registry
 * components (moduleIds + artifact SectionType), and the blueprint themeFamily
 * to a Theme Registry id. Never introduces new section types or themes.
 */
import { themeRegistry } from "@/lib/theme/registry-new";

export const FALLBACK_THEME_ID = "com.creatos.neon-dark";

/** Blueprint section id → artifact SectionType + moduleId (existing components). */
export interface SectionMapping {
  type: string; // artifact SectionType (resolveModuleId-compatible)
  moduleId: string; // registry moduleId
  mapping: "exact" | "closest";
}

export const SECTION_MAP: Record<string, SectionMapping> = {
  hero: { type: "hero", moduleId: "hero.default", mapping: "exact" },
  gallery: { type: "gallery", moduleId: "gallery.grid", mapping: "exact" },
  products: { type: "products", moduleId: "products.grid", mapping: "exact" },
  merchandise: { type: "products", moduleId: "products.grid", mapping: "closest" },
  services: { type: "services", moduleId: "services.default", mapping: "exact" },
  programs: { type: "services", moduleId: "services.default", mapping: "closest" }, // fitness programs → services
  testimonials: { type: "testimonials", moduleId: "testimonials.default", mapping: "exact" },
  faq: { type: "faq", moduleId: "faq.default", mapping: "exact" },
  newsletter: { type: "newsletter", moduleId: "newsletter.default", mapping: "exact" },
  courses: { type: "courses", moduleId: "courses.default", mapping: "exact" },
  contact: { type: "contact", moduleId: "contact.default", mapping: "exact" },
  reservations: { type: "contact", moduleId: "contact.default", mapping: "closest" },
  booking: { type: "contact", moduleId: "contact.default", mapping: "closest" },
  location: { type: "contact", moduleId: "contact.default", mapping: "closest" },
  footer: { type: "footer", moduleId: "footer.default", mapping: "exact" },
  timeline: { type: "timeline", moduleId: "timeline.default", mapping: "exact" },
  achievements: { type: "timeline", moduleId: "timeline.default", mapping: "closest" },
  experience: { type: "timeline", moduleId: "timeline.default", mapping: "closest" },
  links: { type: "links", moduleId: "links.default", mapping: "exact" },
  menu: { type: "links", moduleId: "links.default", mapping: "closest" }, // menu list → links
  sponsors: { type: "links", moduleId: "links.default", mapping: "closest" },
  github: { type: "links", moduleId: "links.default", mapping: "closest" },
  community: { type: "links", moduleId: "links.default", mapping: "closest" },
  events: { type: "links", moduleId: "links.default", mapping: "closest" },
  media: { type: "contentfeed", moduleId: "contentFeed.default", mapping: "closest" },
  blog: { type: "contentfeed", moduleId: "contentFeed.default", mapping: "closest" },
  resources: { type: "contentfeed", moduleId: "contentFeed.default", mapping: "closest" },
  games: { type: "games", moduleId: "games.default", mapping: "exact" },
  hours: { type: "faq", moduleId: "faq.default", mapping: "closest" },
  nutrition: { type: "faq", moduleId: "faq.default", mapping: "closest" },
  transformations: { type: "gallery", moduleId: "gallery.grid", mapping: "closest" },
  projects: { type: "gallery", moduleId: "gallery.grid", mapping: "closest" },
  portfolio: { type: "gallery", moduleId: "gallery.grid", mapping: "closest" },
  skills: { type: "services", moduleId: "services.default", mapping: "closest" },
};

/** Entity → hero variant (existing registered variants). */
export const HERO_VARIANT_BY_ENTITY: Record<string, string> = {
  fitness: "hero.fitness",
  coach: "hero.fitness",
  educator: "hero.education",
  teacher: "hero.education",
  streamer: "hero.gaming",
  gamer: "hero.gaming",
};

/** Blueprint themeFamily → Theme Registry id (config-driven; validated at build). */
export const THEME_FAMILY_MAP: Record<string, string> = {
  "bold-sport": "com.creatos.cyber-arena",
  "warm-dining": "com.creatos.modern-restaurant",
  "dark-tech": "com.creatos.game-stream",
  academic: "com.creatos.academy",
  "energetic-coach": "com.creatos.coach",
  "clean-medical": "com.creatos.professional",
  "minimal-photo": "com.creatos.photographer",
  "dark-concert": "com.creatos.audio-creator",
  "corporate-agency": "com.creatos.corporate-blue",
  "gamer-stream": "com.creatos.stream-vibe",
  "creator-lifestyle": "com.creatos.creator-studio",
  "dark-tech-pro": "com.creatos.creator-pro",
};

/** Resolve a themeFamily to a valid theme id (validated against the registry). */
export function themeIdForFamily(family: string | null | undefined): string {
  if (!family) return FALLBACK_THEME_ID;
  const candidate = THEME_FAMILY_MAP[family];
  if (candidate && themeRegistry.getById(candidate)) return candidate;
  return FALLBACK_THEME_ID;
}
