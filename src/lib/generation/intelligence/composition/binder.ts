/**
 * Content Binder — RCCF-PRELAUNCH-12C
 * Deterministic, config-driven mapping of structured source data into existing section contracts.
 * No new data structures when existing contract can represent; never fabricate claims.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { Archetype } from "@/lib/generation/blueprint/config";

export interface BinderResult {
  props: Record<string, unknown>;
  hasData: boolean; // false → section must be hidden (do not emit empty)
  itemCount: number;
}

function parseMenuItems(bio: string): string[] {
  const lower = bio.toLowerCase();
  const idx = lower.indexOf("menu:");
  if (idx === -1) return [];
  const after = bio.slice(idx + 5);
  // Take up to next period, newline, or pipe, or 200 chars
  const endIdx = (() => {
    const candidates = [
      after.indexOf("."),
      after.indexOf("\n"),
      after.indexOf("|"),
      after.indexOf("Location:"),
      after.indexOf("Hours:"),
    ].filter((n) => n !== -1);
    if (candidates.length === 0) return Math.min(200, after.length);
    return Math.min(...candidates, 200);
  })();
  const slice = after.slice(0, endIdx);
  return slice
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 1 && s.length < 40)
    .slice(0, 8);
}

/**
 * Deterministic skill curation — prefer high-signal skills using existing evidence only.
 * Target ~12-15 for first generation.
 * Priority is based on a curated high-signal order (languages → frameworks → databases → AI → architecture → auth → testing → devops).
 * No LLM, no invented categories, no mutation of source.
 */
const HIGH_SIGNAL_SKILL_ORDER = [
  // Languages
  "typescript",
  "python",
  "dart",
  "sql",
  "javascript",
  // Frontend major
  "react",
  "next.js",
  "flutter",
  "tailwind",
  "framer motion",
  "gsap",
  // State & Data
  "zustand",
  "tanstack query",
  "react hook form",
  "zod",
  // Backend
  "fastapi",
  "flask",
  "node.js",
  "next.js server actions",
  // Databases & ORM
  "postgresql",
  "supabase",
  "prisma",
  "drizzle",
  "sqlite",
  "sqlalchemy",
  // AI/ML
  "openrouter",
  "prompt engineering",
  "ocr",
  // Auth & Security
  "nextauth",
  "better auth",
  "jwt",
  "rbac",
  "rls",
  // Payments
  "razorpay",
  // Testing
  "vitest",
  "playwright",
  "pytest",
  // DevOps
  "vercel",
  "github actions",
  "docker",
  "esbuild",
  // Architecture
  "clean architecture",
  "domain-driven design",
  "ddd",
  "repository pattern",
  "multi-tenant saas",
  "cqrs",
  "event-driven",
];

function skillPriority(skill: string): number {
  const lower = skill.toLowerCase();
  for (let i = 0; i < HIGH_SIGNAL_SKILL_ORDER.length; i++) {
    const key = HIGH_SIGNAL_SKILL_ORDER[i];
    if (lower.includes(key) || key.includes(lower)) return i;
    // Also check exact token
    if (lower === key) return i;
  }
  return 999;
}

function curateSkills(skills: string[]): string[] {
  // Score each skill by priority, then by original index for stability
  const scored = skills.map((s, idx) => ({
    skill: s,
    priority: skillPriority(s),
    originalIndex: idx,
  }));
  scored.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.originalIndex - b.originalIndex;
  });
  return scored.map((x) => x.skill);
}

export function bindSection(
  sectionId: string,
  source: ContentSource | null | undefined,
  archetype: Archetype | null | undefined,
  fallbackLabel: string
): BinderResult {
  // Safe defaults when no source (preserve existing placeholder behavior for backward compat)
  // For 12C, when source is present we enforce hasData; when absent we return hasData true to keep legacy visible
  const hasSource = !!source;
  const bio = source?.bio ?? "";
  const resume = source?.resume ?? null;

  const empty = (props: Record<string, unknown>): BinderResult => ({ props, hasData: false, itemCount: 0 });
  const withData = (props: Record<string, unknown>, count: number): BinderResult => ({ props, hasData: count > 0, itemCount: count });

  switch (sectionId) {
    case "hero": {
      // Hero always has data (name/tagline) — never hidden
      const name = source?.displayName || source?.username || fallbackLabel || "Creator";
      return withData(
        {
          title: name,
          name,
          tagline: resume?.summary?.slice(0, 120) ?? bio.slice(0, 120),
          bio: resume?.summary ?? bio,
        },
        1
      );
    }
    case "experience": {
      if (!resume || resume.experience.length === 0) return empty({ title: fallbackLabel, items: [] });
      const items = resume.experience.map((e, i) => ({
        id: `exp_${i}`,
        year: e.duration ?? "",
        title: e.title + (e.company ? ` — ${e.company}` : ""),
        description: e.description,
        stats: null as string | null,
        imageUrl: null as string | null,
      }));
      return withData({ title: fallbackLabel, items }, items.length);
    }
    case "skills": {
      if (!resume || resume.skills.length === 0) return empty({ title: fallbackLabel, services: [] });
      // RCCF-PRELAUNCH-12D: intelligent curation — deterministic ranking using existing evidence only, no LLM
      const curated = curateSkills(resume.skills);
      const services = curated.slice(0, 15).map((s, i) => ({
        id: `skill_${i}`,
        title: s,
        description: null as string | null,
        price: 0,
        category: null as string | null,
      }));
      const remainingCount = resume.skills.length - services.length;
      return withData(
        {
          title: fallbackLabel,
          services,
          // Expose remaining count for presentation layer if it supports "more" indicator
          remainingCount: remainingCount > 0 ? remainingCount : 0,
          totalCount: resume.skills.length,
        },
        services.length
      );
    }
    case "projects":
    case "portfolio": {
      if (!resume || resume.projects.length === 0) {
        // For creator/gallery fallback, also check if source has any content? For now hide if no projects
        return empty({ title: fallbackLabel, images: [] });
      }
      const images = resume.projects.map((p, i) => ({
        id: `proj_${i}`,
        title: p.name,
        description: p.description,
        imageUrl: "", // no asset, but renderer can handle missing
        mediaType: "image" as const,
        videoUrl: null as string | null,
        altText: p.name,
        isFeatured: false,
      }));
      return withData({ title: fallbackLabel, images, layout: "grid", columns: 3 }, images.length);
    }
    case "education":
    case "achievements": {
      if (!resume || (resume.education.length === 0 && resume.certifications.length === 0)) {
        return empty({ title: fallbackLabel, items: [] });
      }
      const eduItems = resume.education.map((e, i) => ({
        id: `edu_${i}`,
        year: e.years ?? "",
        title: e.degree + (e.institution ? ` — ${e.institution}` : ""),
        description: e.raw,
        stats: null as string | null,
        imageUrl: null as string | null,
      }));
      const certItems = resume.certifications.map((c, i) => ({
        id: `cert_${i}`,
        year: "",
        title: c,
        description: c,
        stats: null as string | null,
        imageUrl: null as string | null,
      }));
      const items = [...eduItems, ...certItems];
      return withData({ title: fallbackLabel, items }, items.length);
    }
    case "github":
    case "links":
    case "community":
    case "sponsors":
    case "events": {
      const social = source?.socialLinks ?? source?.links ?? [];
      const resumeSocial = resume?.socialLinks ?? [];
      const all = [...social, ...resumeSocial.map((l) => l.url)];
      // RCCF-PRELAUNCH-14A P2: filter invalid + manual.com at canonical binder source
      const filtered = all.filter((u) => {
        if (!u || typeof u !== "string") return false;
        if (/\s/.test(u)) return false;
        if (u.length > 2048 || u !== u.trim()) return false;
        try {
          const parsed = new URL(u);
          if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
          if (parsed.hostname.toLowerCase() === "manual.com" || parsed.hostname.toLowerCase().endsWith(".manual.com")) return false;
        } catch { return false; }
        return true;
      });
      // Dedupe
      const uniq = Array.from(new Set(filtered.filter(Boolean))).slice(0, 6);
      if (uniq.length === 0 && hasSource) return empty({ title: fallbackLabel, items: [] });
      const items = uniq.map((url) => ({ url, label: url }));
      // For hasSource false (legacy without source), keep hasData true to preserve backward compat
      const hasData = hasSource ? uniq.length > 0 : true;
      return { props: { title: fallbackLabel, items, showIcons: items.length > 0 }, hasData, itemCount: items.length };
    }
    case "gallery":
    case "transformations": {
      // Gallery where available: check resume.projects as work, or social platforms
      if (resume && resume.projects.length > 0) {
        const images = resume.projects.slice(0, 8).map((p, i) => ({
          id: `gallery_${i}`,
          title: p.name,
          description: p.description,
          imageUrl: "",
          mediaType: "image" as const,
          videoUrl: null,
          altText: p.name,
          isFeatured: false,
        }));
        return withData({ title: fallbackLabel, images, layout: "grid", columns: 3 }, images.length);
      }
      // No structured gallery data → hide for 12C when source present
      if (hasSource) return empty({ title: fallbackLabel, images: [] });
      return withData({ title: fallbackLabel, images: [], layout: "grid", columns: 3 }, 0);
    }
    case "products":
    case "merchandise": {
      // Products where available: check for products-like bio keywords? For now hide when no structured products
      // ContentSource has no products array; so hide unless we have merch signal in bio with "shop" etc.
      // We treat products as hidden for 12C when no data, to satisfy "do not emit empty products"
      if (hasSource) {
        const txt = bio.toLowerCase();
        const hasMerchSignal = txt.includes("shop") || txt.includes("store") || txt.includes("product") || txt.includes("merch");
        if (!hasMerchSignal) return empty({ title: fallbackLabel, products: [] });
        // If signal present but no structured products, we could still hide? For 12C we hide to avoid empty
        return empty({ title: fallbackLabel, products: [] });
      }
      return withData({ title: fallbackLabel, products: [], layout: "grid", columns: 3 }, 0);
    }
    case "testimonials": {
      // No testimonials data source in ContentSource; hide unless review signal with structured data which we don't have
      // For 12C, always hide (no fabrication)
      if (hasSource) return empty({ title: fallbackLabel, items: [] });
      return withData({ title: fallbackLabel, items: [] }, 0);
    }
    case "media":
    case "blog":
    case "resources": {
      // Media where available: check platforms youtube/instagram/tiktok
      const hasMediaPlatform = !!source && (source.links.join(" ").toLowerCase().includes("youtube") || source.links.join(" ").toLowerCase().includes("instagram"));
      if (hasSource && !hasMediaPlatform) return empty({ title: fallbackLabel, feed: [] });
      return withData({ title: fallbackLabel, feed: [] }, hasMediaPlatform ? 1 : 0);
    }
    case "menu": {
      const items = parseMenuItems(bio);
      if (items.length === 0) return empty({ title: fallbackLabel, items: [] });
      const mapped = items.map((name) => ({ url: "#", label: name }));
      return withData({ title: fallbackLabel, items: mapped }, mapped.length);
    }
    case "location": {
      const loc = source?.location || resume?.location || null;
      if (!loc) return empty({ title: fallbackLabel, email: "", phone: "", address: "" });
      return withData({ title: fallbackLabel, address: loc, location: loc }, 1);
    }
    case "hours": {
      const hasHours = bio.toLowerCase().includes("hours") || bio.toLowerCase().includes("open") || (resume?.location ? true : false);
      // For 12C, require explicit hours signal; otherwise hide
      const txt = bio.toLowerCase();
      const has = txt.includes("hours") || txt.includes("open") || txt.includes("timings");
      if (!has) return empty({ title: fallbackLabel, items: [] });
      return withData({ title: fallbackLabel, hours: bio.slice(0, 200), items: [{ q: "Hours", a: bio.slice(0, 200) }] }, 1);
    }
    case "reservations":
    case "booking": {
      const hasRes = bio.toLowerCase().includes("reservation") || bio.toLowerCase().includes("book a table") || bio.toLowerCase().includes("booking");
      if (!hasRes) return empty({ title: fallbackLabel, email: "", phone: "" });
      return withData({ title: fallbackLabel, cta: "Reserve Table", email: "", phone: "" }, 1);
    }
    case "contact": {
      // Contact always has data (at least form)
      return withData({ title: fallbackLabel, email: "", phone: "" }, 1);
    }
    case "footer": {
      const name = source?.displayName || source?.username || "Creator";
      return withData({ copyright: `© ${new Date().getFullYear()} ${name}` }, 1);
    }
    case "newsletter": {
      return withData({ title: fallbackLabel, placeholder: "Your email", buttonText: "Subscribe" }, 1);
    }
    case "faq": {
      return withData({ title: fallbackLabel, items: [] }, 1);
    }
    case "courses": {
      return withData({ title: fallbackLabel, courses: [] }, 1);
    }
    case "services": {
      if (resume && resume.skills.length > 0) {
        const services = resume.skills.slice(0, 6).map((s, i) => ({ id: `svc_${i}`, title: s, description: null }));
        return withData({ title: fallbackLabel, services }, services.length);
      }
      return withData({ title: fallbackLabel, services: [] }, 0);
    }
    case "games": {
      return withData({ title: fallbackLabel, games: [] }, 0);
    }
    case "timeline": {
      if (resume && resume.experience.length > 0) {
        const items = resume.experience.map((e, i) => ({
          id: `tl_${i}`,
          year: e.duration ?? "",
          title: e.title,
          description: e.description,
          stats: null,
          imageUrl: null,
        }));
        return withData({ title: fallbackLabel, items }, items.length);
      }
      return empty({ title: fallbackLabel, items: [] });
    }
    default:
      return withData({ title: fallbackLabel }, 1);
  }
}
