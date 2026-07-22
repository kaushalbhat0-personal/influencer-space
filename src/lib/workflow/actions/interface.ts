/** Result of executing an action. */
export interface ActionResult {
  success: boolean;
  message?: string;
  durationMs?: number;
  data?: Record<string, unknown>;
}

/** Context passed to action execution. */
export interface ActionContext {
  tenantId?: string;
  entityId?: string;
  trigger: string;
  data: Record<string, unknown>;
  /** Action-specific configuration from the workflow definition. */
  config: Record<string, unknown>;
}

/** A registered action that the Workflow Engine can execute. */
export interface WorkflowAction {
  readonly id: string;
  readonly description: string;
  execute(context: ActionContext): Promise<ActionResult>;
}
