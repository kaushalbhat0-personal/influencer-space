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
 */
import { createHash } from "crypto";
import type { WebsiteBlueprint } from "@/lib/generation/blueprint/types";
import type { EvidenceIntelligence } from "@/lib/generation/intelligence/evidence/types";
import type { RelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import { resolveHeroMediaForRuntime } from "@/lib/media/hero-media";
import { SECTION_MAP, HERO_VARIANT_BY_ENTITY, themeIdForFamily } from "./config";
import type { StorefrontComposition, SectionComposition, BuilderDraft } from "./types";

export const COMPOSITION_VERSION = 1;

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
}

function heroProps(input: CompositionInput, cta: string): Record<string, unknown> {
  const name = input.identity.name ?? input.identity.username ?? "Creator";
  const heroMedia = resolveHeroMediaForRuntime({
    backgroundUrl: input.identity.avatarUrl,
    posterUrl: input.identity.avatarUrl,
  });
  const platform = input.relationships.platforms[0] ?? null;
  return {
    title: name,
    name,
    tagline: input.identity.tagline ?? input.evidence.primaryNiche ?? "",
    bio: input.identity.bio ?? "",
    cta,
    ctaLink: "#",
    profilePictureUrl: input.identity.avatarUrl ?? "",
    socialLinks: input.identity.socialLinks.slice(0, 4).map((url) => ({ url })),
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
      const links = input.identity.socialLinks.slice(0, 6).map((url) => ({ url, label: url }));
      return { title: label, items: links, showIcons: links.length > 0 };
    }
    case "footer":
      return { copyright: `© ${new Date().getFullYear()} ${input.identity.name ?? "CreatorStore"}` };
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

function buildArtifact(compositions: SectionComposition[], blueprint: WebsiteBlueprint, themeId: string): BuilderDraft {
  const artifact = {
    sections: compositions
      .filter((c) => c.decision !== "hidden")
      .sort((a, b) => a.order - b.order)
      .map((c) => ({ id: c.id, type: c.type, props: c.props })),
    navigation: blueprint.navigation.map((n) => ({ id: n.id, label: n.label, href: n.href })),
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

/** Pure, deterministic, versioned composition. */
export function composeStorefront(input: CompositionInput): StorefrontComposition {
  const blueprint = input.blueprint;
  const themeFamily = blueprint.theme.family;
  const themeId = themeIdForFamily(themeFamily);
  const heroVariant = HERO_VARIANT_BY_ENTITY[blueprint.entity ?? ""] ?? "hero.default";

  const unmapped: string[] = [];
  const compositions: SectionComposition[] = blueprint.sections.map((plan, i) => {
    if (plan.decision === "hidden") {
      return { id: plan.id, label: plan.label, decision: plan.decision, type: "", moduleId: "", order: plan.order, props: {}, mapping: "closest", reason: "hidden — not composed" };
    }
    const mapping = SECTION_MAP[plan.id];
    if (!mapping) {
      unmapped.push(plan.id);
      return { id: plan.id, label: plan.label, decision: plan.decision, type: "links", moduleId: "links.default", order: plan.order, props: {}, mapping: "closest", reason: `no supported component — mapped to links` };
    }
    const moduleId = plan.id === "hero" ? heroVariant : mapping.moduleId;
    return composeSection({ id: plan.id, label: plan.label, decision: plan.decision, type: mapping.type, moduleId, order: plan.order, props: {}, mapping: mapping.mapping, reason: "" }, input);
  });

  const visibleSections = compositions.filter((c) => c.decision !== "hidden").map((c) => c.id);
  const builder = buildArtifact(compositions, blueprint, themeId);

  const signature = createHash("sha1").update(JSON.stringify({ blueprint: blueprint.version, entity: blueprint.entity, sections: compositions.map((c) => `${c.id}:${c.type}:${c.decision}`) })).digest("hex").slice(0, 12);

  return {
    version: COMPOSITION_VERSION,
    blueprintVersion: blueprint.version,
    entity: blueprint.entity,
    theme: { themeId, themeFamily },
    layout: blueprint.layout,
    sections: compositions,
    visibleSections,
    navigation: blueprint.navigation,
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
