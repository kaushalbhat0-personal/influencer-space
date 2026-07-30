import type { WorkflowHandler, WorkflowInstance, WorkflowExecutionResult } from "./types";

const MANUAL_REGENERATION_WORKFLOW_ID = "manual-regeneration";

const definition = {
  id: MANUAL_REGENERATION_WORKFLOW_ID,
  name: "Manual Regeneration",
  description:
    "Manually regenerates a creator site: request, generation, artifact creation, validation, and publishing",
  states: [
    { id: "request", name: "Request", metadata: { isInitial: true } },
    { id: "generate", name: "Generate", metadata: { isRetryable: true } },
    { id: "artifacts", name: "Artifacts", metadata: { isRetryable: true } },
    { id: "validate", name: "Validate", metadata: { isRetryable: true } },
    { id: "publish", name: "Publish", metadata: { isRetryable: true } },
    { id: "completed", name: "Completed", metadata: { isCompleted: true } },
    { id: "failed", name: "Failed", metadata: { isFailure: true } },
  ],
  transitions: [
    { from: "request", to: "generate", trigger: "next" },
    { from: "request", to: "failed", trigger: "fail" },
    { from: "generate", to: "artifacts", trigger: "next" },
    { from: "generate", to: "failed", trigger: "fail" },
    { from: "artifacts", to: "validate", trigger: "next" },
    { from: "artifacts", to: "failed", trigger: "fail" },
    { from: "validate", to: "publish", trigger: "next" },
    { from: "validate", to: "failed", trigger: "fail" },
    { from: "publish", to: "completed", trigger: "next" },
    { from: "publish", to: "failed", trigger: "fail" },
  ],
  initialState: "request",
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export const manualRegenerationWorkflow: WorkflowHandler = {
  id: MANUAL_REGENERATION_WORKFLOW_ID,
  name: "Manual Regeneration",
  description: definition.description,
  definition,
  execute(_instance: WorkflowInstance): WorkflowExecutionResult {
    return { success: true };
  },
};
