/**
 * Website Blueprint runtime — IMPLEMENTATION-37.
 *
 * A pure, deterministic, serializable, versioned builder. Given the evidence
 * intelligence (+ relationship graph) and the identity profile, it produces the
 * canonical Website Blueprint that guides Builder, Theme Runtime and Publishing.
 * No UI logic, no renderers, no mutations — zero AI cost.
 */
import { blueprintForEntity, blueprintForArchetype, BLUEPRINT_VERSION, type SectionPlan, type Archetype } from "./config";
import type { EvidenceIntelligence } from "@/lib/generation/intelligence/evidence/types";
import type { RelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import type { BusinessModelType } from "@/lib/generation/intelligence/evidence/config";
import type { WebsiteBlueprint, NavigationItem } from "./types";
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { ArchetypeResult } from "@/lib/generation/archetype/types";

type SectionBusinessModel = BusinessModelType;

export interface BlueprintInput {
  evidence: EvidenceIntelligence;
  relationships: RelationshipGraph;
  identity: {
    entityType: string | null;
    primaryNiche: string | null;
    businessModel: string | null;
    audience: string[];
    name: string | null;
    username: string | null;
    subdomain: string;
  };
  // RCCF-PRELAUNCH-12B: archetype-aware inputs (additive, optional for backward compat)
  archetype?: ArchetypeResult | null;
  source?: ContentSource | null;
}

const BRAND_ENTITIES = new Set(["brand", "company", "agency", "organization", "government", "ngo"]);

function primaryEntity(input: BlueprintInput): string | null {
  const evidenceEntity = input.evidence.primaryEntity ?? input.identity.entityType;
  const evidencePrimary = input.evidence.entities.find((e) => e.entity === evidenceEntity);
  const strongest = input.relationships.reinforcedEntities
    .sort((a, b) => b.strength - a.strength)[0] ?? null;

  // A DIRECT evidence match (the entity's own keyword appears, e.g. "startup")
  // is the strongest signal — relationship reinforcement never overrides it.
  if (evidenceEntity) {
    const direct = input.evidence.entities.find(
      (e) => e.entity === evidenceEntity && e.evidence.some((ev) => ev.value === evidenceEntity),
    );
    if (direct) return evidenceEntity;
  }

  // A brand/company profile (e.g. Nike official) stays a brand even when the
  // graph also reinforces an athlete sponsor context.
  if (input.relationships.brands.length > 0 && evidenceEntity && BRAND_ENTITIES.has(evidenceEntity)) {
    return evidenceEntity;
  }
  // Relationship graph disambiguation (FIFA → athlete, GitHub → developer,
  // youtube → creator) applies ONLY to genuinely weak/ambiguous evidence —
  // it never overrides a confident entity (e.g. developer 0.51 > platform 0.43).
  if (strongest && (evidencePrimary?.confidence ?? 0) < 0.5) return strongest.entity;
  return evidenceEntity;
}

/**
 * Apply evidence-driven adjustments to the base section template:
 *  - a detected business model promotes its matching sections (e.g. courses →
 *    show Courses even if the entity defaulted it hidden);
 *  - integration presence reinforces platform-related sections.
 *  - RCCF-PRELAUNCH-12B: data-driven hide — required sections are hidden when source data is absent/weak.
 */
function decideSections(template: ReturnType<typeof blueprintForEntity>, input: BlueprintInput): SectionPlan[] {
  const sections = template.sections.map((s) => ({ ...s }));
  const businessModels = new Set(input.evidence.businessModels.map((b) => b.model));
  if (input.identity.businessModel) businessModels.add(input.identity.businessModel as SectionBusinessModel);
  const platforms = new Set(input.relationships.platforms);

  // Business-model → section promotion.
  if (businessModels.has("courses")) promote(sections, "courses");
  if (businessModels.has("products")) promote(sections, "products");
  if (businessModels.has("products")) promote(sections, "merchandise");
  if (businessModels.has("services")) promote(sections, "services");
  if (businessModels.has("community") || platforms.has("discord")) promote(sections, "community");
  if (businessModels.has("newsletter")) promote(sections, "newsletter");
  if (businessModels.has("consulting") || businessModels.has("coaching")) promote(sections, "booking");
  if (businessModels.has("coaching")) promote(sections, "pricing");

  // Insert a section the business model justifies even when the base template
  // omitted it (e.g. a creator selling courses).
  if (businessModels.has("courses") && !sections.some((s) => s.id === "courses")) {
    sections.push({ id: "courses", label: "Courses", decision: "recommended", order: 15 });
  }
  if ((businessModels.has("consulting") || businessModels.has("coaching")) && !sections.some((s) => s.id === "booking")) {
    sections.push({ id: "booking", label: "Booking", decision: "recommended", order: 45 });
  }
  if (businessModels.has("newsletter") && !sections.some((s) => s.id === "newsletter")) {
    sections.push({ id: "newsletter", label: "Newsletter", decision: "recommended", order: 55 });
  }

  // Integration presence → promote related sections.
  if (platforms.has("github")) promote(sections, "github");
  if (platforms.has("youtube")) promote(sections, "media");
  if (platforms.has("google_maps")) promote(sections, "location");

  // RCCF-PRELAUNCH-12B: data-driven hide — do NOT emit empty sections simply because template contains them.
  // Applied after promotions so archetype + business-model sections are evaluated for data availability.
  return applyDataDrivenHide(sections, input);
}

function applyDataDrivenHide(sections: SectionPlan[], input: BlueprintInput): SectionPlan[] {
  const source = input.source;
  if (!source) return sections;

  const hasData = (id: string): boolean => {
    switch (id) {
      case "hero":
      case "contact":
      case "footer":
        return true;
      case "experience":
        return (source.resume?.experience.length ?? 0) > 0;
      case "skills":
        return (source.resume?.skills.length ?? 0) > 0;
      case "projects":
        return (source.resume?.projects.length ?? 0) > 0;
      case "education":
      case "achievements":
        return (source.resume?.education.length ?? 0) > 0 || (source.resume?.certifications.length ?? 0) > 0;
      case "github":
        return hasSocialPlatform(source, "github");
      case "testimonials":
        // 15B: only when actual review/testimonial evidence exists
        return (source.testimonials?.length ?? 0) > 0;
      case "products":
      case "merchandise":
        // 15B: only when structured product data exists (do not require keyword)
        return (source.products?.length ?? 0) > 0;
      case "gallery":
      case "transformations":
      case "portfolio":
        // 15B: require real gallery assets — not just platform name in prose
        if ((source.gallery?.length ?? 0) > 0 && (source.gallery ?? []).some((g) => g.imageUrl && g.imageUrl.trim().length > 0)) return true;
        // Keep professional fallback via resume projects but only when real assets present? For 15B creator, use platforms with real links
        if ((source.contentFeed?.length ?? 0) > 0) return true;
        // Fallback to previous platform check for backward compat, but require actual media links
        return hasPlatforms(input, ["instagram", "youtube", "tiktok"]) || hasSocialPlatform(source, "instagram") || (source.resume?.projects.length ?? 0) > 0;
      case "media":
      case "blog":
      case "resources":
        if ((source.contentFeed?.length ?? 0) > 0) return true;
        if ((source.content?.length ?? 0) > 0) return true;
        return hasPlatforms(input, ["youtube", "instagram", "tiktok", "spotify"]) || hasMediaPlatformLink(source);
      case "community":
        return hasCommunityLink(source);
      case "links":
      case "sponsors":
      case "events":
        return (source.socialLinks?.length ?? 0) > 0 || (source.links.length ?? 0) > 1 || (source.resume?.socialLinks.length ?? 0) > 0;
      case "menu":
        // 15B: require structured menu when available, fallback to keyword for legacy
        if ((source.menuItems?.length ?? 0) > 0) return true;
        if ((source.products?.length ?? 0) > 0 && input.archetype?.archetype === "local_business") return true;
        return hasMenuSignal(source);
      case "location":
        return !!(source.location || source.resume?.location || source.googleMapsUrl || hasPlatforms(input, ["google_maps"]));
      case "hours":
        if (source.hours && source.hours.trim().length > 0) return true;
        return hasHoursSignal(source);
      case "reservations":
      case "booking":
        if (source.reservationUrl && source.reservationUrl.trim().length > 0) return true;
        return hasReservationSignal(source);
      default:
        // Unknown section: keep as-is (do not hide unknown)
        return true;
    }
  };

  return sections.map((s) => {
    if (s.decision === "hidden") return s;
    if (!hasData(s.id)) {
      return { ...s, decision: "hidden" as const };
    }
    return s;
  });
}

function hasSocialPlatform(source: ContentSource, platform: string): boolean {
  const p = platform.toLowerCase();
  const rm = source.resume?.socialLinks ?? [];
  if (rm.some((l) => l.platform.toLowerCase() === p)) return true;
  const all = [...(source.socialLinks ?? []), ...source.links].join(" ").toLowerCase();
  return all.includes(`${p}.com`);
}

function hasPlatforms(input: BlueprintInput, platforms: string[]): boolean {
  const set = new Set(input.relationships.platforms);
  return platforms.some((p) => set.has(p));
}

function hasBusinessModel(input: BlueprintInput, model: string): boolean {
  const ms = new Set(input.evidence.businessModels.map((b) => b.model));
  if (input.identity.businessModel === model) ms.add(model as BusinessModelType);
  return ms.has(model as BusinessModelType);
}

function hasCommunityLink(source: ContentSource): boolean {
  const all = [...(source.socialLinks ?? []), ...source.links, ...(source.resume?.socialLinks.map((l) => l.url) ?? [])];
  const low = all.join(" ").toLowerCase();
  return low.includes("discord") || low.includes("t.me") || low.includes("telegram") || low.includes("whatsapp") || low.includes("wa.me");
}

function hasMediaPlatformLink(source: ContentSource): boolean {
  const all = [...(source.socialLinks ?? []), ...source.links, ...(source.content?.map((c) => c.url) ?? [])].join(" ").toLowerCase();
  return all.includes("youtube") || all.includes("instagram") || all.includes("tiktok") || all.includes("twitch") || all.includes("spotify");
}

// Legacy helpers kept for backward compat but not used for 15B hide decisions
function hasReviewSignal(source: ContentSource): boolean {
  const txt = [
    source.bio ?? "",
    source.resume?.summary ?? "",
    ...(source.resume?.projects.map((p) => p.description) ?? []),
  ].join(" ").toLowerCase();
  return txt.includes("reviews") || txt.includes("testimonials") || txt.includes("ratings") || txt.includes("what people say");
}

function hasMenuSignal(source: ContentSource): boolean {
  const txt = [
    source.bio ?? "",
    source.resume?.summary ?? "",
    ...(source.resume?.skills ?? []),
    ...(source.resume?.projects.map((p) => `${p.name} ${p.description}`) ?? []),
    source.location ?? "",
    source.resume?.location ?? "",
  ].join(" ").toLowerCase();
  return txt.includes("menu") || txt.includes("dish") || txt.includes("cuisine") || txt.includes("restaurant") || txt.includes("biryani") || txt.includes("pizza");
}

function hasHoursSignal(source: ContentSource): boolean {
  const txt = [source.bio ?? "", source.resume?.summary ?? "", source.location ?? "", source.resume?.location ?? ""].join(" ").toLowerCase();
  return txt.includes("hours") || txt.includes("open") || txt.includes("closed") || txt.includes("timings") || txt.includes("am -") || txt.includes("am –");
}

function hasReservationSignal(source: ContentSource): boolean {
  const txt = [source.bio ?? "", source.resume?.summary ?? ""].join(" ").toLowerCase();
  return txt.includes("reservation") || txt.includes("reserve") || txt.includes("book a table") || txt.includes("order now") || txt.includes("booking");
}

function promote(sections: SectionPlan[], id: string): void {
  const section = sections.find((s) => s.id === id);
  if (section && section.decision === "hidden") {
    section.decision = "optional";
  } else if (section && section.decision === "optional") {
    section.decision = "recommended";
  }
}

function buildNavigation(sections: SectionPlan[], subdomain: string, archetype?: string | null): NavigationItem[] {
  const visible = sections.filter((s) => s.decision !== "hidden").sort((a, b) => a.order - b.order);
  if (archetype !== "professional_resume") {
    return visible.slice(0, 6).map((s) => ({ id: s.id, label: s.label, href: `/#${s.id}`, order: s.order }));
  }
  // Professional: Contact must always be included, prioritize primary sections + Contact, external links only after essential (composition layer)
  const essentialIds = ["hero", "experience", "skills", "projects", "contact"];
  const essential = visible.filter((s) => essentialIds.includes(s.id)).sort((a, b) => {
    const ia = essentialIds.indexOf(a.id);
    const ib = essentialIds.indexOf(b.id);
    return ia - ib;
  });
  const essentialSet = new Set(essential.map((s) => s.id));
  const remaining = visible.filter((s) => !essentialSet.has(s.id)).sort((a, b) => a.order - b.order);
  const result: SectionPlan[] = [...essential];
  for (const r of remaining) {
    if (result.length >= 6) break;
    result.push(r);
  }
  // If essential already >6 (should not), slice
  const final = result.slice(0, 6).sort((a, b) => a.order - b.order);
  return final.map((s) => ({ id: s.id, label: s.label, href: `/#${s.id}`, order: s.order }));
}

export function buildWebsiteBlueprint(input: BlueprintInput): WebsiteBlueprint {
  const entity = primaryEntity(input);
  const archetypeResult = input.archetype ?? null;
  const archetype = archetypeResult?.archetype ?? null;

  // Prefer archetype template when archetype is present and confident; otherwise entity template
  const archetypeTemplate = blueprintForArchetype(archetype as Archetype | null | undefined);
  const entityTemplate = blueprintForEntity((entity as Parameters<typeof blueprintForEntity>[0]) ?? "creator");
  const archetypeCta = archetypeTemplate as unknown as { primaryCta?: string; secondaryCta?: string } | null;
  const baseTemplate = archetypeTemplate
    ? {
        ...archetypeTemplate,
        // Keep entity's seo/analytics as fallback where archetype doesn't define? Archetype template defines sections/layout/themeFamily only
        // Use archetype's layout/themeFamily, but keep entity's seo structure if archetype missing seo
        seo: entityTemplate.seo,
        analytics: archetypeTemplate ? entityTemplate.analytics : entityTemplate.analytics, // keep entity analytics for now
        integrations: entityTemplate.integrations,
        monetization: entityTemplate.monetization,
        primaryCta: archetypeCta?.primaryCta ?? entityTemplate.primaryCta,
        secondaryCta: archetypeCta?.secondaryCta ?? entityTemplate.secondaryCta,
      } as unknown as ReturnType<typeof blueprintForEntity>
    : entityTemplate;

  // Build a pseudo-template for decideSections that contains archetype sections + entity fallbacks
  const templateForDecide: ReturnType<typeof blueprintForEntity> = archetypeTemplate
    ? {
        ...entityTemplate,
        layout: archetypeTemplate.layout,
        themeFamily: archetypeTemplate.themeFamily,
        sections: archetypeTemplate.sections,
      } as unknown as ReturnType<typeof blueprintForEntity>
    : entityTemplate;

  const sections = decideSections(templateForDecide, input);
  const visibleSections = sections.filter((s) => s.decision !== "hidden").map((s) => s.id);
  const navigation = buildNavigation(sections, input.identity.subdomain, archetype);

  const name = input.identity.name ?? input.identity.username ?? "Creator";
  const description = input.evidence.primaryNiche
    ? `${name} — ${input.evidence.primaryNiche} creator storefront.`
    : `${name} — creator storefront.`;

  const template = templateForDecide;
  const integrations = Array.from(new Set([...baseTemplate.integrations, ...input.relationships.platforms]));
  const monetization = Array.from(new Set([...baseTemplate.monetization, ...input.evidence.businessModels.map((b) => b.model)]));

  return {
    version: BLUEPRINT_VERSION,
    entity,
    layout: template.layout,
    sections,
    visibleSections,
    navigation,
    cta: { primary: template.primaryCta, secondary: template.secondaryCta },
    theme: {
      family: template.themeFamily,
      typography: template.typography,
      spacing: template.spacing,
      animationDensity: template.animationDensity,
      visualTone: template.visualTone,
      colorDirection: template.colorDirection,
    },
    seo: {
      ...template.seo,
      defaultKeywords: Array.from(
        new Set([...template.seo.defaultKeywords, ...input.evidence.niches.slice(0, 3).map((n) => n.niche)]),
      ),
    },
    analytics: template.analytics,
    monetization,
    integrations,
    publishing: {
      title: template.seo.titleStrategy.replace("{name}", name).replace("{subdomain}", input.identity.subdomain),
      description,
      subdomain: input.identity.subdomain,
    },
    evidence: {
      entity,
      niches: input.evidence.niches.map((n) => n.niche),
      businessModels: input.evidence.businessModels.map((b) => b.model),
      audience: input.evidence.audience.segments.map((a) => a.segment),
      relationshipChains: input.relationships.chains,
      reinforcedEntities: input.relationships.reinforcedEntities.map((r) => r.entity),
      brands: input.relationships.brands,
      archetype: archetype ?? null,
      archetypeConfidence: archetypeResult?.confidence ?? null,
      archetypeEvidence: archetypeResult?.evidence ?? [],
    },
    diagnostics: {
      sectionCount: sections.length,
      visibleCount: visibleSections.length,
      integrationCount: integrations.length,
      monetizationCount: monetization.length,
      archetype: archetype ?? null,
      archetypeConfidence: archetypeResult?.confidence ?? null,
    },
  };
}
