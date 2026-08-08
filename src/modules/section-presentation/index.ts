// ── Section Presentation — Public API ───────────────────────
export {
  resolveSectionPresentation,
  applySectionPresets,
  sectionHasContent,
  baseOf,
  shouldRenderSection,
  isPermanentSection,
  sectionPresentationResolver,
  SectionPresentationResolver,
} from "./application/runtime";
export type { ResolvedPresentation, VisibilityMode } from "./application/runtime";
export { SECTION_PRESETS, presetFor, presetsFor, packIdFor } from "./application/presets";
export {
  OPTIONAL_SECTIONS,
  ALWAYS_VISIBLE_SECTIONS,
  PERMANENT_SECTIONS,
} from "./domain/types";
export type { SectionPresentation, PresentationCategory } from "./domain/types";
