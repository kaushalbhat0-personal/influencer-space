/** Context passed to every trigger matcher. */
export interface TriggerContext {
  tenantId?: string;
  entityId?: string;
  data: Record<string, unknown>;
}

/** A trigger matches events and returns whether the workflow should execute. */
export interface WorkflowTrigger {
  readonly id: string;
  readonly description: string;
  /** Return true if this trigger matches the event context. */
  match(context: TriggerContext): boolean;
}
