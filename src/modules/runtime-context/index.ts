// ── Unified Runtime Context (RCCF-INTEGRATION-01) ───────────
// One request-scoped context carrying every runtime's output, assembled from a
// single WebsiteAggregate build. Every platform surface consumes this context
// instead of rebuilding data. No new runtimes, no duplicated logic.

export type { RuntimeContext } from "./domain/types";
export {
  runtimeContextBuilder,
  RuntimeContextBuilder,
} from "./application/builder";
export {
  makePreviewSnapshot,
  computeOnboardingPreview,
  type OnboardingPreview,
  type OnboardingPreviewInput,
} from "./application/onboarding-preview";
