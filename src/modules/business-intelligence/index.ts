export { generateRecommendations } from "./application/recommendation-engine";
export { calculateHealth } from "./application/health-engine";
export { recommendationProvider } from "./infrastructure/rule-provider";
export { BUSINESS_TEMPLATES, getTemplate } from "./domain/templates";
export { RecommendationsPanel } from "./presentation/recommendations-panel";
export type {
  BusinessRecommendation,
  ThemeRecommendation,
  PageRecommendation,
  SectionRecommendation,
  NavigationRecommendation,
  OfferRecommendation,
  SeoRecommendation,
  ConversionRecommendation,
  BusinessHealthScore,
  BusinessTemplate,
  RecommendationProvider,
} from "./domain/types";
