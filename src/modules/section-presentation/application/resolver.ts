// ── Section Presentation — Canonical Resolver ──────────────
// RCCF-LAUNCH-TRACK-04B (Phase 1). The SINGLE presentation resolution point.
//
// Every renderer, the LayoutEngine and the storefront page consume presentation
// through this resolver (or through config already resolved by it). No renderer
// reads `config.presentation` directly, and presentation NEVER renames canonical
// section ids or changes business logic.

import type { SectionPresentation } from "../domain/types";
import { OPTIONAL_SECTIONS, PERMANENT_SECTIONS } from "../domain/types";
import { baseOf } from "./base";

export type VisibilityMode = "always" | "auto" | "hidden";

export interface ResolvedPresentation {
  /** Displayed title: titleOverride → defaultTitle → null (renderer fallback). */
  title: string | null;
  /** Displayed description: descriptionOverride → null. */
  description: string | null;
  hideTitle: boolean;
  visible: boolean;
  hideWhenEmpty: boolean;
  visibilityMode: VisibilityMode;
}

/** Sections that always render — hideWhenEmpty is ignored for them. */
export const PERMANENT_SECTION_BASES = PERMANENT_SECTIONS;

/** Optional sections — hide when empty by default (Phase 5). */
export const OPTIONAL_SECTION_BASES = OPTIONAL_SECTIONS;

/**
 * SectionPresentationResolver — canonical, deterministic presentation
 * resolution. `resolve()` returns the full decision; individual methods exist
 * so callers can resolve a single aspect without recomputing everything.
 */
export class SectionPresentationResolver {
  /** Displayed title: override → default → null. */
  resolveTitle(presentation: SectionPresentation | undefined, defaultTitle: string | null): string | null {
    return presentation?.titleOverride ?? defaultTitle;
  }

  /** Displayed description: override → null. */
  resolveDescription(presentation: SectionPresentation | undefined): string | null {
    return presentation?.descriptionOverride ?? null;
  }

  /** Whether the section heading is hidden (Phase 9/10 — no empty headings). */
  resolveHideTitle(presentation: SectionPresentation | undefined): boolean {
    return presentation?.hideTitle ?? false;
  }

  /** Master visibility switch (default visible). */
  resolveVisible(presentation: SectionPresentation | undefined): boolean {
    return presentation?.visible ?? true;
  }

  /**
   * Hide-when-empty default: optional sections default true; permanent sections
   * ignore it (Phase 6).
   */
  resolveHideWhenEmpty(presentation: SectionPresentation | undefined, moduleId: string): boolean {
    const base = baseOf(moduleId);
    if (PERMANENT_SECTIONS.includes(base)) return false;
    const isOptional = OPTIONAL_SECTIONS.includes(base);
    return presentation?.hideWhenEmpty ?? isOptional;
  }

  /** always / auto (hide when empty) / hidden (explicitly turned off). */
  resolveVisibilityMode(presentation: SectionPresentation | undefined, moduleId: string): VisibilityMode {
    if (!this.resolveVisible(presentation)) return "hidden";
    if (this.resolveHideWhenEmpty(presentation, moduleId)) return "auto";
    return "always";
  }

  /** Full resolution — one call for the LayoutEngine and renderers. */
  resolve(
    presentation: SectionPresentation | undefined,
    defaultTitle: string | null,
    moduleId: string,
  ): ResolvedPresentation {
    const hideWhenEmpty = this.resolveHideWhenEmpty(presentation, moduleId);
    return {
      title: this.resolveTitle(presentation, defaultTitle),
      description: this.resolveDescription(presentation),
      hideTitle: this.resolveHideTitle(presentation),
      visible: this.resolveVisible(presentation),
      hideWhenEmpty,
      visibilityMode: this.resolveVisibilityMode(presentation, moduleId),
    };
  }
}

export const sectionPresentationResolver = new SectionPresentationResolver();
