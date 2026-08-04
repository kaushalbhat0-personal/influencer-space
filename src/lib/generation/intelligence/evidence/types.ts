/**
 * Evidence Intelligence types — IMPLEMENTATION-36.
 */
import type { EvidenceEntityType, BusinessModelType, AudienceSegment } from "./config";

export interface EvidenceItem {
  /** Where the signal came from (bio/content/keyword/ai). */
  source: "bio" | "content" | "acquisition" | "ai" | "knowledge";
  /** The actual matched signal (e.g. "fifa", "football"). */
  value: string;
  /** What it evidences (entity/niche/business/audience). */
  kind: "entity" | "niche" | "business" | "audience";
}

export interface DetectedEntity {
  entity: EvidenceEntityType;
  confidence: number;
  evidence: EvidenceItem[];
  /** True when reinforced by the AI enrichment (hybrid output). */
  aiReinforced?: boolean;
}

export interface DetectedNiche {
  niche: string;
  weight: number;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface DetectedBusinessModel {
  model: BusinessModelType;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface DetectedAudience {
  segment: AudienceSegment;
  confidence: number;
  evidence: EvidenceItem[];
}

export interface EvidenceIntelligence {
  entities: DetectedEntity[];
  primaryEntity: EvidenceEntityType | null;
  niches: DetectedNiche[];
  primaryNiche: string | null;
  businessModels: DetectedBusinessModel[];
  audience: {
    segments: DetectedAudience[];
    language: string[] | null;
    region: string | null;
    scope: "global" | "local" | "unknown";
  };
  recommendations: {
    theme: string | null;
    sections: string[];
    cta: string | null;
    products: string[];
    services: string[];
    brandTone: string | null;
    colorStyle: string | null;
    typography: string | null;
    seoKeywords: string[];
  };
  confidence: {
    overall: number;
    entity: number;
    niche: number;
    business: number;
    audience: number;
    acquisition: number;
    breakdown: Array<{ key: string; label: string; score: number; weight: number }>;
  };
  diagnostics: {
    aiUsed: boolean;
    aiFieldsEnriched: string[];
    entityCount: number;
    nicheCount: number;
    evidenceCount: number;
  };
}

export interface EvidenceIntelligenceInput {
  sourceText: string;
  sourceContentTexts: string[];
  followers: number;
  acquisitionCompleteness: number;
  graphNiche: string | null;
  graphConfidence: number;
  /** AI-derived entity/niches from the hybrid enrichment (IdentityProfile). */
  aiEntity?: string | null;
  aiNiches?: string[];
  aiBusinessModel?: string | null;
  aiUsed?: boolean;
}
