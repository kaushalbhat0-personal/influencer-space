/**
 * Heading Registry — RCCF-PRELAUNCH-12C
 * Config-driven, deterministic, grounded headings per archetype × section.
 * Never uses arbitrary source prose as heading; safe generic fallback.
 */
import type { Archetype } from "@/lib/generation/blueprint/config";

type HeadingOptions = string[];

const REGISTRY: Record<Archetype, Record<string, HeadingOptions>> & Record<string, Record<string, HeadingOptions>> = {
  professional_resume: {
    skills: ["Skills", "What I Work With", "Capabilities", "My Stack"],
    experience: ["Experience", "My Journey", "Career", "Professional Experience"],
    projects: ["Selected Work", "Projects", "Featured Work", "Things I've Built"],
    education: ["Education", "Credentials", "Background"],
    achievements: ["Education", "Credentials", "Background"],
    github: ["GitHub", "Code & Work", "Open Source"],
    links: ["Links", "Connect", "Find Me"],
    timeline: ["Experience", "My Journey", "Career"],
    services: ["Skills", "Capabilities"],
    portfolio: ["Selected Work", "Projects"],
    gallery: ["Work", "Portfolio"],
    hero: ["Hero"],
    contact: ["Contact", "Get In Touch"],
    testimonials: ["Testimonials", "What People Say"],
  },
  creator: {
    hero: ["Hero"],
    products: ["Products", "Shop", "Store", "Featured Products"],
    merchandise: ["Merch", "Shop", "Products"],
    gallery: ["Gallery", "Visual Stories", "Highlights", "Portfolio"],
    media: ["Media", "Content", "Latest", "Feed"],
    testimonials: ["What People Say", "Love From Fans", "Testimonials"],
    community: ["Community", "Join Us", "Links"],
    links: ["Links", "Follow Me", "Connect"],
    contact: ["Contact", "Get In Touch"],
    courses: ["Courses", "Learn"],
  },
  local_business: {
    hero: ["Hero"],
    menu: ["Menu", "Our Menu", "What We Serve", "Dishes"],
    reservations: ["Reservations", "Book a Table", "Reserve"],
    booking: ["Reservations", "Book a Table"],
    gallery: ["Gallery", "Our Space", "Inside"],
    location: ["Location", "Find Us", "Visit Us"],
    hours: ["Hours", "Opening Hours", "When We're Open"],
    testimonials: ["Reviews", "What People Say", "Testimonials"],
    contact: ["Contact", "Get In Touch"],
    products: ["Menu", "Our Menu"],
  },
  // Fallback / generic (used when archetype missing or section not in archetype map)
  default: {
    hero: ["Hero"],
    skills: ["Skills"],
    experience: ["Experience"],
    projects: ["Projects"],
    education: ["Education"],
    gallery: ["Gallery"],
    products: ["Products"],
    testimonials: ["Testimonials"],
    contact: ["Contact"],
    links: ["Links"],
    menu: ["Menu"],
    location: ["Location"],
    hours: ["Hours"],
    reservations: ["Reservations"],
    booking: ["Booking"],
    community: ["Community"],
    media: ["Media"],
  },
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Resolve heading for archetype × section.
 * Deterministic, grounded, no LLM, no prose rewriting.
 * Uses hash to pick among configured options so same input always same heading,
 * but heading is always from allowlist.
 */
export function resolveHeading(
  archetype: Archetype | string | null | undefined,
  sectionId: string,
  _evidence?: unknown
): string {
  const archKey = (archetype as string) ?? "default";
  const archMap = (REGISTRY as Record<string, Record<string, HeadingOptions>>)[archKey] ?? REGISTRY.default;
  const options = archMap[sectionId] ?? REGISTRY.default[sectionId] ?? [sectionId.charAt(0).toUpperCase() + sectionId.slice(1)];
  // Deterministic pick: hash(archetype + sectionId) % options.length, but ensure first is most common for predictability
  // For 12C we want Kaushal professional skills to be one of ["Skills","What I Work With",...] — pick via hash for determinism
  const idx = hashString(`${archKey}:${sectionId}`) % options.length;
  return options[idx] ?? options[0]!;
}

/**
 * All grounded headings for a given archetype/section (for tests).
 */
export function headingOptionsFor(archetype: string | null | undefined, sectionId: string): string[] {
  const archKey = (archetype as string) ?? "default";
  const archMap = (REGISTRY as Record<string, Record<string, HeadingOptions>>)[archKey] ?? REGISTRY.default;
  return archMap[sectionId] ?? REGISTRY.default[sectionId] ?? [sectionId];
}
