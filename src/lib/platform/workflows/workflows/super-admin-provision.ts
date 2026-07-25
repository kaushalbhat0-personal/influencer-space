import type { WorkflowHandler, WorkflowInstance, WorkflowExecutionResult } from "../types";

const SUPER_ADMIN_PROVISION_WORKFLOW_ID = "super-admin-provision";

const definition = {
  id: SUPER_ADMIN_PROVISION_WORKFLOW_ID,
  name: "Super Admin Provision",
  description:
    "Super admin provisions a new tenant: tenant creation, resource provisioning, and workspace initialization",
  states: [
    { id: "create-tenant", name: "Create Tenant", metadata: { isInitial: true } },
    { id: "provision-resources", name: "Provision Resources", metadata: { isRetryable: true } },
    { id: "initialize-workspace", name: "Initialize Workspace", metadata: { isRetryable: true } },
    { id: "completed", name: "Completed", metadata: { isCompleted: true } },
    { id: "failed", name: "Failed", metadata: { isFailure: true } },
  ],
  transitions: [
    { from: "create-tenant", to: "provision-resources", trigger: "next" },
    { from: "create-tenant", to: "failed", trigger: "fail" },
    { from: "provision-resources", to: "initialize-workspace", trigger: "next" },
    { from: "provision-resources", to: "failed", trigger: "fail" },
    { from: "initialize-workspace", to: "completed", trigger: "next" },
    { from: "initialize-workspace", to: "failed", trigger: "fail" },
  ],
  initialState: "create-tenant",
  retryConfig: {
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

export const superAdminProvisionWorkflow: WorkflowHandler = {
  id: SUPER_ADMIN_PROVISION_WORKFLOW_ID,
  name: "Super Admin Provision",
  description: definition.description,
  definition,
  execute(_instance: WorkflowInstance): WorkflowExecutionResult {
    return { success: true };
  },
};
