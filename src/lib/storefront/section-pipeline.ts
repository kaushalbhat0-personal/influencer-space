/**
 * Storefront Section Pipeline — RCCF-AUDIT-10 (Section Order Parity).
 *
 * The single render-time filter chain for a page's sections. It NEVER reorders:
 * the order of the sections it receives is the order it returns, so the live
 * storefront DOM always matches the persisted Builder/snapshot order.
 *
 * What it does:
 *   - drops sections explicitly marked not visible (`visible === false`)
 *   - drops goal-adaptive conditional sections whose content is empty
 *     (a FILTER — filtering preserves relative order, it never moves sections)
 *   - drops sections the Section Presentation runtime decides should not render
 *     (`visibilityMode === "hidden"` or empty `auto` sections)
 *
 * Goals influence WHAT is hidden (adaptive visibility), never the ORDER of the
 * remaining sections. Render-time goal section reordering is intentionally NOT
 * applied here — that would break the parity contract:
 *
 *   Builder section order == Published snapshot order == Live storefront order
 */
import { contentFromAggregate, resolveAdaptiveVisibility, baseOf } from "@/modules/experience-intelligence";
import { shouldRenderSection } from "@/modules/section-presentation";
import type { GoalProfile } from "@/modules/goals-runtime";
import type { WebsiteAggregate } from "@/types/snapshot";

export interface RenderableSection {
  moduleId: string;
  visible?: boolean;
  config: Record<string, unknown>;
}

export interface SectionPipelineOptions {
  /** The tenant's goal profile — used for adaptive visibility only (never ordering). */
  goalProfile: GoalProfile | null;
  /** Live aggregate content used to decide which empty conditional sections hide. */
  aggregate: WebsiteAggregate;
}

/**
 * RCCF-AUDIT-10: resolve the sections that will actually render, preserving the
 * persisted order exactly. Ordering preservation is guaranteed by construction —
 * the function only filters and never sorts.
 */
export function resolveRenderableSections<T extends RenderableSection>(
  sections: T[],
  options: SectionPipelineOptions,
): T[] {
  const hiddenBases = new Set(
    resolveAdaptiveVisibility(contentFromAggregate(options.aggregate), !!options.goalProfile),
  );
  return sections
    .filter((s) => s.visible !== false)
    .filter((s) => !hiddenBases.has(baseOf(s.moduleId) as never))
    .filter((s) => shouldRenderSection(s.config as Record<string, unknown>));
}
