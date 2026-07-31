import type { BusinessProfile } from "@/lib/acquisition/business-types";
import type { BusinessRecommendation } from "@/modules/business-intelligence/domain/types";
import type { WebsiteBlueprint, BlueprintProvider } from "../domain/types";
import { composeBlueprint } from "../application/composition-engine";

export class RuleBlueprintProvider implements BlueprintProvider {
  id = "rule-based";
  name = "Rule-Based Blueprint Composer";

  compose(
    profile: Record<string, unknown>,
    recommendations: Record<string, unknown>,
  ): WebsiteBlueprint {
    return composeBlueprint(
      profile as unknown as BusinessProfile,
      recommendations as unknown as BusinessRecommendation | null,
    );
  }
}

export const blueprintProvider = new RuleBlueprintProvider();
