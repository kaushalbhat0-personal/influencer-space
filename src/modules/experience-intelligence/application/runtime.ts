// ── Experience Intelligence Runtime ─────────────────────────
// Orchestrates every phase: section plan (priority, weights, adaptive
// visibility, mobile), goal-aware homepage order, CTA, trust, conversion
// score, theme emphasis. Consumes the Runtime Context only — never rebuilds
// the WebsiteAggregate, never duplicates existing runtime logic.

import type { RuntimeContext } from "@/modules/runtime-context";
import { SECTION_INTELLIGENCE_REGISTRY } from "../domain/section-registry";
import { ctaForProfile } from "../domain/cta";
import { themeEmphasisFor } from "../domain/theme-intelligence";
import { computeTrustProfile } from "../domain/trust-runtime";
import { computeConversionScore, trustInputFrom } from "./conversion-score";
import { contentFromSnapshot, resolveAdaptiveVisibility, resolveHomepageOrder } from "./composition";
import type { ExperienceIntelligence, SectionBase } from "../domain/types";

export interface ExperienceIntelligenceOptions {
  /** When false, adaptive visibility is disabled (existing storefronts unchanged). */
  adaptiveVisibility?: boolean;
}

export function computeExperienceIntelligence(
  ctx: RuntimeContext,
  options: ExperienceIntelligenceOptions = {},
): ExperienceIntelligence {
  const content = contentFromSnapshot(ctx.snapshot);
  const goalProfilePresent = !!ctx.goals.profile;
  const hiddenBases = resolveAdaptiveVisibility(
    content,
    options.adaptiveVisibility === false ? false : goalProfilePresent,
  );
  const hidden = new Set(hiddenBases);

  const presentBases = SECTION_INTELLIGENCE_REGISTRY.map((s) => s.base).filter((b) => !hidden.has(b));

  const sectionPlan = Object.fromEntries(
    SECTION_INTELLIGENCE_REGISTRY.map((section) => [
      section.base,
      {
        base: section.base,
        label: section.label,
        priority: section.priority,
        visible: !hidden.has(section.base),
        collapseRule: section.collapseRule,
        mobilePriority: section.mobilePriority,
        collapseOnMobile: section.collapseOnMobile,
        conversionWeight: section.conversionWeight,
        trustWeight: section.trustWeight,
        commerceWeight: section.commerceWeight,
        seoWeight: section.seoWeight,
      },
    ]),
  ) as ExperienceIntelligence["sectionPlan"];

  const trust = computeTrustProfile(trustInputFrom(ctx));
  const conversionScore = computeConversionScore(ctx, trust.score);

  return {
    sectionPlan,
    homepageOrder: resolveHomepageOrder(ctx.goals.profile, presentBases),
    hiddenBases,
    cta: ctaForProfile(ctx.goals.activeProfile),
    trust,
    conversionScore,
    themeEmphasis: themeEmphasisFor(ctx.goals.activeProfile),
    mobile: SECTION_INTELLIGENCE_REGISTRY.map((s) => ({
      base: s.base,
      mobilePriority: s.mobilePriority,
      collapseOnMobile: s.collapseOnMobile,
    })),
  };
}

/** Extract the base id of a moduleId (e.g. "products.grid" → "products"). */
export function baseOf(moduleId: string): string {
  return (moduleId ?? "").split(".")[0];
}

export type { SectionBase };
