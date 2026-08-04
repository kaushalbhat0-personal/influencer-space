import type { BusinessModel, CreatorStage, ContentStyle, AudienceType, BrandStrength, CommerceStage } from "../persona/types";

export type GoldenPlatform = "youtube" | "instagram" | "tiktok" | "x" | "linkedin";

export interface GoldenCreatorEntry {
  id: string;
  name: string;
  platform: GoldenPlatform;
  url: string;
  expectedPersonaId: string;
  expectedPersonaName: string;
  expectedBusinessModel: BusinessModel;
  expectedCreatorStage: CreatorStage;
  expectedContentStyle: ContentStyle;
  expectedAudienceType: AudienceType;
  expectedBrandStrength: BrandStrength;
  expectedCommerceStage: CommerceStage;
  expectedConfidence: number;
  tags: string[];
  /** IMPLEMENTATION-32: enriched IdentityProfile targets (regression anchors). */
  expectedEntityType?: string;
  expectedPrimaryNiche?: string;
  /** IMPLEMENTATION-36: evidence intelligence regression anchors. */
  expectedNiches?: string[];
  expectedAudience?: string;
  minimumConfidence?: number;
}

export interface GoldenValidationDimension {
  dimension: string;
  expected: string;
  actual: string;
  match: boolean;
  score: number;
}

export interface GoldenValidationResult {
  creatorId: string;
  creatorName: string;
  url: string;
  passed: boolean;
  overallScore: number;
  dimensions: GoldenValidationDimension[];
  timestamp: string;
  regressions: string[];
}

export interface GoldenDatasetConfig {
  enabled: boolean;
  strictMode: boolean;
  scoreThreshold: number;
}
