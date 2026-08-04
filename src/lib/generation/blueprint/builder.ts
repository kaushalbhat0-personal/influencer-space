/**
 * Website Blueprint runtime — IMPLEMENTATION-37.
 *
 * A pure, deterministic, serializable, versioned builder. Given the evidence
 * intelligence (+ relationship graph) and the identity profile, it produces the
 * canonical Website Blueprint that guides Builder, Theme Runtime and Publishing.
 * No UI logic, no renderers, no mutations — zero AI cost.
 */
import { blueprintForEntity, BLUEPRINT_VERSION, type SectionPlan } from "./config";
import type { EvidenceIntelligence } from "@/lib/generation/intelligence/evidence/types";
import type { RelationshipGraph } from "@/lib/generation/intelligence/evidence/relationship";
import type { BusinessModelType } from "@/lib/generation/intelligence/evidence/config";
import type { WebsiteBlueprint, NavigationItem } from "./types";

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

  return sections;
}

function promote(sections: SectionPlan[], id: string): void {
  const section = sections.find((s) => s.id === id);
  if (section && section.decision === "hidden") {
    section.decision = "optional";
  } else if (section && section.decision === "optional") {
    section.decision = "recommended";
  }
}

function buildNavigation(sections: SectionPlan[], subdomain: string): NavigationItem[] {
  return sections
    .filter((s) => s.decision !== "hidden")
    .sort((a, b) => a.order - b.order)
    .slice(0, 6)
    .map((s) => ({ id: s.id, label: s.label, href: `/#${s.id}`, order: s.order }));
}

export function buildWebsiteBlueprint(input: BlueprintInput): WebsiteBlueprint {
  const entity = primaryEntity(input);
  const template = blueprintForEntity((entity as Parameters<typeof blueprintForEntity>[0]) ?? "creator");
  const sections = decideSections(template, input);
  const visibleSections = sections.filter((s) => s.decision !== "hidden").map((s) => s.id);
  const navigation = buildNavigation(sections, input.identity.subdomain);

  const name = input.identity.name ?? input.identity.username ?? "Creator";
  const description = input.evidence.primaryNiche
    ? `${name} — ${input.evidence.primaryNiche} creator storefront.`
    : `${name} — creator storefront.`;

  const integrations = Array.from(new Set([...template.integrations, ...input.relationships.platforms]));
  const monetization = Array.from(new Set([...template.monetization, ...input.evidence.businessModels.map((b) => b.model)]));

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
    },
    diagnostics: {
      sectionCount: sections.length,
      visibleCount: visibleSections.length,
      integrationCount: integrations.length,
      monetizationCount: monetization.length,
    },
  };
}
