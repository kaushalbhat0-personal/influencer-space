/**
 * Website Blueprint configuration — IMPLEMENTATION-37.
 *
 * The canonical per-entity storefront blueprint: sections (with required/
 * recommended/optional/hidden decisions), layout, theme family, CTA strategy,
 * SEO, analytics events, monetization modules and integrations. Everything is
 * config-driven and evidence-backed — the Builder, Theme Runtime and Publishing
 * derive from it; no renderer/builder duplication.
 */
import type { EvidenceEntityType } from "@/lib/generation/intelligence/evidence/config";

export type SectionDecision = "required" | "recommended" | "optional" | "hidden";

export interface SectionPlan {
  id: string;
  label: string;
  decision: SectionDecision;
  order: number;
}

export interface BlueprintTemplate {
  entity: EvidenceEntityType;
  layout: string;
  themeFamily: string;
  typography: string;
  spacing: string;
  animationDensity: string;
  visualTone: string;
  colorDirection: string;
  primaryCta: string;
  secondaryCta: string;
  sections: SectionPlan[];
  seo: {
    titleStrategy: string;
    metaStrategy: string;
    structuredDataType: string;
    openGraphType: string;
    canonicalPattern: string;
    defaultKeywords: string[];
  };
  analytics: string[];
  monetization: string[];
  integrations: string[];
}

const HERO: SectionPlan = { id: "hero", label: "Hero", decision: "required", order: 1 };
const CONTACT: SectionPlan = { id: "contact", label: "Contact", decision: "required", order: 100 };
const GALLERY: SectionPlan = { id: "gallery", label: "Gallery", decision: "recommended", order: 30 };
const TESTIMONIALS: SectionPlan = { id: "testimonials", label: "Testimonials", decision: "recommended", order: 40 };
const FAQ: SectionPlan = { id: "faq", label: "FAQ", decision: "recommended", order: 50 };

export const BLUEPRINTS: Record<string, BlueprintTemplate> = {
  athlete: {
    entity: "athlete",
    layout: "portfolio",
    themeFamily: "bold-sport",
    typography: "bold-condensed",
    spacing: "tight",
    animationDensity: "high",
    visualTone: "energetic",
    colorDirection: "high-contrast",
    primaryCta: "Shop Merch",
    secondaryCta: "Follow My Season",
    sections: [
      HERO,
      { id: "achievements", label: "Achievements", decision: "required", order: 10 },
      { id: "sponsors", label: "Sponsors", decision: "required", order: 20 },
      GALLERY,
      { id: "media", label: "Media", decision: "required", order: 25 },
      TESTIMONIALS,
      CONTACT,
      { id: "merchandise", label: "Merchandise", decision: "optional", order: 35 },
      { id: "community", label: "Community", decision: "optional", order: 60 },
      { id: "events", label: "Events", decision: "optional", order: 70 },
      { id: "courses", label: "Courses", decision: "hidden", order: 80 },
      { id: "games", label: "Games", decision: "hidden", order: 81 },
      { id: "timeline", label: "Timeline", decision: "hidden", order: 82 },
    ],
    seo: { titleStrategy: "{name} — Official Store & Career", metaStrategy: "athlete bio + achievements", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["athlete", "career", "merchandise"] },
    analytics: ["merch_purchase", "newsletter_signup", "video_view"],
    monetization: ["merchandise", "sponsorship", "community"],
    integrations: ["youtube", "instagram", "spotify"],
  },
  restaurant: {
    entity: "restaurant",
    layout: "restaurant",
    themeFamily: "warm-dining",
    typography: "serif-elegant",
    spacing: "relaxed",
    animationDensity: "low",
    visualTone: "welcoming",
    colorDirection: "warm-neutral",
    primaryCta: "Reserve Table",
    secondaryCta: "View Menu",
    sections: [
      HERO,
      { id: "menu", label: "Menu", decision: "required", order: 10 },
      { id: "reservations", label: "Reservations", decision: "required", order: 20 },
      GALLERY,
      { id: "location", label: "Location", decision: "required", order: 60 },
      { id: "hours", label: "Hours", decision: "required", order: 70 },
      TESTIMONIALS,
      CONTACT,
      { id: "courses", label: "Courses", decision: "hidden", order: 80 },
      { id: "games", label: "Games", decision: "hidden", order: 81 },
      { id: "products", label: "Products", decision: "hidden", order: 82 },
    ],
    seo: { titleStrategy: "{name} — Menu, Hours & Reservations", metaStrategy: "local restaurant + menu highlights", structuredDataType: "Restaurant", openGraphType: "restaurant", canonicalPattern: "/{subdomain}", defaultKeywords: ["restaurant", "menu", "reservations", "local"] },
    analytics: ["reservation", "menu_view", "call_click"],
    monetization: ["services", "products"],
    integrations: ["instagram", "google_maps"],
  },
  developer: {
    entity: "developer",
    layout: "portfolio",
    themeFamily: "dark-tech",
    typography: "mono-modern",
    spacing: "tight",
    animationDensity: "medium",
    visualTone: "technical",
    colorDirection: "dark-neon",
    primaryCta: "View My Work",
    secondaryCta: "Hire Me",
    sections: [
      HERO,
      { id: "projects", label: "Projects", decision: "required", order: 10 },
      { id: "skills", label: "Skills", decision: "required", order: 20 },
      { id: "experience", label: "Experience", decision: "required", order: 30 },
      { id: "github", label: "GitHub", decision: "required", order: 40 },
      { id: "blog", label: "Blog", decision: "recommended", order: 50 },
      TESTIMONIALS,
      CONTACT,
      { id: "services", label: "Services", decision: "optional", order: 60 },
      { id: "menu", label: "Menu", decision: "hidden", order: 80 },
      { id: "reservations", label: "Reservations", decision: "hidden", order: 81 },
      { id: "games", label: "Games", decision: "hidden", order: 82 },
    ],
    seo: { titleStrategy: "{name} — Developer Portfolio", metaStrategy: "projects + skills + github", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["developer", "portfolio", "github", "software"] },
    analytics: ["portfolio_download", "consultation_booking", "newsletter_signup"],
    monetization: ["services", "digital_products", "software"],
    integrations: ["github", "youtube", "linkedin"],
  },
  educator: {
    entity: "educator",
    layout: "education",
    themeFamily: "academic",
    typography: "clean-sans",
    spacing: "relaxed",
    animationDensity: "low",
    visualTone: "inspiring",
    colorDirection: "calm-blue",
    primaryCta: "Enroll Now",
    secondaryCta: "Download Resources",
    sections: [
      HERO,
      { id: "courses", label: "Courses", decision: "required", order: 10 },
      TESTIMONIALS,
      FAQ,
      { id: "newsletter", label: "Newsletter", decision: "required", order: 55 },
      { id: "resources", label: "Resources", decision: "recommended", order: 60 },
      { id: "community", label: "Community", decision: "recommended", order: 65 },
      CONTACT,
    ],
    seo: { titleStrategy: "{name} — Courses & Learning", metaStrategy: "course catalog + outcomes", structuredDataType: "Course", openGraphType: "website", canonicalPattern: "/{subdomain}", defaultKeywords: ["course", "learn", "education"] },
    analytics: ["course_purchase", "newsletter_signup", "video_view"],
    monetization: ["courses", "community", "newsletter"],
    integrations: ["youtube", "notion", "discord"],
  },
  teacher: {
    entity: "teacher",
    layout: "education",
    themeFamily: "academic",
    typography: "clean-sans",
    spacing: "relaxed",
    animationDensity: "low",
    visualTone: "inspiring",
    colorDirection: "calm-blue",
    primaryCta: "Start Learning",
    secondaryCta: "Download Study Plan",
    sections: [
      HERO,
      { id: "courses", label: "Lessons", decision: "required", order: 10 },
      { id: "resources", label: "Resources", decision: "recommended", order: 60 },
      TESTIMONIALS,
      FAQ,
      CONTACT,
    ],
    seo: { titleStrategy: "{name} — Lessons & Study", metaStrategy: "lessons + study resources", structuredDataType: "Course", openGraphType: "website", canonicalPattern: "/{subdomain}", defaultKeywords: ["teacher", "lessons", "study"] },
    analytics: ["course_purchase", "newsletter_signup"],
    monetization: ["courses", "community"],
    integrations: ["youtube", "notion"],
  },
  fitness: {
    entity: "fitness",
    layout: "landing",
    themeFamily: "energetic-coach",
    typography: "bold-sans",
    spacing: "tight",
    animationDensity: "medium",
    visualTone: "motivating",
    colorDirection: "vibrant-orange",
    primaryCta: "Book Session",
    secondaryCta: "Start Program",
    sections: [
      HERO,
      { id: "programs", label: "Programs", decision: "required", order: 10 },
      { id: "pricing", label: "Pricing", decision: "required", order: 20 },
      { id: "transformations", label: "Transformations", decision: "required", order: 30 },
      TESTIMONIALS,
      { id: "booking", label: "Booking", decision: "required", order: 45 },
      { id: "nutrition", label: "Nutrition", decision: "recommended", order: 50 },
      FAQ,
      CONTACT,
    ],
    seo: { titleStrategy: "{name} — Fitness Coaching", metaStrategy: "programs + transformations", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["fitness", "coach", "training"] },
    analytics: ["consultation_booking", "program_purchase", "newsletter_signup"],
    monetization: ["coaching", "products", "membership"],
    integrations: ["instagram", "youtube", "calendly"],
  },
  doctor: {
    entity: "doctor",
    layout: "business",
    themeFamily: "clean-medical",
    typography: "clean-sans",
    spacing: "relaxed",
    animationDensity: "low",
    visualTone: "trustworthy",
    colorDirection: "clinical-white",
    primaryCta: "Book Appointment",
    secondaryCta: "Learn More",
    sections: [HERO, { id: "services", label: "Services", decision: "required", order: 10 }, TESTIMONIALS, FAQ, { id: "location", label: "Location", decision: "required", order: 60 }, CONTACT],
    seo: { titleStrategy: "Dr. {name} — Clinic & Appointments", metaStrategy: "specialties + credentials", structuredDataType: "MedicalClinic", openGraphType: "website", canonicalPattern: "/{subdomain}", defaultKeywords: ["doctor", "clinic", "appointment"] },
    analytics: ["consultation_booking", "call_click"],
    monetization: ["services"],
    integrations: ["google_maps", "calendly"],
  },
  photographer: {
    entity: "photographer",
    layout: "portfolio",
    themeFamily: "minimal-photo",
    typography: "elegant-serif",
    spacing: "relaxed",
    animationDensity: "medium",
    visualTone: "artistic",
    colorDirection: "neutral-minimal",
    primaryCta: "Book a Shoot",
    secondaryCta: "View Gallery",
    sections: [HERO, GALLERY, { id: "products", label: "Prints", decision: "optional", order: 35 }, TESTIMONIALS, CONTACT],
    seo: { titleStrategy: "{name} — Photography Portfolio", metaStrategy: "portfolio + bookings", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["photographer", "portfolio", "booking"] },
    analytics: ["portfolio_download", "consultation_booking"],
    monetization: ["services", "digital_products"],
    integrations: ["instagram", "google_maps"],
  },
  musician: {
    entity: "musician",
    layout: "landing",
    themeFamily: "dark-concert",
    typography: "display-bold",
    spacing: "tight",
    animationDensity: "high",
    visualTone: "expressive",
    colorDirection: "deep-purple",
    primaryCta: "Listen Now",
    secondaryCta: "Book Performance",
    sections: [HERO, GALLERY, { id: "media", label: "Media", decision: "required", order: 25 }, { id: "merchandise", label: "Merchandise", decision: "optional", order: 35 }, { id: "events", label: "Tour", decision: "recommended", order: 70 }, CONTACT],
    seo: { titleStrategy: "{name} — Music, Tour & Merch", metaStrategy: "music + tour dates", structuredDataType: "MusicGroup", openGraphType: "music.song", canonicalPattern: "/{subdomain}", defaultKeywords: ["music", "album", "tour"] },
    analytics: ["merch_purchase", "newsletter_signup", "video_view"],
    monetization: ["products", "sponsorship", "community"],
    integrations: ["spotify", "youtube", "instagram"],
  },
  coach: {
    entity: "coach",
    layout: "landing",
    themeFamily: "energetic-coach",
    typography: "bold-sans",
    spacing: "tight",
    animationDensity: "medium",
    visualTone: "motivating",
    colorDirection: "vibrant-orange",
    primaryCta: "Book a Session",
    secondaryCta: "Join Community",
    sections: [HERO, { id: "services", label: "Services", decision: "required", order: 10 }, { id: "pricing", label: "Pricing", decision: "required", order: 20 }, TESTIMONIALS, { id: "booking", label: "Booking", decision: "required", order: 45 }, FAQ, CONTACT],
    seo: { titleStrategy: "{name} — Coaching & Mentorship", metaStrategy: "services + outcomes", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["coach", "coaching", "mentorship"] },
    analytics: ["consultation_booking", "program_purchase"],
    monetization: ["coaching", "courses", "community"],
    integrations: ["calendly", "instagram", "youtube"],
  },
  agency: {
    entity: "agency",
    layout: "business",
    themeFamily: "corporate-agency",
    typography: "clean-sans",
    spacing: "relaxed",
    animationDensity: "low",
    visualTone: "professional",
    colorDirection: "corporate-blue",
    primaryCta: "Get a Quote",
    secondaryCta: "See Work",
    sections: [HERO, { id: "services", label: "Services", decision: "required", order: 10 }, { id: "portfolio", label: "Portfolio", decision: "required", order: 20 }, TESTIMONIALS, CONTACT],
    seo: { titleStrategy: "{name} — Agency Services", metaStrategy: "services + case studies", structuredDataType: "Organization", openGraphType: "website", canonicalPattern: "/{subdomain}", defaultKeywords: ["agency", "services", "marketing"] },
    analytics: ["consultation_booking", "portfolio_download"],
    monetization: ["services", "consulting"],
    integrations: ["linkedin", "instagram", "google_maps"],
  },
  streamer: {
    entity: "streamer",
    layout: "creator",
    themeFamily: "gamer-stream",
    typography: "display-rounded",
    spacing: "tight",
    animationDensity: "high",
    visualTone: "playful",
    colorDirection: "vivid-purple",
    primaryCta: "Subscribe",
    secondaryCta: "Join Discord",
    sections: [HERO, GALLERY, { id: "media", label: "Highlights", decision: "required", order: 25 }, { id: "merchandise", label: "Merchandise", decision: "optional", order: 35 }, { id: "community", label: "Community", decision: "required", order: 60 }, CONTACT],
    seo: { titleStrategy: "{name} — Streamer & Content", metaStrategy: "stream schedule + highlights", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["streamer", "gaming", "live"] },
    analytics: ["merch_purchase", "video_view", "newsletter_signup"],
    monetization: ["membership", "merchandise", "sponsorship"],
    integrations: ["twitch", "youtube", "discord"],
  },
  influencer: {
    entity: "influencer",
    layout: "creator",
    themeFamily: "creator-lifestyle",
    typography: "modern-sans",
    spacing: "relaxed",
    animationDensity: "medium",
    visualTone: "friendly",
    colorDirection: "soft-pastel",
    primaryCta: "Work With Me",
    secondaryCta: "Shop My Picks",
    sections: [HERO, GALLERY, { id: "products", label: "Shop", decision: "recommended", order: 35 }, TESTIMONIALS, CONTACT],
    seo: { titleStrategy: "{name} — Influencer & Content Creator", metaStrategy: "brand + collaborations", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["influencer", "collab", "brand"] },
    analytics: ["merch_purchase", "newsletter_signup", "video_view"],
    monetization: ["sponsorship", "affiliate", "products"],
    integrations: ["instagram", "youtube", "tiktok"],
  },
  creator: {
    entity: "creator",
    layout: "creator",
    themeFamily: "creator-lifestyle",
    typography: "modern-sans",
    spacing: "relaxed",
    animationDensity: "medium",
    visualTone: "warm",
    colorDirection: "indigo-gradient",
    primaryCta: "Get Started",
    secondaryCta: "Browse Store",
    sections: [HERO, { id: "products", label: "Products", decision: "recommended", order: 10 }, GALLERY, TESTIMONIALS, { id: "community", label: "Community", decision: "optional", order: 60 }, CONTACT],
    seo: { titleStrategy: "{name} — Creator Storefront", metaStrategy: "creator + products + content", structuredDataType: "Person", openGraphType: "profile", canonicalPattern: "/{subdomain}", defaultKeywords: ["creator", "content", "store"] },
    analytics: ["merch_purchase", "newsletter_signup", "video_view"],
    monetization: ["products", "digital_products", "newsletter"],
    integrations: ["youtube", "instagram", "spotify"],
  },
};

export function blueprintForEntity(entity: EvidenceEntityType | null | undefined): BlueprintTemplate {
  return BLUEPRINTS[entity ?? "creator"] ?? BLUEPRINTS.creator!;
}

export const BLUEPRINT_VERSION = 1;
