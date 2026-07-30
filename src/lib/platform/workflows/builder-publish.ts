import type { WorkflowHandler, WorkflowInstance, WorkflowExecutionResult } from "./types";

const BUILDER_PUBLISH_WORKFLOW_ID = "builder-publish";

const definition = {
  id: BUILDER_PUBLISH_WORKFLOW_ID,
  name: "Builder Publish",
  description:
    "Publishes from the Builder UI: draft, validation, snapshot, and publishing",
  states: [
    { id: "draft", name: "Draft", metadata: { isInitial: true } },
    { id: "validate", name: "Validate", metadata: { isRetryable: true } },
    { id: "snapshot", name: "Snapshot", metadata: { isRetryable: true } },
    { id: "publish", name: "Publish", metadata: { isRetryable: true } },
    { id: "completed", name: "Completed", metadata: { isCompleted: true } },
    { id: "failed", name: "Failed", metadata: { isFailure: true } },
  ],
  transitions: [
    { from: "draft", to: "validate", trigger: "next" },
    { from: "draft", to: "failed", trigger: "fail" },
    { from: "validate", to: "snapshot", trigger: "next" },
    { from: "validate", to: "failed", trigger: "fail" },
    { from: "snapshot", to: "publish", trigger: "next" },
    { from: "snapshot", to: "failed", trigger: "fail" },
    { from: "publish", to: "completed", trigger: "next" },
    { from: "publish", to: "failed", trigger: "fail" },
  ],
  initialState: "draft",
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export const builderPublishWorkflow: WorkflowHandler = {
  id: BUILDER_PUBLISH_WORKFLOW_ID,
  name: "Builder Publish",
  description: definition.description,
  definition,
  execute(_instance: WorkflowInstance): WorkflowExecutionResult {
    return { success: true };
  },
};
