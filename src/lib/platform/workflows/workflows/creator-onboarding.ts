import type { WorkflowHandler, WorkflowInstance, WorkflowExecutionResult } from "../types";

const CREATOR_ONBOARDING_WORKFLOW_ID = "creator-onboarding";

const definition = {
  id: CREATOR_ONBOARDING_WORKFLOW_ID,
  name: "Creator Onboarding",
  description:
    "Onboards a new creator: signup, workspace creation, profile import, generation, provisioning, builder initialization, and publishing",
  states: [
    { id: "signup", name: "Signup", metadata: { isInitial: true } },
    { id: "workspace", name: "Workspace", metadata: { isRetryable: true } },
    { id: "import-profile", name: "Import Profile", metadata: { isRetryable: true } },
    { id: "generate", name: "Generate", metadata: { isRetryable: true } },
    { id: "provision", name: "Provision", metadata: { isRetryable: true } },
    { id: "builder-init", name: "Builder Init", metadata: { isRetryable: true } },
    { id: "publish", name: "Publish", metadata: { isRetryable: true } },
    { id: "completed", name: "Completed", metadata: { isCompleted: true } },
    { id: "failed", name: "Failed", metadata: { isFailure: true } },
  ],
  transitions: [
    { from: "signup", to: "workspace", trigger: "next" },
    { from: "signup", to: "failed", trigger: "fail" },
    { from: "workspace", to: "import-profile", trigger: "next" },
    { from: "workspace", to: "failed", trigger: "fail" },
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
  initialState: "signup",
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
  execute(_instance: WorkflowInstance): WorkflowExecutionResult {
    return { success: true };
  },
};
