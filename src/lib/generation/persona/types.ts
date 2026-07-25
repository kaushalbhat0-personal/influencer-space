export type PersonaId = string & { readonly __brand: "PersonaId" };

export type BusinessModel =
  | "direct_sales"
  | "service_based"
  | "content_monetization"
  | "community"
  | "education"
  | "marketplace"
  | "hybrid";

export type CreatorStage = "starting" | "growing" | "established" | "professional" | "celebrity";

export type CommerceStage = "none" | "exploring" | "just_started" | "growing" | "established" | "scaling";

export type BrandStrength = "none" | "weak" | "moderate" | "strong" | "dominant";

export type AudienceType = "general" | "niche" | "professional" | "luxury" | "budget" | "community";

export type ContentStyle =
  | "educational"
  | "entertainment"
  | "inspirational"
  | "promotional"
  | "storytelling"
  | "technical"
  | "behind_the_scenes";

export interface CreatorPersona {
  id: PersonaId;
  name: string;
  niche: string;
  description: string;
  businessModel: BusinessModel;
  typicalProducts: string[];
  contentStyle: ContentStyle;
  audienceType: AudienceType;
  socialProofEmphasis: "high" | "medium" | "low";
  pricingEmphasis: "high" | "medium" | "low";
  defaultModules: string[];
  onboardingDefaults: Record<string, unknown>;
}

export interface ExperienceProfile {
  persona: CreatorPersona;
  businessModel: BusinessModel;
  creatorStage: CreatorStage;
  commerceStage: CommerceStage;
  brandStrength: BrandStrength;
  audienceType: AudienceType;
  contentStyle: ContentStyle;
  confidence: number;
}
