// ── Generation Progress — Friendly Stages ───────────────────
// RCCF-LAUNCH-TRACK-03. Creator-friendly stage copy (no technical jargon).

import { GENERATION_STAGES } from "@/lib/generation/experience/stages";

/** Friendly, creator-first messages keyed by stage id. */
export const JOURNEY_FRIENDLY: Record<string, string> = {
  import_profile: "Fetching your profile",
  knowledge_intelligence: "Learning about your brand",
  persona_detection: "Understanding your voice",
  planning_context: "Planning your storefront",
  experience_planning: "Planning your content",
  composition: "Building your website",
  artifact_generation: "Creating your storefront",
  provisioning: "Creating your workspace",
  publishing: "Publishing your website",
  golden_validation: "Checking everything",
};

/** Canonical stage order + titles (single source for the progress UI). */
export { GENERATION_STAGES };
