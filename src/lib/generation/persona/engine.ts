import type { KnowledgeGraph } from "@/lib/generation/intelligence/types";
import { PersonaRegistry } from "./registry";
import type { PersonaMatchResult } from "./registry";
import type { ExperienceProfile, CreatorPersona, CreatorStage, CommerceStage, BrandStrength, AudienceType, ContentStyle, BusinessModel } from "./types";
import { registerPersonaDetectors } from "./detectors";

export class PersonaEngine {
  private registry = new PersonaRegistry();

  constructor() {
    registerPersonaDetectors(this.registry);
  }

  detect(graph: KnowledgeGraph): PersonaMatchResult {
    return this.registry.detect(graph);
  }

  getRegistry(): PersonaRegistry {
    return this.registry;
  }
}

export class ExperienceProfileBuilder {
  build(graph: KnowledgeGraph, persona: CreatorPersona, score: number): ExperienceProfile {
    const businessModel = this.determineBusinessModel(graph, persona);
    const creatorStage = this.determineCreatorStage(graph);
    const commerceStage = this.determineCommerceStage(graph);
    const brandStrength = this.determineBrandStrength(graph);
    const audienceType = this.determineAudienceType(graph, persona);
    const contentStyle = this.determineContentStyle(graph, persona);
    const confidence = this.normalizeConfidence(score);

    return Object.freeze({
      persona,
      businessModel,
      creatorStage,
      commerceStage,
      brandStrength,
      audienceType,
      contentStyle,
      confidence,
    });
  }

  private determineBusinessModel(graph: KnowledgeGraph, persona: CreatorPersona): BusinessModel {
    const hasProducts = graph.products.length > 0;
    const hasServices = graph.products.some(p => p.type === "service");
    const hasSubscriptions = graph.products.some(p => p.type === "subscription");
    const bio = (graph.creator.bio ?? "").toLowerCase();

    if (hasSubscriptions && hasProducts) return "hybrid";
    if (bio.match(/community|discord|membership/) && graph.socialLinks.length >= 3) return "community";
    if (hasServices && !hasProducts) return "service_based";
    if (hasServices) return "hybrid";
    if (bio.match(/course|teach|learn|curriculum/) && hasProducts) return "education";
    if (graph.businessModel.type === "affiliate") return "content_monetization";
    if (graph.businessModel.type === "subscription") return "community";
    if (hasProducts) return "direct_sales";

    return persona.businessModel;
  }

  private determineCreatorStage(graph: KnowledgeGraph): CreatorStage {
    const f = graph.creator.followers;
    if (f >= 1000000) return "celebrity";
    if (f >= 100000) return "professional";
    if (f >= 10000) return "established";
    if (f >= 1000) return "growing";
    return "starting";
  }

  private determineCommerceStage(graph: KnowledgeGraph): CommerceStage {
    const count = graph.products.length;
    const hasBrand = graph.brand.existingBranding;

    if (count === 0 && !hasBrand) return "none";
    if (count === 0) return "exploring";
    if (count <= 2) return "just_started";
    if (count <= 5) return "growing";
    if (count <= 10) return "established";
    return "scaling";
  }

  private determineBrandStrength(graph: KnowledgeGraph): BrandStrength {
    const b = graph.brand;
    if (!b.existingBranding) return "none";
    let score = 0;
    if (b.name) score += 1;
    if (b.tagline) score += 1;
    if (b.colors.length > 0) score += 1;
    if (b.logo) score += 1;
    if (b.brandVoice && b.confidence > 0.5) score += 1;

    if (score >= 5) return "dominant";
    if (score >= 4) return "strong";
    if (score >= 3) return "moderate";
    if (score >= 1) return "weak";
    return "none";
  }

  private determineAudienceType(graph: KnowledgeGraph, persona: CreatorPersona): AudienceType {
    const interests = graph.audience.interests.map(i => i.toLowerCase());
    if (interests.some(i => i.includes("luxury") || i.includes("premium"))) return "luxury";
    if (interests.some(i => i.includes("professional") || i.includes("business") || i.includes("career"))) return "professional";
    if (interests.some(i => i.includes("community") || i.includes("club") || i.includes("group"))) return "community";
    if (interests.some(i => i.includes("budget") || i.includes("deals") || i.includes("affordable"))) return "budget";
    if (interests.length <= 3 && !interests.some(i => ["general", "entertainment"].includes(i))) return "niche";

    return persona.audienceType;
  }

  private determineContentStyle(graph: KnowledgeGraph, persona: CreatorPersona): ContentStyle {
    const types = graph.content.topContentTypes.map(t => t.toLowerCase());
    if (types.some(t => ["educational", "tutorial", "how to", "lesson"].includes(t))) return "educational";
    if (types.some(t => ["entertainment", "funny", "comedy"].includes(t))) return "entertainment";
    if (types.some(t => ["inspirational", "motivation", "transformation"].includes(t))) return "inspirational";
    if (types.some(t => ["technical", "coding", "programming", "analysis"].includes(t))) return "technical";
    if (types.some(t => ["behind the scenes", "bts", "process"].includes(t))) return "behind_the_scenes";
    if (types.some(t => ["promotional", "ad", "sponsored"].includes(t))) return "promotional";
    if (types.some(t => ["storytelling", "vlog", "personal"].includes(t))) return "storytelling";

    return persona.contentStyle;
  }

  private normalizeConfidence(score: number): number {
    if (score >= 80) return 0.95;
    if (score >= 60) return 0.85;
    if (score >= 40) return 0.75;
    if (score >= 20) return 0.6;
    return 0.45;
  }
}
