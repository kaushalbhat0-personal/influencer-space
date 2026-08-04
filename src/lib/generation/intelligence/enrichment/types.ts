/**
 * Hybrid Intelligence Enrichment — types (IMPLEMENTATION-32).
 *
 * IdentityProfile is the canonical IMMUTABLE enriched intelligence object.
 * ContentSource stays raw acquisition; KnowledgeGraph stays deterministic
 * intelligence; IdentityProfile is enriched intelligence consumed downstream.
 */
import type { ContentSource } from "@/lib/generation/intelligence/types";
import type { EntityType } from "./config";
import type { EvidenceIntelligence } from "@/lib/generation/intelligence/evidence/types";

export interface IdentityEvidence {
  /** Deterministic source field this fact came from (or "ai:<field>"). */
  source: string;
  value: string | number | boolean | string[] | null;
}

export interface IdentityProfile {
  entityType: EntityType | null;
  persona: { id: string | null; name: string | null } | null;
  industry: string | null;
  primaryNiche: string | null;
  secondaryNiches: string[];
  audience: { description: string | null; interests: string[] } | null;
  brand: {
    position: string | null;
    communicationStyle: string | null;
    visualStyle: string | null;
  } | null;
  contentStyle: string | null;
  businessModel: string | null;
  themeRecommendation: { themeId: string | null; confidence: number } | null;
  sectionRecommendations: string[];
  /** Composite evidence-based confidence (0..1). */
  confidence: number;
  evidence: IdentityEvidence[];
  ai: {
    used: boolean;
    provider: string | null;
    model: string | null;
    promptVersion: string;
    cacheHit: boolean;
    latencyMs: number;
    cost: number;
    confidenceBefore: number;
    confidenceAfter: number;
  };
  /** IMPLEMENTATION-36: evidence-backed intelligence (entity/niches/business/audience/recommendations). */
  intelligence?: EvidenceIntelligence;
  diagnostics: EnrichmentDiagnostics;
}

export interface EnrichmentDiagnostics {
  aiUsed: boolean;
  provider: string | null;
  model: string | null;
  cacheHit: boolean;
  promptVersion: string;
  latencyMs: number;
  cost: number;
  confidenceBefore: number;
  confidenceAfter: number;
  fieldsEnriched: string[];
  fieldsPreserved: string[];
  mergeDecisions: string[];
  notes: string[];
}

export interface AIEnrichmentOutput {
  entityType?: string | null;
  persona?: string | null;
  industry?: string | null;
  primaryNiche?: string | null;
  secondaryNiches?: string[] | null;
  audience?: { description?: string | null; interests?: string[] | null } | null;
  brandPosition?: string | null;
  communicationStyle?: string | null;
  visualStyle?: string | null;
  contentStyle?: string | null;
  businessModel?: string | null;
  confidenceAdjustment?: number | null;
  recommendedTheme?: string | null;
  recommendedSections?: string[] | null;
  missingSignals?: string[] | null;
  reasoningSummary?: string | null;
}

export interface IdentityEnrichmentInput {
  source: ContentSource;
  /** Existing deterministic graph confidence (never discarded). */
  graphConfidence: number;
  persona: { id: string | null; name: string | null } | null;
  personaScore: number;
  primaryNiche: string | null;
  acquisition: {
    capabilities: string[];
    populatedFields: string[];
    missingFields: string[];
  } | null;
}
