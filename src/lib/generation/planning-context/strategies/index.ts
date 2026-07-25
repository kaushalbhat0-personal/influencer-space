import type { ContextStrategy } from "./base";
import { AuthorityStrategy } from "./authority";
import { TrustStrategy } from "./trust";
import { CommerceStrategy } from "./commerce";
import { BrandingStrategy } from "./branding";
import { AudienceStrategy } from "./audience";
import { ContentStrategy } from "./content";
import { ConversionStrategy } from "./conversion";
import { CommunityStrategy } from "./community";
import { GrowthStrategy } from "./growth";
import { RecommendationStrategy } from "./recommendation";
import { PageStrategy } from "./page";
import { SEOContextStrategy } from "./seo";

export type { ContextStrategy } from "./base";

const ALL_STRATEGIES: ContextStrategy[] = [
  new AuthorityStrategy(),
  new TrustStrategy(),
  new CommerceStrategy(),
  new BrandingStrategy(),
  new AudienceStrategy(),
  new ContentStrategy(),
  new ConversionStrategy(),
  new CommunityStrategy(),
  new GrowthStrategy(),
  new RecommendationStrategy(),
  new PageStrategy(),
  new SEOContextStrategy(),
];

export function createDefaultContextStrategies(): ContextStrategy[] {
  return ALL_STRATEGIES.map((s) => s);
}
