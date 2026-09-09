/**
 * Archetype Resolver configuration — RCCF-PRELAUNCH-12B
 * Small weighted rule table, no giant if/else.
 * Each rule is a pure signal check with weight per archetype.
 */
import type { Archetype } from "./types";

export interface ArchetypeRule {
  id: string;
  signal: string;
  check: (input: import("./types").ArchetypeInput) => boolean | number; // boolean or 0..1 strength
  weights: Partial<Record<Archetype, number>>;
  description: string;
}

function hasResume(input: import("./types").ArchetypeInput): boolean {
  return !!input.source.resume;
}
function resumeLen(input: import("./types").ArchetypeInput, field: keyof import("@/lib/generation/intelligence/types").ResumeSource): number {
  const r = input.source.resume;
  if (!r) return 0;
  const v = r[field];
  if (Array.isArray(v)) return v.length;
  if (typeof v === "string") return v.trim().length > 0 ? 1 : 0;
  return 0;
}
function hasSocial(input: import("./types").ArchetypeInput, platform: string): boolean {
  const p = platform.toLowerCase();
  const resumeLinks = input.source.resume?.socialLinks ?? [];
  if (resumeLinks.some((l) => l.platform.toLowerCase() === p)) return true;
  const links = [...(input.source.socialLinks ?? []), ...(input.source.links ?? [])].join(" ").toLowerCase();
  if (links.includes(`${p}.com`)) return true;
  if (input.source.links.some((l) => l.toLowerCase().includes(p))) return true;
  return false;
}
function hasPlatform(input: import("./types").ArchetypeInput, platform: string): boolean {
  return input.relationships.platforms.includes(platform);
}
function hasEntity(input: import("./types").ArchetypeInput, entity: string): boolean {
  return input.evidence.entities.some((e) => e.entity === entity);
}
function hasNiche(input: import("./types").ArchetypeInput, niche: string): boolean {
  return input.evidence.niches.some((n) => n.niche.toLowerCase() === niche.toLowerCase());
}
function textContains(input: import("./types").ArchetypeInput, keyword: string): boolean {
  const lower = [
    input.source.bio ?? "",
    input.source.resume?.summary ?? "",
    ...(input.source.resume?.skills ?? []),
    ...(input.source.resume?.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`) ?? []),
    ...(input.source.resume?.projects.map((p) => `${p.name} ${p.description}`) ?? []),
    ...(input.source.resume?.education.map((e) => `${e.degree} ${e.institution ?? ""}`) ?? []),
    ...(input.source.resume?.certifications ?? []),
    input.source.resume?.location ?? "",
    input.source.location ?? "",
  ].join(" ").toLowerCase();
  return lower.includes(keyword.toLowerCase());
}
function sourceTextLower(input: import("./types").ArchetypeInput): string {
  return [
    input.source.bio ?? "",
    input.source.resume?.summary ?? "",
    ...(input.source.resume?.skills ?? []),
    ...(input.source.resume?.experience.map((e) => `${e.title} ${e.company ?? ""} ${e.description}`) ?? []),
    ...(input.source.resume?.projects.map((p) => `${p.name} ${p.description}`) ?? []),
    ...(input.source.resume?.education.map((e) => `${e.degree} ${e.institution ?? ""}`) ?? []),
    input.source.location ?? "",
    input.source.resume?.location ?? "",
  ].join(" ").toLowerCase();
}

export const ARCHETYPE_RULES: ArchetypeRule[] = [
  // ── Professional signals ────────────────────────────────────────────
  {
    id: "resume_summary",
    signal: "resume.summary",
    check: (i) => resumeLen(i, "summary") > 0 ? 1 : 0,
    weights: { professional_resume: 2 },
    description: "Resume has summary/profile",
  },
  {
    id: "resume_experience",
    signal: "resume.experience",
    check: (i) => {
      const n = resumeLen(i, "experience");
      if (n >= 3) return 1;
      if (n >= 1) return 0.6;
      return 0;
    },
    weights: { professional_resume: 3 },
    description: "Resume has experience entries",
  },
  {
    id: "resume_skills",
    signal: "resume.skills",
    check: (i) => {
      const n = resumeLen(i, "skills");
      if (n >= 10) return 1;
      if (n >= 5) return 0.7;
      if (n >= 1) return 0.4;
      return 0;
    },
    weights: { professional_resume: 2 },
    description: "Resume has skills",
  },
  {
    id: "resume_projects",
    signal: "resume.projects",
    check: (i) => {
      const n = resumeLen(i, "projects");
      if (n >= 3) return 1;
      if (n >= 1) return 0.6;
      return 0;
    },
    weights: { professional_resume: 2 },
    description: "Resume has projects",
  },
  {
    id: "resume_education",
    signal: "resume.education",
    check: (i) => resumeLen(i, "education") > 0 ? 1 : 0,
    weights: { professional_resume: 1.5 },
    description: "Resume has education",
  },
  {
    id: "resume_certifications",
    signal: "resume.certifications",
    check: (i) => resumeLen(i, "certifications") > 0 ? 1 : 0,
    weights: { professional_resume: 1 },
    description: "Resume has certifications",
  },
  {
    id: "resume_github",
    signal: "resume.github",
    check: (i) => hasSocial(i, "github") ? 1 : 0,
    weights: { professional_resume: 2, creator: 0.5 },
    description: "GitHub link present",
  },
  {
    id: "resume_linkedin",
    signal: "resume.linkedin",
    check: (i) => hasSocial(i, "linkedin") ? 1 : 0,
    weights: { professional_resume: 1.5 },
    description: "LinkedIn link present",
  },
  {
    id: "professional_title",
    signal: "professional_title",
    check: (i) => {
      const txt = sourceTextLower(i);
      const keywords = ["software engineer", "developer", "engineer", "architect", "full-stack", "full stack", "frontend", "backend"];
      return keywords.some((k) => txt.includes(k)) ? 1 : 0;
    },
    weights: { professional_resume: 1.5 },
    description: "Professional title keywords",
  },
  {
    id: "has_resume_structured",
    signal: "has_resume_structured",
    check: (i) => hasResume(i) ? 1 : 0,
    weights: { professional_resume: 1 },
    description: "Has structured resume",
  },

  // ── Creator signals ──────────────────────────────────────────────────
  {
    id: "platform_youtube",
    signal: "platform.youtube",
    check: (i) => hasPlatform(i, "youtube") || hasSocial(i, "youtube") ? 1 : 0,
    weights: { creator: 3 },
    description: "YouTube platform present",
  },
  {
    id: "platform_instagram",
    signal: "platform.instagram",
    check: (i) => hasPlatform(i, "instagram") || hasSocial(i, "instagram") ? 1 : 0,
    weights: { creator: 2, local_business: 0.5 },
    description: "Instagram platform present",
  },
  {
    id: "platform_tiktok",
    signal: "platform.tiktok",
    check: (i) => hasPlatform(i, "tiktok") || hasSocial(i, "tiktok") ? 1 : 0,
    weights: { creator: 2 },
    description: "TikTok platform present",
  },
  {
    id: "platform_twitch_spotify",
    signal: "platform.twitch_spotify",
    check: (i) => hasPlatform(i, "twitch") || hasPlatform(i, "spotify") || hasPlatform(i, "twitch") ? 1 : 0,
    weights: { creator: 1.5 },
    description: "Creator platforms twitch/spotify",
  },
  {
    id: "entity_creator_signals",
    signal: "entity.creator",
    check: (i) => {
      const creatorEntities = ["creator", "influencer", "streamer", "artist", "musician", "photographer", "fitness", "coach"];
      return creatorEntities.some((e) => hasEntity(i, e)) ? 1 : 0;
    },
    weights: { creator: 2 },
    description: "Creator-type entity detected",
  },
  {
    id: "niche_creator",
    signal: "niche.creator",
    check: (i) => {
      const creatorNiches = ["gaming", "lifestyle", "fashion", "beauty", "music", "art", "entertainment"];
      return creatorNiches.some((n) => hasNiche(i, n)) ? 1 : 0;
    },
    weights: { creator: 1 },
    description: "Creator niche detected",
  },
  {
    id: "audience_followers",
    signal: "audience.followers",
    check: (i) => {
      if (i.source.followers > 1000) return 1;
      if (i.source.followers > 0) return 0.5;
      if (i.evidence.audience.segments.length > 0) return 0.3;
      return 0;
    },
    weights: { creator: 1.5 },
    description: "Audience/follower signals",
  },
  {
    id: "creator_content_signals",
    signal: "content.creator",
    check: (i) => {
      const txt = sourceTextLower(i);
      const keywords = ["creator", "content", "channel", "subscribers", "video", "vlog", "followers", "influencer"];
      const hits = keywords.filter((k) => txt.includes(k)).length;
      if (hits >= 3) return 1;
      if (hits >= 1) return 0.5;
      return 0;
    },
    weights: { creator: 1 },
    description: "Creator content signals",
  },

  // ── Local business signals ───────────────────────────────────────────
  {
    id: "entity_restaurant",
    signal: "entity.restaurant",
    check: (i) => hasEntity(i, "restaurant") ? 1 : 0,
    weights: { local_business: 4 },
    description: "Restaurant entity detected",
  },
  {
    id: "entity_business_generic",
    signal: "entity.business",
    check: (i) => {
      const biz = ["startup", "agency", "company", "brand", "business", "organization"];
      return biz.some((e) => hasEntity(i, e)) ? 1 : 0;
    },
    weights: { local_business: 1 },
    description: "Business entity detected",
  },
  {
    id: "signal_menu",
    signal: "signal.menu",
    check: (i) => {
      const txt = sourceTextLower(i);
      if (txt.includes("menu") || i.evidence.niches.some((n) => n.niche.toLowerCase() === "food" || n.niche.toLowerCase() === "restaurant")) return 1;
      return 0;
    },
    weights: { local_business: 3 },
    description: "Menu signal",
  },
  {
    id: "signal_location",
    signal: "signal.location",
    check: (i) => {
      if (i.source.location || i.source.resume?.location || (i.source as unknown as { googleMapsUrl?: string }).googleMapsUrl) return 1;
      if (hasPlatform(i, "google_maps")) return 1;
      const txt = sourceTextLower(i);
      const locKeywords = ["pune", "mumbai", "delhi", "bangalore", "new york", "london", "paris", "address"];
      if (locKeywords.some((k) => txt.includes(k))) return 0.5;
      return 0;
    },
    weights: { local_business: 2 },
    description: "Location signal",
  },
  {
    id: "signal_hours",
    signal: "signal.hours",
    check: (i) => {
      const txt = sourceTextLower(i);
      if (txt.includes("hours") || txt.includes("open") || txt.includes("closed") || txt.includes("timings")) return 1;
      return 0;
    },
    weights: { local_business: 1.5 },
    description: "Hours signal",
  },
  {
    id: "signal_reviews",
    signal: "signal.reviews",
    check: (i) => {
      const txt = sourceTextLower(i);
      if (txt.includes("reviews") || txt.includes("testimonials") || txt.includes("ratings") || txt.includes("customers say")) return 1;
      return 0;
    },
    weights: { local_business: 1 },
    description: "Reviews/testimonials signal",
  },
  {
    id: "signal_reservations",
    signal: "signal.reservations",
    check: (i) => {
      const txt = sourceTextLower(i);
      if (txt.includes("reservation") || txt.includes("reserve") || txt.includes("book a table") || txt.includes("order now")) return 1;
      return 0;
    },
    weights: { local_business: 2 },
    description: "Reservations/order signal",
  },
  {
    id: "platform_google_maps",
    signal: "platform.google_maps",
    check: (i) => hasPlatform(i, "google_maps") || !!(i.source as unknown as { googleMapsUrl?: string }).googleMapsUrl ? 1 : 0,
    weights: { local_business: 3 },
    description: "Google Maps platform",
  },
];

// Fallback confidence threshold below which we keep safe default
export const ARCHEYPE_CONFIDENCE_THRESHOLD = 0.35;

// For ambiguous, fallback archetype is creator (existing safe behavior)
export const FALLBACK_ARCHETYPE: Archetype = "creator";
