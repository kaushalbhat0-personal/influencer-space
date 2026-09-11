/**
 * Content Binder — RCCF-PRELAUNCH-12C / 15B
 * Deterministic, config-driven mapping of structured source data into existing section contracts.
 * No new data structures when existing contract can represent; never fabricate claims.
 * 15B: binds real creator/local-business content only when structured evidence exists.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { Archetype } from "@/lib/generation/blueprint/config";

export interface BinderResult {
  props: Record<string, unknown>;
  hasData: boolean; // false → section must be hidden (do not emit empty)
  itemCount: number;
}

const COMMUNITY_DOMAINS = ["discord.com", "discord.gg", "t.me", "telegram.me", "telegram.org", "whatsapp.com", "wa.me", "chat.whatsapp.com"];
const MEDIA_DOMAINS = ["youtube.com", "youtu.be", "instagram.com", "instagr.am", "tiktok.com", "twitch.tv", "spotify.com"];

function isCommunityUrl(url: string): boolean {
  const low = url.toLowerCase();
  return COMMUNITY_DOMAINS.some((d) => low.includes(d));
}

function isMediaUrl(url: string): boolean {
  const low = url.toLowerCase();
  return MEDIA_DOMAINS.some((d) => low.includes(d));
}

function isValidUrl(u: string): boolean {
  if (!u || typeof u !== "string") return false;
  if (/\s/.test(u)) return false;
  if (u.length > 2048 || u !== u.trim()) return false;
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (parsed.hostname.toLowerCase() === "manual.com" || parsed.hostname.toLowerCase().endsWith(".manual.com")) return false;
  } catch { return false; }
  return true;
}

function parseMenuItems(bio: string): string[] {
  const lower = bio.toLowerCase();
  const idx = lower.indexOf("menu:");
  if (idx === -1) return [];
  const after = bio.slice(idx + 5);
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

function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (!isValidUrl(u)) continue;
    const low = u.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    out.push(u);
  }
  return out;
}

/**
 * Deterministic skill curation — prefer high-signal skills using existing evidence only.
 */
const HIGH_SIGNAL_SKILL_ORDER = [
  "typescript","python","dart","sql","javascript",
  "react","next.js","flutter","tailwind","framer motion","gsap",
  "zustand","tanstack query","react hook form","zod",
  "fastapi","flask","node.js","next.js server actions",
  "postgresql","supabase","prisma","drizzle","sqlite","sqlalchemy",
  "openrouter","prompt engineering","ocr",
  "nextauth","better auth","jwt","rbac","rls",
  "razorpay",
  "vitest","playwright","pytest",
  "vercel","github actions","docker","esbuild",
  "clean architecture","domain-driven design","ddd","repository pattern","multi-tenant saas","cqrs","event-driven",
];

function skillPriority(skill: string): number {
  const lower = skill.toLowerCase();
  for (let i = 0; i < HIGH_SIGNAL_SKILL_ORDER.length; i++) {
    const key = HIGH_SIGNAL_SKILL_ORDER[i];
    if (lower.includes(key) || key.includes(lower)) return i;
    if (lower === key) return i;
  }
  return 999;
}

function curateSkills(skills: string[]): string[] {
  const scored = skills.map((s, idx) => ({ skill: s, priority: skillPriority(s), originalIndex: idx }));
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
  const hasSource = !!source;
  const bio = source?.bio ?? "";
  const resume = source?.resume ?? null;

  const empty = (props: Record<string, unknown>): BinderResult => ({ props, hasData: false, itemCount: 0 });
  const withData = (props: Record<string, unknown>, count: number): BinderResult => ({ props, hasData: count > 0, itemCount: count });

  switch (sectionId) {
    case "hero": {
      const name = source?.displayName || source?.username || fallbackLabel || "Creator";
      return withData({ title: name, name, tagline: resume?.summary?.slice(0, 120) ?? bio.slice(0, 120), bio: resume?.summary ?? bio }, 1);
    }
    case "experience": {
      if (!resume || resume.experience.length === 0) return empty({ title: fallbackLabel, items: [] });
      const items = resume.experience.map((e, i) => ({ id: `exp_${i}`, year: e.duration ?? "", title: e.title + (e.company ? ` — ${e.company}` : ""), description: e.description, stats: null as string | null, imageUrl: null as string | null }));
      return withData({ title: fallbackLabel, items }, items.length);
    }
    case "skills": {
      if (!resume || resume.skills.length === 0) return empty({ title: fallbackLabel, services: [] });
      const curated = curateSkills(resume.skills);
      const services = curated.slice(0, 15).map((s, i) => ({ id: `skill_${i}`, title: s, description: null as string | null, price: 0, category: null as string | null }));
      const remainingCount = resume.skills.length - services.length;
      return withData({ title: fallbackLabel, services, remainingCount: remainingCount > 0 ? remainingCount : 0, totalCount: resume.skills.length }, services.length);
    }
    case "projects":
    case "portfolio": {
      if (!resume || resume.projects.length === 0) return empty({ title: fallbackLabel, images: [] });
      const images = resume.projects.map((p, i) => ({ id: `proj_${i}`, title: p.name, description: p.description, imageUrl: "", mediaType: "image" as const, videoUrl: null as string | null, altText: p.name, isFeatured: false }));
      return withData({ title: fallbackLabel, images, layout: "grid", columns: 3 }, images.length);
    }
    case "education":
    case "achievements": {
      if (!resume || (resume.education.length === 0 && resume.certifications.length === 0)) return empty({ title: fallbackLabel, items: [] });
      const eduItems = resume.education.map((e, i) => ({ id: `edu_${i}`, year: e.years ?? "", title: e.degree + (e.institution ? ` — ${e.institution}` : ""), description: e.raw, stats: null as string | null, imageUrl: null as string | null }));
      const certItems = resume.certifications.map((c, i) => ({ id: `cert_${i}`, year: "", title: c, description: c, stats: null as string | null, imageUrl: null as string | null }));
      const items = [...eduItems, ...certItems];
      return withData({ title: fallbackLabel, items }, items.length);
    }
    case "github":
    case "links":
    case "sponsors":
    case "events": {
      // For generic links: bind any valid socialLinks/links (deduped)
      const social = source?.socialLinks ?? source?.links ?? [];
      const resumeSocial = resume?.socialLinks ?? [];
      const all = [...social, ...resumeSocial.map((l) => l.url)];
      const uniq = dedupeUrls(all).slice(0, 6);
      if (uniq.length === 0 && hasSource) return empty({ title: fallbackLabel, items: [] });
      const items = uniq.map((url) => ({ url, label: url }));
      const hasData = hasSource ? uniq.length > 0 : true;
      return { props: { title: fallbackLabel, items, showIcons: items.length > 0 }, hasData, itemCount: items.length };
    }
    case "community": {
      // 15B: only real community evidence (discord/telegram/whatsapp)
      const social = source?.socialLinks ?? source?.links ?? [];
      const resumeSocial = resume?.socialLinks ?? [];
      const all = [...social, ...resumeSocial.map((l) => l.url)];
      const communityUrls = dedupeUrls(all).filter(isCommunityUrl).slice(0, 6);
      if (communityUrls.length === 0 && hasSource) return empty({ title: fallbackLabel, items: [] });
      const items = communityUrls.map((url) => ({ url, label: url }));
      const hasData = hasSource ? communityUrls.length > 0 : items.length > 0;
      return { props: { title: fallbackLabel, items, showIcons: items.length > 0 }, hasData, itemCount: items.length };
    }
    case "gallery":
    case "transformations": {
      // 15B: prefer structured gallery with real assets
      if (source?.gallery && source.gallery.length > 0) {
        const real = source.gallery.filter((g) => g.imageUrl && g.imageUrl.trim().length > 0);
        if (real.length > 0) {
          const images = real.slice(0, 12).map((g, i) => ({ id: g.id || `gallery_${i}`, title: g.title || "", description: g.description ?? "", imageUrl: g.imageUrl, mediaType: g.mediaType ?? "image", videoUrl: g.videoUrl ?? null, altText: g.altText ?? g.title ?? "", isFeatured: false }));
          return withData({ title: fallbackLabel, images, layout: "grid", columns: 3 }, images.length);
        }
      }
      // Fallback to resume projects only if they could provide gallery-like visuals (still text-only, but keep for professional)
      // For creator, require real assets: if no gallery, check media feed platforms?
      // If source has contentFeed/gallery alternative with platforms, we treat that as media not gallery.
      // Hide if no real assets
      if (hasSource) return empty({ title: fallbackLabel, images: [] });
      return withData({ title: fallbackLabel, images: [], layout: "grid", columns: 3 }, 0);
    }
    case "products":
    case "merchandise": {
      // 15B: bind only when structured product data exists; do not require keyword
      const prods = source?.products ?? [];
      if (prods.length > 0) {
        const products = prods.map((p, i) => ({
          id: p.id || `prod_${i}`,
          name: p.name,
          description: p.description ?? null,
          price: p.price ?? 0,
          imageUrl: p.imageUrl ?? null,
          images: p.imageUrl ? [p.imageUrl] : [],
          slug: p.slug ?? p.name.toLowerCase().replace(/\s+/g, "-"),
          isFeatured: false,
          isActive: true,
          category: p.category ?? null,
          url: p.url ?? null,
        }));
        return withData({ title: fallbackLabel, products, layout: "grid", columns: 3 }, products.length);
      }
      // No structured products → hide (never invent)
      if (hasSource) return empty({ title: fallbackLabel, products: [] });
      return withData({ title: fallbackLabel, products: [], layout: "grid", columns: 3 }, 0);
    }
    case "testimonials": {
      // 15B: only when actual testimonial/review evidence exists
      const t = source?.testimonials ?? [];
      if (t.length > 0) {
        const items = t.map((it, i) => ({ id: `t_${i}`, author: it.author, content: it.content, rating: it.rating ?? 5, role: it.role ?? null, avatarUrl: it.avatarUrl ?? null }));
        // Also expose as items for layoutEngine fallback
        return withData({ title: fallbackLabel, items, testimonials: items }, items.length);
      }
      if (hasSource) return empty({ title: fallbackLabel, items: [] });
      return withData({ title: fallbackLabel, items: [] }, 0);
    }
    case "media":
    case "blog":
    case "resources": {
      // 15B: bind from contentFeed or content items + links that are media platforms; also gallery media
      const feed = source?.contentFeed ?? [];
      if (feed.length > 0) {
        const validFeed = feed.filter((f) => f.url && isValidUrl(f.url));
        if (validFeed.length > 0) return withData({ title: fallbackLabel, feed: validFeed }, validFeed.length);
      }
      // Fallback: derive from links/socialLinks/content URLs that are media platforms
      const allLinks = [...(source?.socialLinks ?? []), ...(source?.links ?? []), ...(source?.content.map((c) => c.url).filter(Boolean) ?? [])];
      const mediaLinks = dedupeUrls(allLinks).filter(isMediaUrl);
      if (mediaLinks.length > 0) {
        const feed2 = mediaLinks.map((url, i) => ({ id: `media_${i}`, platform: "media", url, thumbnailUrl: null, caption: url }));
        return withData({ title: fallbackLabel, feed: feed2 }, feed2.length);
      }
      // Also check content items existence (post/video) as media evidence
      if (source?.content && source.content.length > 0) {
        const feed3 = source.content.filter((c) => c.url && isValidUrl(c.url)).map((c) => ({ id: c.id, platform: c.type, url: c.url, thumbnailUrl: null, caption: c.text.slice(0, 80) }));
        if (feed3.length > 0) return withData({ title: fallbackLabel, feed: feed3 }, feed3.length);
      }
      if (hasSource) return empty({ title: fallbackLabel, feed: [] });
      return withData({ title: fallbackLabel, feed: [] }, 0);
    }
    case "menu": {
      // RCCF-PILOT-FIX-02: Menu only when structured menuItems evidence exists.
      // Structured = menuItems array OR explicit "Menu:" in bio (parsed). No products fallback for location-only.
      const menu = source?.menuItems ?? [];
      if (menu.length > 0) {
        const products = menu.map((m, i) => ({
          id: `menu_${i}`,
          name: m.name,
          description: m.description ?? null,
          price: m.price ?? 0,
          imageUrl: m.imageUrl ?? null,
          images: m.imageUrl ? [m.imageUrl] : [],
          slug: m.name.toLowerCase().replace(/\s+/g, "-"),
          isFeatured: false,
          isActive: true,
          category: m.category ?? null,
        }));
        return withData({ title: fallbackLabel, products, layout: "grid", columns: 3 }, products.length);
      }
      if (hasSource) {
        const parsed = parseMenuItems(bio);
        if (parsed.length > 0) {
          const products = parsed.map((name, i) => ({
            id: `menu_${i}`,
            name,
            description: null as string | null,
            price: 0,
            imageUrl: null as string | null,
            images: [] as string[],
            slug: name.toLowerCase().replace(/\s+/g, "-"),
            isFeatured: false,
            isActive: true,
            category: null as string | null,
          }));
          return withData({ title: fallbackLabel, products, layout: "grid", columns: 3 }, products.length);
        }
        return empty({ title: fallbackLabel, products: [] });
      }
      return withData({ title: fallbackLabel, products: [], layout: "grid", columns: 3 }, 0);
    }
    case "location": {
      const loc = source?.location || resume?.location || null;
      const gmaps = source?.googleMapsUrl ?? null;
      // Only show if we have real location or maps url (not prose mentions)
      if (!loc && !gmaps) return empty({ title: fallbackLabel, email: "", phone: "", address: "" });
      // Validate gmaps url if present
      const validGmaps = gmaps && isValidUrl(gmaps) ? gmaps : null;
      return withData({ title: fallbackLabel, address: loc ?? "", location: loc ?? "", googleMapsUrl: validGmaps, mapsUrl: validGmaps }, 1);
    }
    case "hours": {
      const h = source?.hours ?? null;
      if (h && h.trim().length > 0) {
        return withData({ title: fallbackLabel, hours: h, items: [{ q: "Hours", a: h }, { question: "Hours", answer: h, category: "hours" }] }, 1);
      }
      // Batch B: removed bio.slice fallback — hours must be structured; no fabrication
      if (hasSource) return empty({ title: fallbackLabel, items: [] });
      return withData({ title: fallbackLabel, items: [] }, 0);
    }
    case "reservations":
    case "booking": {
      const r = source?.reservationUrl ?? null;
      if (r && isValidUrl(r)) return withData({ title: fallbackLabel, cta: "Reserve Table", email: "", phone: "", reservationUrl: r, url: r }, 1);
      // Batch B: require valid reservationUrl — keyword-only must not create empty CTA destination
      if (hasSource) return empty({ title: fallbackLabel, email: "", phone: "" });
      return withData({ title: fallbackLabel, email: "", phone: "" }, 0);
    }
    case "contact": {
      const loc = source?.location || resume?.location || null;
      const gmaps = source?.googleMapsUrl ?? null;
      const hasContactEvidence = !!(loc || gmaps || (source?.socialLinks?.length ?? 0) > 0 || (source?.links?.length ?? 0) > 0);
      if (!hasContactEvidence && hasSource) return empty({ title: fallbackLabel, email: "", phone: "" });
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
        const items = resume.experience.map((e, i) => ({ id: `tl_${i}`, year: e.duration ?? "", title: e.title, description: e.description, stats: null, imageUrl: null }));
        return withData({ title: fallbackLabel, items }, items.length);
      }
      return empty({ title: fallbackLabel, items: [] });
    }
    default:
      return withData({ title: fallbackLabel }, 1);
  }
}
