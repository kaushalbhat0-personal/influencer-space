/**
 * Prompt resolution — IMPLEMENTATION-32.
 *
 * Reuses the EXISTING versioned prompt registry + orchestrator. A single
 * singleton is created here (none existed) and populated with the registered
 * definitions including creator-intelligence-enrichment.
 */
import { VersionedPromptRegistry, PromptOrchestrator, registerPromptDefinitions } from "@/lib/generation/prompts";
import type { RenderedPrompt } from "@/lib/generation/prompts/types";

let orchestratorInstance: PromptOrchestrator | null | undefined;

export function getPromptOrchestrator(): PromptOrchestrator {
  if (orchestratorInstance) return orchestratorInstance;
  const registry = new VersionedPromptRegistry();
  registerPromptDefinitions(registry);
  orchestratorInstance = new PromptOrchestrator(registry);
  return orchestratorInstance;
}

export function renderEnrichmentPrompt(context: {
  platform: string;
  displayName: string;
  username: string;
  bio: string;
  verified: boolean;
  followers: number;
  website: string | null;
  keywords: string[];
  hashtags: string[];
  languages: string[];
  categories: string[];
  niche: string;
  persona: string;
  confidence: number;
  missingFields: string[];
  capabilities: string[];
}): RenderedPrompt {
  return getPromptOrchestrator().get("creator-intelligence-enrichment", {
    stage: "creator-intelligence-enrichment",
    niche: "default",
    strategyType: "free",
    variables: {
      platform: context.platform,
      displayName: context.displayName,
      username: context.username,
      bio: context.bio,
      verified: String(context.verified),
      followers: context.followers,
      website: context.website ?? "",
      keywords: context.keywords,
      hashtags: context.hashtags,
      languages: context.languages,
      categories: context.categories,
      niche: context.niche,
      persona: context.persona,
      confidence: context.confidence,
      missingFields: context.missingFields,
      capabilities: context.capabilities,
    },
  });
}
