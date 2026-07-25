import type { WorkflowHandler, WorkflowInstance, WorkflowExecutionResult } from "../types";
import { onboardingService } from "@/lib/onboarding/service";

const CREATOR_ONBOARDING_WORKFLOW_ID = "creator-onboarding";

const definition = {
  id: CREATOR_ONBOARDING_WORKFLOW_ID,
  name: "Creator Onboarding",
  description:
    "Onboards a new creator: profile import, AI generation, workspace provisioning, builder initialization, and publishing",
  states: [
    { id: "import-profile", name: "Import Profile", metadata: { isInitial: true, isRetryable: true } },
    { id: "generate", name: "Generate", metadata: { isRetryable: true } },
    { id: "provision", name: "Provision", metadata: { isRetryable: true } },
    { id: "builder-init", name: "Builder Init", metadata: { isRetryable: true } },
    { id: "publish", name: "Publish", metadata: { isRetryable: true } },
    { id: "completed", name: "Completed", metadata: { isCompleted: true } },
    { id: "failed", name: "Failed", metadata: { isFailure: true } },
  ],
  transitions: [
    { from: "import-profile", to: "generate", trigger: "next" },
    { from: "import-profile", to: "failed", trigger: "fail" },
    { from: "generate", to: "provision", trigger: "next" },
    { from: "generate", to: "failed", trigger: "fail" },
    { from: "provision", to: "builder-init", trigger: "next" },
    { from: "provision", to: "failed", trigger: "fail" },
    { from: "builder-init", to: "publish", trigger: "next" },
    { from: "builder-init", to: "failed", trigger: "fail" },
    { from: "publish", to: "completed", trigger: "next" },
    { from: "publish", to: "failed", trigger: "fail" },
  ],
  initialState: "import-profile",
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export const creatorOnboardingWorkflow: WorkflowHandler = {
  id: CREATOR_ONBOARDING_WORKFLOW_ID,
  name: "Creator Onboarding",
  description: definition.description,
  definition,
  async execute(instance: WorkflowInstance): Promise<WorkflowExecutionResult> {
    const ctx = instance.context;

    switch (instance.currentState) {
      case "import-profile": {
        const sourceUrl = ctx.sourceUrl as string;
        const creatorId = ctx.creatorId as string;
        const creatorName = (ctx.creatorName as string) || "Creator";

        if (!sourceUrl) {
          return { success: false, error: "No source URL provided" };
        }

        try {
          const result = await onboardingService.importProfile(sourceUrl, creatorId, creatorName);
          return {
            success: true,
            contextUpdates: {
              platform: result.platform,
              knowledgeGraph: result.knowledgeGraph,
              personaMatch: result.personaMatch,
              experienceProfile: result.experienceProfile,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Profile import failed",
          };
        }
      }

      case "generate": {
        const knowledgeGraph = ctx.knowledgeGraph as Record<string, unknown>;
        const experienceProfile = ctx.experienceProfile as Record<string, unknown>;

        if (!knowledgeGraph || !experienceProfile) {
          return { success: false, error: "Missing knowledge graph or experience profile" };
        }

        try {
          const result = await onboardingService.generate(
            knowledgeGraph as never,
            experienceProfile as never,
          );
          return {
            success: true,
            contextUpdates: {
              experiencePlan: result.experiencePlan,
              websiteBlueprint: result.websiteBlueprint,
              artifacts: result.artifacts,
              sourceUrl: ctx.sourceUrl,
            },
          };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Generation failed",
          };
        }
      }

      case "provision": {
        return {
          success: true,
          contextUpdates: {},
        };
      }

      case "builder-init": {
        return {
          success: true,
          contextUpdates: {},
        };
      }

      case "publish": {
        return {
          success: true,
          contextUpdates: {},
        };
      }

      default:
        return { success: true };
    }
  },
};
