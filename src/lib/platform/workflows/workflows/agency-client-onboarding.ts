import type { WorkflowHandler, WorkflowInstance, WorkflowExecutionResult } from "../types";

const AGENCY_CLIENT_ONBOARDING_WORKFLOW_ID = "agency-client-onboarding";

const definition = {
  id: AGENCY_CLIENT_ONBOARDING_WORKFLOW_ID,
  name: "Agency Client Onboarding",
  description:
    "Agency onboarding for a new client: client creation, plan assignment, site generation, and ownership transfer",
  states: [
    { id: "create-client", name: "Create Client", metadata: { isInitial: true } },
    { id: "assign-plan", name: "Assign Plan", metadata: { isRetryable: true } },
    { id: "generate", name: "Generate", metadata: { isRetryable: true } },
    { id: "transfer-ownership", name: "Transfer Ownership", metadata: { isRetryable: true } },
    { id: "completed", name: "Completed", metadata: { isCompleted: true } },
    { id: "failed", name: "Failed", metadata: { isFailure: true } },
  ],
  transitions: [
    { from: "create-client", to: "assign-plan", trigger: "next" },
    { from: "create-client", to: "failed", trigger: "fail" },
    { from: "assign-plan", to: "generate", trigger: "next" },
    { from: "assign-plan", to: "failed", trigger: "fail" },
    { from: "generate", to: "transfer-ownership", trigger: "next" },
    { from: "generate", to: "failed", trigger: "fail" },
    { from: "transfer-ownership", to: "completed", trigger: "next" },
    { from: "transfer-ownership", to: "failed", trigger: "fail" },
  ],
  initialState: "create-client",
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export const agencyClientOnboardingWorkflow: WorkflowHandler = {
  id: AGENCY_CLIENT_ONBOARDING_WORKFLOW_ID,
  name: "Agency Client Onboarding",
  description: definition.description,
  definition,
  execute(_instance: WorkflowInstance): WorkflowExecutionResult {
    return { success: true };
  },
};
