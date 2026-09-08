/**
 * Storefront Composition Engine — IMPLEMENTATION-38.
 *
 * Turns the intelligence Website Blueprint into the canonical Storefront
 * Composition that seeds the Builder Aggregate. Deterministic, pure,
 * serializable, versioned. It composes CONFIGURATION only — no JSX/components/
 * HTML. The Builder, LayoutEngine, Theme Runtime, ComponentRegistry, Media
 * Runtime and Publishing Runtime remain the renderers.
 *
 * Content mapping rule: never fabricate. Identity/evidence/acquired data fill
 * section fields; everything else stays empty.
 *
 * RCCF-PRELAUNCH-12C: ContentBinder + HeadingRegistry + VariantHintResolver
 * + Dynamic Navigation — all deterministic, config-driven, presentation-only.
 */
import { createHash } from "crypto";
import { BRAND } from "@/lib/marketing/messaging";
import type { WebsiteBlueprint } from "@/lib/generation/blueprint/types";
import type { EvidenceIntelligence } from "@/lib/generation/intelligence/evidence/types";
import type { RelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import { resolveHeroMediaForRuntime } from "@/lib/media/hero-media";
import { SECTION_MAP, HERO_VARIANT_BY_ENTITY, themeIdForFamily } from "./config";
import type { StorefrontComposition, SectionComposition, BuilderDraft } from "./types";
import { bindSection } from "./binder";
import { resolveHeading } from "./headings";
import { resolveVariant } from "./variants";
import { isValidHttpUrl } from "@/lib/validation/url";

export const COMPOSITION_VERSION = 3;

/**
 * RCCF-67.3 — sections fully removed from the product (Pricing was never wired
 * to a data source). Blueprint sections referencing them are DROPPED at
 * composition (decision "hidden") so no unregistered moduleId is ever emitted
 * into a generated site.
 */
const REMOVED_SECTIONS = new Set(["pricing"]);

export interface CompositionInput {
  blueprint: WebsiteBlueprint;
  identity: {
    entityType: string | null;
    name: string | null;
    username: string | null;
    bio: string | null;
    tagline: string | null;
    avatarUrl: string | null;
    socialLinks: string[];
    subdomain: string;
  };
  evidence: EvidenceIntelligence;
  relationships: RelationshipGraph;
  /** RCCF-PRELAUNCH-12C: structured source for binder (optional for backward compat) */
  source?: ContentSource | null;
}

function isBlockedSocialUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (host === "manual.com" || host.endsWith(".manual.com")) return true;
  } catch { return true; }
  return false;
}
function heroProps(input: CompositionInput, cta: string): Record<string, unknown> {
  const name = input.identity.name ?? input.identity.username ?? "Creator";
  const heroMedia = resolveHeroMediaForRuntime({
    backgroundUrl: input.identity.avatarUrl,
    posterUrl: input.identity.avatarUrl,
  });
  const platform = input.relationships.platforms[0] ?? null;
  const cleanSocial = input.identity.socialLinks.filter((u) => isValidHttpUrl(u) && !isBlockedSocialUrl(u));
  return {
    title: name,
    name,
    tagline: input.identity.tagline ?? input.evidence.primaryNiche ?? "",
    bio: input.identity.bio ?? "",
    cta,
    ctaLink: "#",
    profilePictureUrl: input.identity.avatarUrl ?? "",
    socialLinks: cleanSocial.slice(0, 4).map((url) => ({ url })),
    ...(platform ? { liveBadgeText: "Live", showLiveBadge: false } : {}),
    resolvedMedia: heroMedia.resolvedMedia,
    mediaType: heroMedia.mediaType,
    mediaUrl: heroMedia.mediaUrl,
    mediaPoster: heroMedia.mediaPoster,
    rendererDecision: heroMedia.rendererDecision,
    alignment: "center",
    overlay: true,
    showLiveBadge: false,
  };
}

function contentPropsFor(sectionId: string, input: CompositionInput, label: string): Record<string, unknown> {
  switch (sectionId) {
    case "hero":
      return heroProps(input, input.blueprint.cta.primary);
    case "links":
    case "sponsors":
    case "github":
    case "community":
    case "events": {
      const links = input.identity.socialLinks.filter((u) => isValidHttpUrl(u) && !isBlockedSocialUrl(u)).slice(0, 6).map((url) => ({ url, label: url }));
      return { title: label, items: links, showIcons: links.length > 0 };
    }
    case "footer":
      return { copyright: `© ${new Date().getFullYear()} ${input.identity.name ?? BRAND.name}` };
    case "newsletter":
      return { title: label, placeholder: "Your email", buttonText: "Subscribe" };
    case "faq":
    case "hours":
    case "nutrition":
      return { title: label, items: [] };
    case "products":
    case "merchandise":
      return { title: label, layout: "grid", columns: 3, products: [] };
    case "gallery":
    case "transformations":
    case "projects":
    case "portfolio":
      return { title: label, layout: "grid", columns: 3, images: [] };
    case "timeline":
    case "achievements":
    case "experience":
    case "education":
      return { title: label, items: [] };
    case "testimonials":
      return { title: label, items: [] };
    case "courses":
      return { title: label, courses: [] };
    case "pricing":
      return { title: label, plans: [] };
    case "services":
    case "skills":
      return { title: label, services: [] };
    case "contact":
    case "reservations":
    case "booking":
    case "location":
      return { title: label, email: "", phone: "" };
    case "media":
    case "blog":
    case "resources":
      return { title: label, feed: [] };
    case "games":
      return { title: label, games: [] };
    default:
      return { title: label };
  }
}

function composeSection(plan: SectionComposition, input: CompositionInput): SectionComposition {
  const label = plan.label;
  return { ...plan, props: contentPropsFor(plan.id, input, label), reason: `${plan.mapping} mapping for blueprint section "${plan.id}"` };
}

function buildArtifact(
  compositions: SectionComposition[],
  blueprint: WebsiteBlueprint,
  themeId: string,
  enrichedNavigation?: Array<{ id: string; label: string; href: string }>
): BuilderDraft {
  const nav = enrichedNavigation ?? blueprint.navigation.map((n) => ({ id: n.id, label: n.label, href: n.href }));
  const artifact = {
    sections: compositions
      .filter((c) => c.decision !== "hidden")
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, type: c.type, props: c.props })),
    navigation: nav.map((n) => ({ id: n.id, label: n.label, href: n.href })),
    theme: themeId,
    metadata: {
      source: "intelligence-blueprint",
      entity: blueprint.entity,
      blueprintVersion: blueprint.version,
      compositionVersion: COMPOSITION_VERSION,
    },
  };

  const pages = [];
  const homeSections = artifact.sections
    .map((s, i) => ({
      id: `section_${s.id}`,
      name: s.type.charAt(0).toUpperCase() + s.type.slice(1),
      order: i,
      visible: true,
      locked: false,
      slots: [{ id: `slot_${s.id}_0`, moduleId: SECTION_MAP[s.id]?.moduleId ?? "hero.default", parentId: null, order: 0, visible: true, locked: false, config: s.props }],
    }));
  pages.push({ id: "page_home", name: "Home", slug: "/", order: 1, isHome: true, theme: themeId, sections: homeSections });

  if (artifact.sections.some((s) => s.type === "products")) {
    const productSections = artifact.sections
      .filter((s) => s.type === "products")
      .map((s, i) => ({
        id: `section_${s.id}`,
        name: "Products",
        order: i,
        visible: true,
        locked: false,
        slots: [{ id: `slot_${s.id}_0`, moduleId: SECTION_MAP[s.id]?.moduleId ?? "products.grid", parentId: null, order: 0, visible: true, locked: false, config: s.props }],
      }));
    pages.push({ id: "page_products", name: "Products", slug: "/products", order: 2, isHome: false, theme: themeId, sections: productSections });
  }

  return { artifact, pages };
}

function enrichNavigation(
  blueprintNav: Array<{ id: string; label: string; href: string; order: number }>,
  source: ContentSource | null | undefined,
  archetype: string | null | undefined
): Array<{ id: string; label: string; href: string; order: number }> {
  if (!source) return blueprintNav.slice(0, 6);
  const base = [...blueprintNav].sort((a, b) => a.order - b.order);
  const existingHrefs = new Set(base.map((n) => n.href.toLowerCase()));
  const existingIds = new Set(base.map((n) => n.id));

  // Collect candidate external links from source
  const allLinks = [...(source.socialLinks ?? []), ...(source.links ?? []), ...(source.resume?.socialLinks.map((l) => l.url) ?? [])];
  // Dedupe and filter valid
  const seen = new Set<string>();
  const candidates: Array<{ label: string; href: string; platform: string }> = [];
  for (const url of allLinks) {
    if (!isValidHttpUrl(url) || isBlockedSocialUrl(url)) continue;
    const low = url.toLowerCase();
    if (seen.has(low)) continue;
    seen.add(low);
    if (existingHrefs.has(low)) continue;
    const urlLower = low;
    let platform = "other";
    if (urlLower.includes("github.com")) platform = "github";
    else if (urlLower.includes("linkedin.com")) platform = "linkedin";
    else if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) platform = "youtube";
    else if (urlLower.includes("instagram.com")) platform = "instagram";
    else if (urlLower.includes("tiktok.com")) platform = "tiktok";
    else if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) platform = "twitter";
    else if (urlLower.includes("twitch.tv")) platform = "twitch";
    else if (urlLower.includes("spotify.com")) platform = "spotify";
    else if (urlLower.includes("discord.com") || urlLower.includes("discord.gg")) platform = "discord";
    let label = platform.charAt(0).toUpperCase() + platform.slice(1);
    if (platform === "other") {
      try {
        const u = new URL(url);
        label = u.hostname.replace(/^www\./, "").split(".")[0] ?? "Link";
        label = label.charAt(0).toUpperCase() + label.slice(1);
      } catch {
        label = "Link";
      }
    }
    candidates.push({ label, href: url, platform });
  }

  // Archetype priority ordering
  const priority: Record<string, string[]> = {
    professional_resume: ["github", "linkedin", "other"],
    creator: ["youtube", "instagram", "tiktok", "twitch", "spotify", "discord", "other"],
    local_business: ["instagram", "other"],
    default: ["other"],
  };
  const order = priority[(archetype as string) ?? "default"] ?? priority.default;
  candidates.sort((a, b) => {
    const ia = order.indexOf(a.platform);
    const ib = order.indexOf(b.platform);
    const va = ia === -1 ? 999 : ia;
    const vb = ib === -1 ? 999 : ib;
    if (va !== vb) return va - vb;
    return a.href.localeCompare(b.href);
  });

  // Build enriched: start with base, add candidates until cap 6
  const enriched = [...base];
  const cap = 6;
  let nextOrder = Math.max(0, ...base.map((n) => n.order)) + 10;
  for (const c of candidates) {
    if (enriched.length >= cap) break;
    // Avoid duplicate label/href
    if (enriched.some((n) => n.href.toLowerCase() === c.href.toLowerCase())) continue;
    // Avoid duplicate platform already represented as section? e.g., github section already covers github; but we still allow external link as nav?
    // For 12C, professional should surface GitHub/LinkedIn as nav even if github section exists — but ensure not duplicate href
    enriched.push({ id: `nav_${c.platform}_${enriched.length}`, label: c.label, href: c.href, order: nextOrder++ });
  }
  // Deterministic sort by order, then slice cap
  enriched.sort((a, b) => a.order - b.order);
  const deduped: typeof enriched = [];
  const hrefSet = new Set<string>();
  for (const n of enriched) {
    const low = n.href.toLowerCase();
    if (hrefSet.has(low)) continue;
    hrefSet.add(low);
    deduped.push(n);
  }
  return deduped.slice(0, 6);
}

/** Pure, deterministic, versioned composition. */
export function composeStorefront(input: CompositionInput): StorefrontComposition {
  const blueprint = input.blueprint;
  const themeFamily = blueprint.theme.family;
  const themeId = themeIdForFamily(themeFamily);
  const archetype = (blueprint.evidence as unknown as { archetype?: string | null })?.archetype ?? null;
  const heroVariant = HERO_VARIANT_BY_ENTITY[blueprint.entity ?? ""] ?? "hero.default";
  const source = input.source ?? null;

  const unmapped: string[] = [];
  const compositions: SectionComposition[] = blueprint.sections.map((plan) => {
    if (plan.decision === "hidden") {
      return { id: plan.id, label: plan.label, decision: plan.decision, type: "", moduleId: "", order: plan.order, props: {}, mapping: "closest", reason: "hidden — not composed" };
    }
    if (REMOVED_SECTIONS.has(plan.id)) {
      return { id: plan.id, label: plan.label, decision: "hidden", type: "", moduleId: "", order: plan.order, props: {}, mapping: "closest", reason: "removed section — dropped" };
    }
    const mapping = SECTION_MAP[plan.id];
    if (!mapping) {
      unmapped.push(plan.id);
      return { id: plan.id, label: plan.label, decision: plan.decision, type: "links", moduleId: "links.default", order: plan.order, props: {}, mapping: "closest", reason: `no supported component — mapped to links` };
    }

    // RCCF-PRELAUNCH-12C: Binder + Heading + Variant
    let moduleId = plan.id === "hero" ? heroVariant : mapping.moduleId;
    let props: Record<string, unknown>;
    let hasData = true;
    let itemCount = 0;
    let reason = `${mapping.mapping} mapping for blueprint section "${plan.id}"`;

    if (source) {
      const binder = bindSection(plan.id, source, archetype as import("@/lib/generation/blueprint/config").Archetype | null, plan.label);
      hasData = binder.hasData;
      itemCount = binder.itemCount;
      props = { ...binder.props };
      // Hide empty data sections (critical rule) — only when source present (preserve legacy without source)
      if (!hasData) {
        return {
          id: plan.id,
          label: plan.label,
          decision: "hidden" as const,
          type: mapping.type,
          moduleId: mapping.moduleId,
          order: plan.order,
          props: {},
          mapping: mapping.mapping,
          reason: `hidden — binder produced 0 items for "${plan.id}"`,
        };
      }
      // Heading intelligence — override title (presentation-only) except hero which keeps name
      if (plan.id !== "hero") {
        const heading = resolveHeading(archetype, plan.id, undefined, source);
        props.title = heading;
        // Also ensure label reflects heading for diagnostics
        reason += `; heading:${heading}`;
      } else {
        // Hero heading stays as identity name, but we still record heading resolver for consistency
        const heroHeading = resolveHeading(archetype, plan.id, undefined, source);
        void heroHeading;
      }
      // Variant intelligence — resolve variant based on itemCount and real assets (12D: do not bento text-only projects)
      const hasRealAssets =
        Array.isArray((props as Record<string, unknown>).images) &&
        ((props as Record<string, unknown>).images as Array<Record<string, unknown>>).some((im) => typeof im.imageUrl === "string" && (im.imageUrl as string).length > 0);
      const variant = resolveVariant(archetype, plan.id, moduleId, itemCount, undefined, hasRealAssets);
      if (variant.moduleId !== moduleId) {
        moduleId = variant.moduleId;
        reason += `; variant:${variant.moduleId} (${variant.reason})`;
      }
      // Merge hero media props when hero
      if (plan.id === "hero") {
        const heroBase = heroProps(input, input.blueprint.cta.primary);
        // Binder hero already has title/name/bio but heroProps has media; merge with binder taking precedence for title/bio?
        props = { ...heroBase, ...props, title: heroBase.title, name: heroBase.name };
        // Preserve binder hasData already true
      }
      return {
        id: plan.id,
        label: plan.label,
        decision: plan.decision,
        type: mapping.type,
        moduleId,
        order: plan.order,
        props,
        mapping: mapping.mapping,
        reason,
      };
    }

    // Fallback when no source (legacy): use existing contentPropsFor
    const baseModuleId2 = plan.id === "hero" ? heroVariant : mapping.moduleId;
    const baseProps = contentPropsFor(plan.id, input, plan.label);
    // Still apply heading/variant deterministically even without source, using itemCount 0 so fallback to default variant
    const heading2 = plan.id !== "hero" ? resolveHeading(archetype, plan.id, undefined, source) : undefined;
    const variant2 = resolveVariant(archetype, plan.id, baseModuleId2, 0, undefined, false);
    const finalProps = heading2 ? { ...baseProps, title: heading2 } : baseProps;
    return composeSection(
      { id: plan.id, label: plan.label, decision: plan.decision, type: mapping.type, moduleId: variant2.moduleId, order: plan.order, props: finalProps, mapping: mapping.mapping, reason: `${mapping.mapping} mapping for blueprint section "${plan.id}"; heading:${heading2 ?? plan.label}; variant:${variant2.moduleId}` },
      input
    );
  });

  // Enrich navigation with dynamic links (presentation, deterministic, cap 6, no duplicates, no invalid)
  const enrichedNav = enrichNavigation(blueprint.navigation, source, archetype);

  const visibleSections = compositions.filter((c) => c.decision !== "hidden").map((c) => c.id);
  const builder = buildArtifact(compositions, blueprint, themeId, enrichedNav);

  const signature = createHash("sha1")
    .update(
      JSON.stringify({
        blueprint: blueprint.version,
        composition: COMPOSITION_VERSION,
        entity: blueprint.entity,
        archetype: archetype ?? "none",
        sections: compositions.map((c) => `${c.id}:${c.type}:${c.moduleId}:${c.decision}:${JSON.stringify(c.props).slice(0, 80)}`),
        navigation: enrichedNav.map((n) => `${n.id}:${n.href}`),
      })
    )
    .digest("hex")
    .slice(0, 12);

  return {
    version: COMPOSITION_VERSION,
    blueprintVersion: blueprint.version,
    entity: blueprint.entity,
    theme: { themeId, themeFamily },
    layout: blueprint.layout,
    sections: compositions,
    visibleSections,
    navigation: enrichedNav,
    seo: {
      title: blueprint.publishing.title,
      description: blueprint.publishing.description,
      keywords: blueprint.seo.defaultKeywords,
      structuredDataType: blueprint.seo.structuredDataType,
      openGraphType: blueprint.seo.openGraphType,
      canonical: blueprint.publishing.subdomain,
    },
    analytics: blueprint.analytics,
    publishing: blueprint.publishing,
    media: {
      hero: (() => {
        const m = resolveHeroMediaForRuntime({ backgroundUrl: input.identity.avatarUrl, posterUrl: input.identity.avatarUrl });
        return { resolvedMedia: m.resolvedMedia, mediaUrl: m.mediaUrl, mediaPoster: m.mediaPoster, rendererDecision: m.rendererDecision };
      })(),
    },
    builder,
    diagnostics: {
      sectionCount: compositions.length,
      visibleCount: visibleSections.length,
      unmappedSections: unmapped,
      themeMapping: `${themeFamily ?? "none"} → ${themeId}`,
      heroVariant,
      deterministicSignature: signature,
    },
  };
}

export function sourceToCompositionIdentity(source: ContentSource): CompositionInput["identity"] {
  return {
    entityType: null,
    name: source.displayName || source.username,
    username: source.username,
    bio: source.bio || null,
    tagline: null,
    avatarUrl: source.avatarUrl || null,
    socialLinks: source.socialLinks ?? source.links ?? [],
    subdomain: source.username || "creator-store",
  };
}
